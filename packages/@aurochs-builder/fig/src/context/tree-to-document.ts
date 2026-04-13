/**
 * @file Convert FigNode tree to FigDesignDocument
 *
 * Bridges the low-level parser output (flat nodeChanges → tree via buildNodeTree)
 * to the high-level FigDesignDocument model used by the builder and editor.
 *
 * The conversion:
 * 1. Walks the DOCUMENT → CANVAS → node tree structure
 * 2. Converts each FigNode to a FigDesignNode with branded IDs
 * 3. Extracts typed properties, preserving unknown fields in _raw
 * 4. Collects COMPONENT/SYMBOL nodes into the components map
 */

import type { FigNode, FigNodeType, FigMatrix, FigVector, FigColor, FigPaint, FigEffect, KiwiEnumValue, FigKiwiTextData, FigTextStyleOverrideEntry } from "@aurochs/fig/types";
import type { NodeTreeResult } from "@aurochs/fig/parser";
import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import { getEffectiveSymbolID } from "@aurochs/fig/symbols";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";
import type {
  FigDesignDocument, FigDesignNode, FigPage, AutoLayoutProps, LayoutConstraints, TextData, TextStyleOverride, SymbolOverride,
  BlendMode, DerivedTextData,
  ComponentPropertyDef, ComponentPropertyRef, ComponentPropertyAssignment, ComponentPropertyType, ComponentPropertyNodeField, ComponentPropertyValue,
} from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND } from "@aurochs/fig/domain";
import { guidToNodeId, guidToPageId } from "@aurochs/fig/domain";
import type { FigNodeId } from "@aurochs/fig/domain";

// =============================================================================
// Constants
// =============================================================================

/**
 * Extract the effective symbol ID from a node's raw data and convert
 * it to a FigNodeId string suitable for looking up in the components map.
 *
 * Delegates to getEffectiveSymbolID (the SoT for INSTANCE → SYMBOL resolution)
 * which handles both `symbolData.symbolID` (real Figma exports) and top-level
 * `symbolID` (builder-generated files), plus `overriddenSymbolID` for variants.
 *
 * Returns undefined for non-INSTANCE nodes.
 */
function resolveSymbolIdForDomain(raw: Record<string, unknown>): FigNodeId | undefined {
  const guid = getEffectiveSymbolID(raw);
  if (!guid) {return undefined;}
  return guidToNodeId(guid);
}

/** Identity matrix (no transform) */
const IDENTITY_MATRIX: FigMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

/** Default size */
const DEFAULT_SIZE: FigVector = { x: 0, y: 0 };

/** Default color (black) */
const _DEFAULT_COLOR: FigColor = { r: 0, g: 0, b: 0, a: 1 };

/** Node types that are components */
const COMPONENT_TYPES: ReadonlySet<string> = new Set(["COMPONENT", "COMPONENT_SET", "SYMBOL"]);

/**
 * Fields that are explicitly modeled in FigDesignNode and should be
 * excluded from the _raw preservation bag.
 */
const MODELED_FIELDS: ReadonlySet<string> = new Set([
  "guid", "parentIndex", "children", "type", "phase",
  "name", "visible", "opacity",
  "transform", "size",
  "fillPaints", "strokePaints", "strokeWeight", "strokeAlign", "strokeJoin", "strokeCap",
  "cornerRadius", "rectangleCornerRadii", "cornerSmoothing",
  "blendMode",
  "effects",
  "derivedTextData",
  "clipsContent",
  "stackMode", "stackSpacing", "stackPadding",
  "stackPrimaryAlignItems", "stackCounterAlignItems", "stackPrimaryAlignContent",
  "stackWrap", "stackCounterSpacing", "itemReverseZIndex",
  "stackPositioning", "stackPrimarySizing", "stackCounterSizing",
  "horizontalConstraint", "verticalConstraint",
  "characters", "fontSize", "fontName",
  "textAlignHorizontal", "textAlignVertical", "textAutoResize",
  "textDecoration", "textCase", "lineHeight", "letterSpacing",
  "symbolID", "symbolOverrides",
  "componentPropDefs", "componentPropRefs", "componentPropAssignments",
  "booleanOperation",
  "pointCount", "starInnerRadius",
  "fillGeometry", "strokeGeometry", "vectorPaths",
]);

// =============================================================================
// Blend Mode Extraction
// =============================================================================

/** Resolve a blend mode value to its string name, handling both string and KiwiEnumValue forms. */
function resolveBlendModeName(bm: unknown): string | undefined {
  if (typeof bm === "string") {
    return bm;
  }
  if (typeof bm === "object" && bm !== null && "name" in bm) {
    return (bm as { name: string }).name;
  }
  return undefined;
}

/**
 * Extract blend mode from raw node data, normalizing KiwiEnumValue to BlendMode string.
 * Returns undefined for PASS_THROUGH/NORMAL (default blend modes don't need storage).
 */
function extractBlendMode(raw: Record<string, unknown>): BlendMode | undefined {
  const bm = raw.blendMode;
  if (!bm) {return undefined;}

  const name = resolveBlendModeName(bm);
  if (!name || name === "PASS_THROUGH" || name === "NORMAL") {
    return undefined;
  }

  return name as BlendMode;
}

// =============================================================================
// Node Conversion
// =============================================================================

/**
 * Extract the effective node type name from a FigNode.
 */
function nodeTypeName(node: FigNode): FigNodeType {
  return getNodeType(node) as FigNodeType;
}

/**
 * Extract AutoLayout properties from a FigNode, if present.
 */
function extractAutoLayout(raw: Record<string, unknown>): AutoLayoutProps | undefined {
  const stackMode = raw.stackMode as KiwiEnumValue | undefined;
  if (!stackMode || stackMode.name === "NONE") {
    return undefined;
  }
  return {
    stackMode,
    stackSpacing: raw.stackSpacing as number | undefined,
    stackPadding: raw.stackPadding as AutoLayoutProps["stackPadding"] | undefined,
    stackPrimaryAlignItems: raw.stackPrimaryAlignItems as KiwiEnumValue | undefined,
    stackCounterAlignItems: raw.stackCounterAlignItems as KiwiEnumValue | undefined,
    stackPrimaryAlignContent: raw.stackPrimaryAlignContent as KiwiEnumValue | undefined,
    stackWrap: raw.stackWrap as boolean | undefined,
    stackCounterSpacing: raw.stackCounterSpacing as number | undefined,
    itemReverseZIndex: raw.itemReverseZIndex as boolean | undefined,
  };
}

/**
 * Extract layout constraint properties from a FigNode, if present.
 */
function extractLayoutConstraints(raw: Record<string, unknown>): LayoutConstraints | undefined {
  const has =
    raw.stackPositioning !== undefined ||
    raw.stackPrimarySizing !== undefined ||
    raw.stackCounterSizing !== undefined ||
    raw.horizontalConstraint !== undefined ||
    raw.verticalConstraint !== undefined;

  if (!has) {
    return undefined;
  }

  return {
    stackPositioning: raw.stackPositioning as KiwiEnumValue | undefined,
    stackPrimarySizing: raw.stackPrimarySizing as KiwiEnumValue | undefined,
    stackCounterSizing: raw.stackCounterSizing as KiwiEnumValue | undefined,
    horizontalConstraint: raw.horizontalConstraint as KiwiEnumValue | undefined,
    verticalConstraint: raw.verticalConstraint as KiwiEnumValue | undefined,
  };
}

/**
 * Extract text-specific data from a TEXT node.
 *
 * Characters may exist as:
 * - `raw.characters` (real .fig files from Figma have it as a direct node field)
 * - `raw.textData.characters` (builder-generated files store it in the TextData message)
 */
function extractTextData(raw: Record<string, unknown>): TextData | undefined {
  // Resolve characters from direct field or nested textData.
  // In real .fig files, characters is a direct NodeChange field.
  // In builder-generated files, it's inside the textData Kiwi message.
  const kiwiTextData = raw.textData as FigKiwiTextData | undefined;
  const characters = typeof raw.characters === "string" ? raw.characters : kiwiTextData?.characters;
  if (typeof characters !== "string") {
    return undefined;
  }

  // Extract characterStyleIDs and styleOverrideTable from the typed Kiwi TextData.
  const characterStyleIDs = kiwiTextData?.characterStyleIDs;
  const rawOverrideTable = kiwiTextData?.styleOverrideTable;
  const styleOverrideTable = rawOverrideTable ? convertKiwiOverrideTable(rawOverrideTable) : undefined;

  return {
    characters,
    fontSize: (raw.fontSize as number) ?? 12,
    fontName: (raw.fontName as TextData["fontName"]) ?? { family: "Inter", style: "Regular", postscript: "Inter-Regular" },
    textAlignHorizontal: raw.textAlignHorizontal as KiwiEnumValue | undefined,
    textAlignVertical: raw.textAlignVertical as KiwiEnumValue | undefined,
    textAutoResize: raw.textAutoResize as KiwiEnumValue | undefined,
    textDecoration: raw.textDecoration as KiwiEnumValue | undefined,
    textCase: raw.textCase as KiwiEnumValue | undefined,
    lineHeight: raw.lineHeight as TextData["lineHeight"] | undefined,
    letterSpacing: raw.letterSpacing as TextData["letterSpacing"] | undefined,
    characterStyleIDs: characterStyleIDs && characterStyleIDs.length > 0 ? characterStyleIDs : undefined,
    styleOverrideTable: styleOverrideTable && styleOverrideTable.length > 0 ? styleOverrideTable : undefined,
  };
}

/**
 * Convert Kiwi-level FigTextStyleOverrideEntry to domain TextStyleOverride.
 *
 * The Kiwi entries are sparse NodeChange objects. We extract the style-related
 * subset into the typed domain representation.
 */
function convertKiwiOverrideTable(
  entries: readonly FigTextStyleOverrideEntry[],
): TextStyleOverride[] {
  return entries
    .filter((entry) => entry.styleID !== 0)
    .map((entry): TextStyleOverride => ({
      styleID: entry.styleID,
      fontSize: entry.fontSize,
      fontName: entry.fontName,
      fillPaints: entry.fillPaints,
      textDecoration: entry.textDecoration,
      textCase: entry.textCase,
      lineHeight: entry.lineHeight,
      letterSpacing: entry.letterSpacing,
    }));
}

// =============================================================================
// Component Property Extraction
// =============================================================================

/** Map ComponentPropType enum to domain string */
const PROP_TYPE_MAP: Record<number, ComponentPropertyType> = {
  0: "BOOL",
  1: "TEXT",
  2: "COLOR",
  3: "INSTANCE_SWAP",
  4: "VARIANT",
  5: "NUMBER",
  6: "IMAGE",
  7: "SLOT",
};

/** Map ComponentPropNodeField enum to domain string */
const NODE_FIELD_MAP: Record<number, ComponentPropertyNodeField> = {
  0: "VISIBLE",
  1: "TEXT_DATA",
  2: "OVERRIDDEN_SYMBOL_ID",
  3: "INHERIT_FILL_STYLE_ID",
  4: "SLOT_CONTENT_ID",
};

function resolveEnumName<T extends string>(v: unknown, map: Record<number, T>): T | undefined {
  if (v == null) {return undefined;}
  if (typeof v === "string") {return v as T;}
  if (typeof v === "object" && "value" in v) {
    const num = (v as { value: number }).value;
    return map[num];
  }
  if (typeof v === "number") {return map[v];}
  return undefined;
}

/**
 * Extract component property definitions from a SYMBOL/COMPONENT node.
 */
function extractComponentPropertyDefs(raw: Record<string, unknown>): readonly ComponentPropertyDef[] | undefined {
  const defs = raw.componentPropDefs as readonly Record<string, unknown>[] | undefined;
  if (!defs || defs.length === 0) {return undefined;}

  const result: ComponentPropertyDef[] = [];
  for (const def of defs) {
    const id = def.id;
    if (!id || typeof id !== "object" || !("sessionID" in id)) {continue;}
    const guid = id as { sessionID: number; localID: number };
    const name = def.name as string | undefined;
    if (!name) {continue;}

    const propType = resolveEnumName(def.type, PROP_TYPE_MAP);
    if (!propType) {continue;}

    result.push({
      id: guidToNodeId(guid),
      name,
      type: propType,
      initialValue: convertPropertyValue(def.initialValue as Record<string, unknown> | undefined),
      sortPosition: def.sortPosition as string | undefined,
    });
  }
  return result.length > 0 ? result : undefined;
}

/**
 * Convert a raw Kiwi component property value to the domain type.
 *
 * Handles the conversion of raw GUIDs (guidValue) to FigNodeId (referenceValue),
 * and strips unknown fields so the domain type doesn't carry opaque Kiwi data.
 */
function convertPropertyValue(raw: Record<string, unknown> | undefined): ComponentPropertyValue | undefined {
  if (!raw) {return undefined;}

  const result: {
    boolValue?: boolean;
    textValue?: { characters: string };
    referenceValue?: FigNodeId;
    numberValue?: number;
  } = {};

  if (typeof raw.boolValue === "boolean") {
    result.boolValue = raw.boolValue;
  }

  const textVal = raw.textValue as { characters?: string } | undefined;
  if (textVal?.characters !== undefined) {
    result.textValue = { characters: textVal.characters };
  }

  const guidVal = raw.guidValue as { sessionID: number; localID: number } | undefined;
  if (guidVal && typeof guidVal === "object" && "sessionID" in guidVal) {
    result.referenceValue = guidToNodeId(guidVal);
  }

  if (typeof raw.numberValue === "number") {
    result.numberValue = raw.numberValue;
  }

  // Return undefined if no known fields were populated
  if (result.boolValue === undefined && result.textValue === undefined &&
      result.referenceValue === undefined && result.numberValue === undefined) {
    return undefined;
  }

  return result;
}

/**
 * Extract component property references from any child node.
 */
function extractComponentPropertyRefs(raw: Record<string, unknown>): readonly ComponentPropertyRef[] | undefined {
  const refs = raw.componentPropRefs as readonly Record<string, unknown>[] | undefined;
  if (!refs || refs.length === 0) {return undefined;}

  const result: ComponentPropertyRef[] = [];
  for (const ref of refs) {
    const defID = ref.defID;
    if (!defID || typeof defID !== "object" || !("sessionID" in defID)) {continue;}
    const guid = defID as { sessionID: number; localID: number };

    const nodeField = resolveEnumName(ref.componentPropNodeField, NODE_FIELD_MAP);
    if (!nodeField) {continue;}

    result.push({
      defId: guidToNodeId(guid),
      nodeField,
    });
  }
  return result.length > 0 ? result : undefined;
}

/**
 * Extract component property assignments from an INSTANCE node.
 */
function extractComponentPropertyAssignments(raw: Record<string, unknown>): readonly ComponentPropertyAssignment[] | undefined {
  const assigns = raw.componentPropAssignments as readonly Record<string, unknown>[] | undefined;
  if (!assigns || assigns.length === 0) {return undefined;}

  const result: ComponentPropertyAssignment[] = [];
  for (const assign of assigns) {
    const defID = assign.defID;
    if (!defID || typeof defID !== "object" || !("sessionID" in defID)) {continue;}
    const guid = defID as { sessionID: number; localID: number };

    const value = convertPropertyValue(assign.value as Record<string, unknown> | undefined);
    if (!value) {continue;} // Skip assignments with no recognizable value

    result.push({
      defId: guidToNodeId(guid),
      value,
    });
  }
  return result.length > 0 ? result : undefined;
}

// =============================================================================

/**
 * Collect raw fields not modeled in FigDesignNode for roundtrip preservation.
 */
function collectRawFields(node: FigNode): Record<string, unknown> | undefined {
  const raw: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (!MODELED_FIELDS.has(key) && value !== undefined) {
      raw[key] = value;
    }
  }

  return Object.keys(raw).length > 0 ? raw : undefined;
}

/**
 * Convert a raw FigNode to a FigDesignNode, recursively converting children.
 *
 * @param node - Raw Kiwi node from parser
 * @param components - Mutable map to collect component definitions
 */
export function convertFigNode(
  node: FigNode,
  components: Map<string, FigDesignNode>,
): FigDesignNode {
  const raw = node as Record<string, unknown>;
  const nodeType = nodeTypeName(node);
  const id = guidToNodeId(node.guid);

  const children = safeChildren(node);
  const convertedChildren = children.length > 0 ? children.map((child) => convertFigNode(child, components)) : undefined;

  const designNode: FigDesignNode = {
    id,
    type: nodeType,
    name: node.name ?? "",
    visible: node.visible ?? true,
    opacity: node.opacity ?? 1,
    transform: node.transform ?? IDENTITY_MATRIX,
    size: node.size ?? DEFAULT_SIZE,

    fills: (node.fillPaints ?? []) as readonly FigPaint[],
    strokes: (node.strokePaints ?? []) as readonly FigPaint[],
    strokeWeight: node.strokeWeight ?? 0,
    strokeAlign: node.strokeAlign,
    strokeJoin: node.strokeJoin,
    strokeCap: node.strokeCap,

    cornerRadius: node.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii,
    cornerSmoothing: raw.cornerSmoothing as number | undefined,

    blendMode: extractBlendMode(raw),

    effects: (node.effects ?? []) as readonly FigEffect[],

    children: convertedChildren,

    clipsContent: node.clipsContent,
    autoLayout: extractAutoLayout(raw),
    layoutConstraints: extractLayoutConstraints(raw),

    textData: nodeType === "TEXT" ? extractTextData(raw) : undefined,
    derivedTextData: raw.derivedTextData as DerivedTextData | undefined,

    symbolId: resolveSymbolIdForDomain(raw),
    overrides: raw.symbolOverrides as readonly SymbolOverride[] | undefined,

    componentPropertyDefs: extractComponentPropertyDefs(raw),
    componentPropertyRefs: extractComponentPropertyRefs(raw),
    componentPropertyAssignments: extractComponentPropertyAssignments(raw),

    booleanOperation: raw.booleanOperation as KiwiEnumValue | undefined,

    pointCount: node.pointCount,
    starInnerRadius: node.starInnerRadius,

    _raw: collectRawFields(node),
  };

  // Collect components
  if (COMPONENT_TYPES.has(nodeType)) {
    components.set(id, designNode);
  }

  return designNode;
}

// =============================================================================
// Page Conversion
// =============================================================================

/**
 * Convert a CANVAS FigNode to a FigPage.
 */
function convertCanvasToPage(
  canvas: FigNode,
  components: Map<string, FigDesignNode>,
): FigPage {
  const raw = canvas as Record<string, unknown>;
  const id = guidToPageId(canvas.guid);

  const children = safeChildren(canvas);
  const convertedChildren = children.map((child) => convertFigNode(child, components));

  // Collect component definitions from all children
  collectComponentsRecursive(convertedChildren, components);

  return {
    id,
    name: canvas.name ?? "Page",
    backgroundColor: (raw.backgroundColor as FigColor) ?? DEFAULT_PAGE_BACKGROUND,
    children: convertedChildren,
    _raw: collectRawFields(canvas),
  };
}

/**
 * Walk the converted tree and collect any nested component definitions.
 */
function collectComponentsRecursive(
  nodes: readonly FigDesignNode[],
  components: Map<string, FigDesignNode>,
): void {
  for (const node of nodes) {
    if (COMPONENT_TYPES.has(node.type)) {
      components.set(node.id, node);
    }
    if (node.children) {
      collectComponentsRecursive(node.children, components);
    }
  }
}

// =============================================================================
// Document Conversion
// =============================================================================

/**
 * Convert a parsed node tree and loaded file data to a FigDesignDocument.
 *
 * @param tree - Node tree from buildNodeTree() (contains roots with DOCUMENT → CANVAS hierarchy)
 * @param loaded - Loaded file data (for images, metadata, and roundtrip preservation)
 * @returns High-level design document
 */
export function treeToDocument(
  tree: NodeTreeResult,
  loaded: LoadedFigFile,
): FigDesignDocument {
  const components = new Map<string, FigDesignNode>();
  const pages: FigPage[] = [];

  // Walk roots to find DOCUMENT → CANVAS structure
  for (const root of tree.roots) {
    const rootType = getNodeType(root);

    if (rootType === "DOCUMENT") {
      // DOCUMENT node: iterate CANVAS children
      for (const canvas of safeChildren(root)) {
        if (getNodeType(canvas) === "CANVAS") {
          pages.push(convertCanvasToPage(canvas, components));
        }
      }
    } else if (rootType === "CANVAS") {
      // Standalone CANVAS (unusual but handle gracefully)
      pages.push(convertCanvasToPage(root, components));
    }
  }

  return {
    pages,
    components,
    images: loaded.images,
    metadata: loaded.metadata,
    _loaded: loaded,
  };
}
