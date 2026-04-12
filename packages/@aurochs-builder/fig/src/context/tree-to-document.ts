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

import type { FigNode, FigNodeType, FigMatrix, FigVector, FigColor, FigPaint, FigEffect, FigStrokeWeight, KiwiEnumValue } from "@aurochs/fig/types";
import type { NodeTreeResult } from "@aurochs/fig/parser";
import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { LoadedFigFile, FigImage, FigMetadata } from "@aurochs/fig/roundtrip";
import type { FigDesignDocument, FigDesignNode, FigPage, AutoLayoutProps, LayoutConstraints, TextData, SymbolOverride } from "../types/document";
import { DEFAULT_PAGE_BACKGROUND } from "../types/document";
import { guidToNodeId, guidToPageId } from "../types/node-id";
import type { FigNodeId, FigPageId } from "../types/node-id";

// =============================================================================
// Constants
// =============================================================================

/** Identity matrix (no transform) */
const IDENTITY_MATRIX: FigMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

/** Default size */
const DEFAULT_SIZE: FigVector = { x: 0, y: 0 };

/** Default color (black) */
const DEFAULT_COLOR: FigColor = { r: 0, g: 0, b: 0, a: 1 };

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
  "cornerRadius", "rectangleCornerRadii",
  "effects",
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
  "booleanOperation",
  "pointCount", "starInnerRadius",
  "fillGeometry", "strokeGeometry", "vectorPaths",
]);

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
 */
function extractTextData(raw: Record<string, unknown>): TextData | undefined {
  const characters = raw.characters;
  if (typeof characters !== "string") {
    return undefined;
  }

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
  };
}

/**
 * Collect raw fields not modeled in FigDesignNode for roundtrip preservation.
 */
function collectRawFields(node: FigNode): Record<string, unknown> | undefined {
  const raw: Record<string, unknown> = {};
  let hasFields = false;

  for (const [key, value] of Object.entries(node)) {
    if (!MODELED_FIELDS.has(key) && value !== undefined) {
      raw[key] = value;
      hasFields = true;
    }
  }

  return hasFields ? raw : undefined;
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
  const convertedChildren = children.length > 0
    ? children.map((child) => convertFigNode(child, components))
    : undefined;

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

    effects: (node.effects ?? []) as readonly FigEffect[],

    children: convertedChildren,

    clipsContent: node.clipsContent,
    autoLayout: extractAutoLayout(raw),
    layoutConstraints: extractLayoutConstraints(raw),

    textData: nodeType === "TEXT" ? extractTextData(raw) : undefined,

    symbolId: raw.symbolID as string | undefined,
    overrides: raw.symbolOverrides as readonly SymbolOverride[] | undefined,

    booleanOperation: raw.booleanOperation as KiwiEnumValue | undefined,

    pointCount: raw.pointCount as number | undefined,
    starInnerRadius: raw.starInnerRadius as number | undefined,

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
