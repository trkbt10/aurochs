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

import type { FigNode, FigNodeType, FigMatrix, FigVector, FigColor, FigPaint, FigEffect, KiwiEnumValue, FigKiwiTextData, FigTextStyleOverrideEntry, FigComponentPropValue } from "@aurochs/fig/types";
import type { NodeTreeResult } from "@aurochs/fig/parser";
import { getNodeType, safeChildren, guidToString } from "@aurochs/fig/parser";
import { getEffectiveSymbolID, buildFigStyleRegistry } from "@aurochs/fig/symbols";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";
import type {
  FigDesignDocument, FigDesignNode, FigPage, AutoLayoutProps, LayoutConstraints, TextData, TextStyleOverride, SymbolOverride,
  BlendMode, DerivedTextData,
  ComponentPropertyDef, ComponentPropertyRef, ComponentPropertyAssignment, ComponentPropertyType, ComponentPropertyNodeField, ComponentPropertyValue,
  FigStyleRegistry,
} from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
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
function resolveSymbolIdForDomain(node: FigNode): FigNodeId | undefined {
  const guid = getEffectiveSymbolID(node);
  if (!guid) {return undefined;}
  return guidToNodeId(guid);
}

/** Node types that clip content by default in Figma. */
const CLIPPING_NODE_TYPES: ReadonlySet<string> = new Set(["FRAME", "COMPONENT", "COMPONENT_SET"]);

/**
 * Resolve clipsContent for domain model.
 *
 * Normalizes the Kiwi-level `frameMaskDisabled` (inverted semantics)
 * into a simple boolean, with correct defaults per node type.
 * After this, the domain model's `clipsContent` is authoritative and
 * no consumer needs to read `frameMaskDisabled` from `_raw`.
 */
function resolveClipsContentForDomain(node: FigNode, nodeType: string): boolean | undefined {
  if (node.clipsContent !== undefined) { return node.clipsContent; }
  if (node.frameMaskDisabled !== undefined) { return !node.frameMaskDisabled; }
  if (CLIPPING_NODE_TYPES.has(nodeType)) { return true; }
  return undefined;
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
 * Extract per-side stroke weights from Kiwi node data.
 * Returns undefined when all sides are equal or no per-side data exists.
 */
function extractIndividualStrokeWeights(node: FigNode): FigDesignNode["individualStrokeWeights"] {
  if (!node.borderStrokeWeightsIndependent && node.borderTopWeight === undefined) {
    return undefined;
  }
  const top = node.borderTopWeight ?? 0;
  const right = node.borderRightWeight ?? 0;
  const bottom = node.borderBottomWeight ?? 0;
  const left = node.borderLeftWeight ?? 0;

  // If all sides are equal, don't store individual weights
  // (the uniform strokeWeight already covers this case)
  if (top === right && right === bottom && bottom === left) {
    return undefined;
  }

  return { top, right, bottom, left };
}

/**
 * Fields that are explicitly modeled in FigDesignNode and should be
 * excluded from the _raw preservation bag.
 */
const MODELED_FIELDS: ReadonlySet<string> = new Set([
  "guid", "parentIndex", "children", "type", "phase",
  "name", "visible", "opacity",
  "transform", "size",
  "fillPaints", "strokePaints", "strokeWeight", "strokeAlign", "strokeJoin", "strokeCap", "strokeDashes",
  "borderTopWeight", "borderRightWeight", "borderBottomWeight", "borderLeftWeight", "borderStrokeWeightsIndependent",
  "styleIdForFill", "styleIdForStrokeFill",
  "cornerRadius", "rectangleCornerRadii", "cornerSmoothing",
  "blendMode",
  "effects",
  "derivedTextData",
  "clipsContent", "frameMaskDisabled",
  "stackMode", "stackSpacing", "stackPadding",
  "stackPrimaryAlignItems", "stackCounterAlignItems", "stackPrimaryAlignContent",
  "stackWrap", "stackCounterSpacing", "itemReverseZIndex",
  "stackPositioning", "stackPrimarySizing", "stackCounterSizing",
  "stackChildAlignSelf", "stackChildPrimaryGrow",
  "horizontalConstraint", "verticalConstraint",
  "characters", "fontSize", "fontName",
  "textAlignHorizontal", "textAlignVertical", "textAutoResize",
  "textDecoration", "textCase", "lineHeight", "letterSpacing",
  "textTruncation", "leadingTrim", "fontVariations", "hyperlink",
  "symbolID", "symbolOverrides", "derivedSymbolData",
  "componentPropDefs", "componentPropRefs", "componentPropAssignments",
  "mask",
  "arcData",
  "vectorPaths", "vectorData",
  "booleanOperation",
  "pointCount", "starInnerRadius", "starInnerScale",
  "fillGeometry", "strokeGeometry",
]);

// =============================================================================
// Blend Mode Extraction
// =============================================================================

/** Resolve a blend mode value to its string name, handling both string and KiwiEnumValue forms. */
function resolveBlendModeName(bm: string | KiwiEnumValue): string {
  if (typeof bm === "string") {
    return bm;
  }
  return bm.name;
}

/**
 * Extract blend mode from raw node data, normalizing KiwiEnumValue to BlendMode string.
 * Returns undefined for PASS_THROUGH/NORMAL (default blend modes don't need storage).
 */
function extractBlendMode(node: FigNode): BlendMode | undefined {
  const bm = node.blendMode;
  if (!bm) {return undefined;}

  const name = resolveBlendModeName(bm);
  if (name === "PASS_THROUGH" || name === "NORMAL") {
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
function extractAutoLayout(node: FigNode): AutoLayoutProps | undefined {
  const stackMode = node.stackMode;
  if (!stackMode || stackMode.name === "NONE") {
    return undefined;
  }
  return {
    stackMode,
    stackSpacing: node.stackSpacing,
    stackPadding: node.stackPadding as AutoLayoutProps["stackPadding"] | undefined,
    stackPrimaryAlignItems: node.stackPrimaryAlignItems,
    stackCounterAlignItems: node.stackCounterAlignItems,
    stackPrimaryAlignContent: node.stackPrimaryAlignContent,
    stackWrap: node.stackWrap,
    stackCounterSpacing: node.stackCounterSpacing,
    itemReverseZIndex: node.itemReverseZIndex,
  };
}

/**
 * Extract layout constraint properties from a FigNode, if present.
 */
function extractLayoutConstraints(node: FigNode): LayoutConstraints | undefined {
  const has =
    node.stackPositioning !== undefined ||
    node.stackPrimarySizing !== undefined ||
    node.stackCounterSizing !== undefined ||
    node.horizontalConstraint !== undefined ||
    node.verticalConstraint !== undefined ||
    node.stackChildAlignSelf !== undefined ||
    node.stackChildPrimaryGrow !== undefined;

  if (!has) {
    return undefined;
  }

  return {
    stackPositioning: node.stackPositioning,
    stackPrimarySizing: node.stackPrimarySizing,
    stackCounterSizing: node.stackCounterSizing,
    horizontalConstraint: node.horizontalConstraint,
    verticalConstraint: node.verticalConstraint,
    stackChildAlignSelf: node.stackChildAlignSelf,
    stackChildPrimaryGrow: node.stackChildPrimaryGrow,
  };
}

/**
 * Extract text-specific data from a TEXT node.
 *
 * Characters may exist as:
 * - `raw.characters` (real .fig files from Figma have it as a direct node field)
 * - `raw.textData.characters` (builder-generated files store it in the TextData message)
 */
function extractTextData(node: FigNode): TextData | undefined {
  // Resolve characters from direct field or nested textData.
  // In real .fig files, characters is a direct NodeChange field.
  // In builder-generated files, it's inside the textData Kiwi message.
  const kiwiTextData = node.textData;
  const characters = typeof node.characters === "string" ? node.characters : kiwiTextData?.characters;
  if (typeof characters !== "string") {
    return undefined;
  }

  // Extract characterStyleIDs and styleOverrideTable from the typed Kiwi TextData.
  const characterStyleIDs = kiwiTextData?.characterStyleIDs;
  const rawOverrideTable = kiwiTextData?.styleOverrideTable;
  const styleOverrideTable = rawOverrideTable ? convertKiwiOverrideTable(rawOverrideTable) : undefined;

  return {
    characters,
    fontSize: node.fontSize ?? 12,
    fontName: node.fontName ?? { family: "Inter", style: "Regular", postscript: "Inter-Regular" },
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textAutoResize: node.textAutoResize,
    textDecoration: node.textDecoration,
    textCase: node.textCase,
    lineHeight: node.lineHeight,
    letterSpacing: node.letterSpacing,
    characterStyleIDs: characterStyleIDs && characterStyleIDs.length > 0 ? characterStyleIDs : undefined,
    styleOverrideTable: styleOverrideTable && styleOverrideTable.length > 0 ? styleOverrideTable : undefined,
    textTruncation: node.textTruncation,
    leadingTrim: node.leadingTrim,
    fontVariations: node.fontVariations,
    hyperlink: node.hyperlink,
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
function extractComponentPropertyDefs(node: FigNode): readonly ComponentPropertyDef[] | undefined {
  const defs = node.componentPropDefs;
  if (!defs || defs.length === 0) {return undefined;}

  const result: ComponentPropertyDef[] = [];
  for (const def of defs) {
    const id = def.id;
    if (!id || typeof id !== "object" || !("sessionID" in id)) {continue;}
    const name = def.name;
    if (!name) {continue;}

    const propType = resolveEnumName(def.type, PROP_TYPE_MAP);
    if (!propType) {continue;}

    result.push({
      id: guidToNodeId(id),
      name,
      type: propType,
      initialValue: convertPropertyValue(def.initialValue),
      sortPosition: def.sortPosition,
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
function convertPropertyValue(raw: FigComponentPropValue | undefined): ComponentPropertyValue | undefined {
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

  if (raw.textValue?.characters !== undefined) {
    result.textValue = { characters: raw.textValue.characters };
  }

  if (raw.guidValue && typeof raw.guidValue === "object" && "sessionID" in raw.guidValue) {
    result.referenceValue = guidToNodeId(raw.guidValue);
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
function extractComponentPropertyRefs(node: FigNode): readonly ComponentPropertyRef[] | undefined {
  const refs = node.componentPropRefs;
  if (!refs || refs.length === 0) {return undefined;}

  const result: ComponentPropertyRef[] = [];
  for (const ref of refs) {
    const defID = ref.defID;
    if (!defID || typeof defID !== "object" || !("sessionID" in defID)) {continue;}

    const nodeField = resolveEnumName(ref.componentPropNodeField, NODE_FIELD_MAP);
    if (!nodeField) {continue;}

    result.push({
      defId: guidToNodeId(defID),
      nodeField,
    });
  }
  return result.length > 0 ? result : undefined;
}

/**
 * Extract component property assignments from an INSTANCE node.
 */
function extractComponentPropertyAssignments(node: FigNode): readonly ComponentPropertyAssignment[] | undefined {
  const assigns = node.componentPropAssignments;
  if (!assigns || assigns.length === 0) {return undefined;}

  const result: ComponentPropertyAssignment[] = [];
  for (const assign of assigns) {
    const defID = assign.defID;
    if (!defID || typeof defID !== "object" || !("sessionID" in defID)) {continue;}

    const value = convertPropertyValue(assign.value as FigComponentPropValue | undefined);
    if (!value) {continue;}

    result.push({
      defId: guidToNodeId(defID),
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
  styleRegistry: FigStyleRegistry = EMPTY_FIG_STYLE_REGISTRY,
): FigDesignNode {
  const nodeType = nodeTypeName(node);
  const id = guidToNodeId(node.guid);

  const children = safeChildren(node);
  const convertedChildren = children.length > 0 ? children.map((child) => convertFigNode(child, components, styleRegistry)) : undefined;

  // Resolve fills/strokes: when styleIdForFill/styleIdForStrokeFill is present,
  // the node's cached fillPaints/strokePaints may be stale. Use the style
  // registry to get the authoritative paints from the style definition node.
  let fills = (node.fillPaints ?? []) as readonly FigPaint[];
  let strokes = (node.strokePaints ?? []) as readonly FigPaint[];

  if (node.styleIdForFill) {
    const resolved = styleRegistry.fills.get(guidToString(node.styleIdForFill.guid));
    if (resolved) {
      fills = resolved;
    }
  }
  if (node.styleIdForStrokeFill) {
    const resolved = styleRegistry.strokes.get(guidToString(node.styleIdForStrokeFill.guid));
    if (resolved) {
      strokes = resolved;
    }
  }

  const designNode: FigDesignNode = {
    id,
    type: nodeType,
    name: node.name ?? "",
    visible: node.visible ?? true,
    opacity: node.opacity ?? 1,
    transform: node.transform ?? IDENTITY_MATRIX,
    size: node.size ?? DEFAULT_SIZE,

    fills,
    strokes,
    strokeWeight: node.strokeWeight ?? 0,
    strokeAlign: node.strokeAlign,
    strokeJoin: node.strokeJoin,
    strokeCap: node.strokeCap,
    strokeDashes: node.strokeDashes,
    individualStrokeWeights: extractIndividualStrokeWeights(node),

    cornerRadius: node.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii,
    cornerSmoothing: node.cornerSmoothing,

    blendMode: extractBlendMode(node),

    effects: (node.effects ?? []) as readonly FigEffect[],

    children: convertedChildren,

    clipsContent: resolveClipsContentForDomain(node, nodeType),
    autoLayout: extractAutoLayout(node),
    layoutConstraints: extractLayoutConstraints(node),

    textData: nodeType === "TEXT" ? extractTextData(node) : undefined,
    derivedTextData: node.derivedTextData as DerivedTextData | undefined,

    symbolId: resolveSymbolIdForDomain(node),
    overrides: node.symbolOverrides as readonly SymbolOverride[] | undefined,
    derivedSymbolData: node.derivedSymbolData as readonly SymbolOverride[] | undefined,

    componentPropertyDefs: extractComponentPropertyDefs(node),
    componentPropertyRefs: extractComponentPropertyRefs(node),
    componentPropertyAssignments: extractComponentPropertyAssignments(node),

    styleIdForFill: node.styleIdForFill,
    styleIdForStrokeFill: node.styleIdForStrokeFill,

    fillGeometry: node.fillGeometry,
    strokeGeometry: node.strokeGeometry,

    mask: node.mask ?? undefined,
    arcData: node.arcData,
    vectorPaths: node.vectorPaths,
    vectorData: node.vectorData,

    booleanOperation: node.booleanOperation,

    pointCount: node.pointCount,
    starInnerRadius: node.starInnerRadius,
    starInnerScale: node.starInnerScale,

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
  styleRegistry: FigStyleRegistry,
): FigPage {
  const id = guidToPageId(canvas.guid);

  const children = safeChildren(canvas);
  const convertedChildren = children.map((child) => convertFigNode(child, components, styleRegistry));

  // Collect component definitions from all children
  collectComponentsRecursive(convertedChildren, components);

  return {
    id,
    name: canvas.name ?? "Page",
    backgroundColor: canvas.backgroundColor ?? DEFAULT_PAGE_BACKGROUND,
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
/**
 * Collect all FigNodes in a tree into a flat Map keyed by GUID string.
 * Used to build the style registry before domain conversion.
 */
function collectNodeMap(roots: readonly FigNode[]): ReadonlyMap<string, FigNode> {
  const map = new Map<string, FigNode>();
  function walk(node: FigNode): void {
    if (node.guid) {
      map.set(guidToString(node.guid), node);
    }
    for (const child of safeChildren(node)) {
      walk(child);
    }
  }
  for (const root of roots) {
    walk(root);
  }
  return map;
}

export function treeToDocument(
  tree: NodeTreeResult,
  loaded: LoadedFigFile,
): FigDesignDocument {
  const components = new Map<string, FigDesignNode>();
  const pages: FigPage[] = [];

  // Build style registry from the raw FigNode tree BEFORE domain conversion.
  // This resolves styleIdForFill/styleIdForStrokeFill GUIDs to authoritative paints.
  const nodeMap = collectNodeMap(tree.roots);
  const styleRegistry = nodeMap.size > 0 ? buildFigStyleRegistry(nodeMap) : EMPTY_FIG_STYLE_REGISTRY;

  // Walk roots to find DOCUMENT → CANVAS structure
  for (const root of tree.roots) {
    const rootType = getNodeType(root);

    if (rootType === "DOCUMENT") {
      // DOCUMENT node: iterate CANVAS children
      for (const canvas of safeChildren(root)) {
        if (getNodeType(canvas) === "CANVAS") {
          pages.push(convertCanvasToPage(canvas, components, styleRegistry));
        }
      }
    } else if (rootType === "CANVAS") {
      // Standalone CANVAS (unusual but handle gracefully)
      pages.push(convertCanvasToPage(root, components, styleRegistry));
    }
  }

  return {
    pages,
    components,
    images: loaded.images,
    blobs: loaded.blobs,
    metadata: loaded.metadata,
    styleRegistry,
    _loaded: loaded,
  };
}
