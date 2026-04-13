/**
 * @file Convert FigDesignDocument back to flat nodeChanges for serialization
 *
 * Reverse of tree-to-document.ts. Walks the high-level document model and
 * produces the flat nodeChanges array + blobs needed by saveFigFile().
 *
 * For roundtrip documents (_loaded present), we apply modifications to the
 * original nodeChanges rather than rebuilding from scratch. This preserves
 * fields and ordering that the high-level model doesn't explicitly track.
 */

import type { FigNode, FigGuid, FigParentIndex, KiwiEnumValue } from "@aurochs/fig/types";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";
import type { FigBlob } from "@aurochs/fig/parser";
import type { FigDesignDocument, FigDesignNode, FigPage } from "@aurochs/fig/domain";
import { parseId } from "@aurochs/fig/domain";
import type { FigNodeId, FigPageId } from "@aurochs/fig/domain";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of converting a document to serializable data.
 */
export type DocumentToTreeResult = {
  readonly nodeChanges: FigNode[];
  readonly blobs: readonly FigBlob[];
};

// =============================================================================
// ID Conversion
// =============================================================================

function nodeIdToGuid(id: FigNodeId | FigPageId): FigGuid {
  const parsed = parseId(id);
  return { sessionID: parsed.sessionID, localID: parsed.localID };
}

function createParentIndex(parentId: FigNodeId | FigPageId, position: string): FigParentIndex {
  return { guid: nodeIdToGuid(parentId), position };
}

// =============================================================================
// Position String
// =============================================================================

/**
 * Generate a Figma-compatible position string for child ordering.
 *
 * Figma uses lexicographic strings (like fractional indexing) to order
 * children. We use a simple scheme based on the child's index position.
 */
function positionString(index: number): string {
  // Figma uses a compact encoding; for simplicity, we use padded hex.
  // Real .fig files use a more complex fractional indexing scheme,
  // but for roundtrip we preserve original positions via _raw.
  return String.fromCharCode(0x20 + index);
}

// =============================================================================
// Design Node to FigNode
// =============================================================================

/**
 * Convert a FigDesignNode to a flat FigNode (without children).
 */
function designNodeToFigNode(
  node: FigDesignNode,
  parentId: FigNodeId | FigPageId,
  childIndex: number,
): FigNode {
  const guid = nodeIdToGuid(node.id);

  // Start with _raw fields if present (roundtrip preservation)
  const base: Record<string, unknown> = node._raw ? { ...node._raw } : {};

  // Overlay typed fields
  base.guid = guid;
  base.parentIndex = createParentIndex(parentId, positionString(childIndex));
  base.type = { value: 0, name: node.type } as KiwiEnumValue;
  base.phase = { value: 1, name: "CREATED" } as KiwiEnumValue;
  base.name = node.name;
  base.visible = node.visible;
  base.opacity = node.opacity;
  base.transform = node.transform;
  base.size = node.size;
  base.fillPaints = node.fills;
  base.strokePaints = node.strokes;
  base.strokeWeight = node.strokeWeight;

  if (node.strokeAlign !== undefined) { base.strokeAlign = node.strokeAlign; }
  if (node.strokeJoin !== undefined) { base.strokeJoin = node.strokeJoin; }
  if (node.strokeCap !== undefined) { base.strokeCap = node.strokeCap; }
  if (node.cornerRadius !== undefined) { base.cornerRadius = node.cornerRadius; }
  if (node.rectangleCornerRadii !== undefined) { base.rectangleCornerRadii = node.rectangleCornerRadii; }
  if (node.effects.length > 0) { base.effects = node.effects; }
  if (node.clipsContent !== undefined) { base.clipsContent = node.clipsContent; }

  // AutoLayout
  if (node.autoLayout) {
    base.stackMode = node.autoLayout.stackMode;
    if (node.autoLayout.stackSpacing !== undefined) { base.stackSpacing = node.autoLayout.stackSpacing; }
    if (node.autoLayout.stackPadding !== undefined) { base.stackPadding = node.autoLayout.stackPadding; }
    if (node.autoLayout.stackPrimaryAlignItems !== undefined) { base.stackPrimaryAlignItems = node.autoLayout.stackPrimaryAlignItems; }
    if (node.autoLayout.stackCounterAlignItems !== undefined) { base.stackCounterAlignItems = node.autoLayout.stackCounterAlignItems; }
    if (node.autoLayout.stackPrimaryAlignContent !== undefined) { base.stackPrimaryAlignContent = node.autoLayout.stackPrimaryAlignContent; }
    if (node.autoLayout.stackWrap !== undefined) { base.stackWrap = node.autoLayout.stackWrap; }
    if (node.autoLayout.stackCounterSpacing !== undefined) { base.stackCounterSpacing = node.autoLayout.stackCounterSpacing; }
    if (node.autoLayout.itemReverseZIndex !== undefined) { base.itemReverseZIndex = node.autoLayout.itemReverseZIndex; }
  }

  // Layout constraints
  if (node.layoutConstraints) {
    if (node.layoutConstraints.stackPositioning !== undefined) { base.stackPositioning = node.layoutConstraints.stackPositioning; }
    if (node.layoutConstraints.stackPrimarySizing !== undefined) { base.stackPrimarySizing = node.layoutConstraints.stackPrimarySizing; }
    if (node.layoutConstraints.stackCounterSizing !== undefined) { base.stackCounterSizing = node.layoutConstraints.stackCounterSizing; }
    if (node.layoutConstraints.horizontalConstraint !== undefined) { base.horizontalConstraint = node.layoutConstraints.horizontalConstraint; }
    if (node.layoutConstraints.verticalConstraint !== undefined) { base.verticalConstraint = node.layoutConstraints.verticalConstraint; }
  }

  // Text
  if (node.textData) {
    base.characters = node.textData.characters;
    base.fontSize = node.textData.fontSize;
    base.fontName = node.textData.fontName;
    if (node.textData.textAlignHorizontal !== undefined) { base.textAlignHorizontal = node.textData.textAlignHorizontal; }
    if (node.textData.textAlignVertical !== undefined) { base.textAlignVertical = node.textData.textAlignVertical; }
    if (node.textData.textAutoResize !== undefined) { base.textAutoResize = node.textData.textAutoResize; }
    if (node.textData.textDecoration !== undefined) { base.textDecoration = node.textData.textDecoration; }
    if (node.textData.textCase !== undefined) { base.textCase = node.textData.textCase; }
    if (node.textData.lineHeight !== undefined) { base.lineHeight = node.textData.lineHeight; }
    if (node.textData.letterSpacing !== undefined) { base.letterSpacing = node.textData.letterSpacing; }

    // Write characterStyleIDs and styleOverrideTable into the Kiwi textData message.
    // These are nested inside textData (not flat NodeChange fields).
    const textDataMsg: Record<string, unknown> = {
      characters: node.textData.characters,
      characterStyleIDs: node.textData.characterStyleIDs ?? new Array(node.textData.characters.length).fill(0),
    };
    if (node.textData.styleOverrideTable && node.textData.styleOverrideTable.length > 0) {
      textDataMsg.styleOverrideTable = node.textData.styleOverrideTable.map((entry) => {
        const nc: Record<string, unknown> = { styleID: entry.styleID };
        if (entry.fontSize !== undefined) {nc.fontSize = entry.fontSize;}
        if (entry.fontName !== undefined) {nc.fontName = entry.fontName;}
        if (entry.fillPaints !== undefined) {nc.fillPaints = entry.fillPaints;}
        if (entry.textDecoration !== undefined) {nc.textDecoration = entry.textDecoration;}
        if (entry.textCase !== undefined) {nc.textCase = entry.textCase;}
        if (entry.lineHeight !== undefined) {nc.lineHeight = entry.lineHeight;}
        if (entry.letterSpacing !== undefined) {nc.letterSpacing = entry.letterSpacing;}
        return nc;
      });
    }
    base.textData = textDataMsg;
  }

  // Component/instance
  if (node.symbolId !== undefined) { base.symbolID = node.symbolId; }
  if (node.overrides !== undefined) { base.symbolOverrides = node.overrides; }

  // Boolean operation
  if (node.booleanOperation !== undefined) { base.booleanOperation = node.booleanOperation; }

  // Star/polygon
  if (node.pointCount !== undefined) { base.pointCount = node.pointCount; }
  if (node.starInnerRadius !== undefined) { base.starInnerRadius = node.starInnerRadius; }

  return base as FigNode;
}

// =============================================================================
// Flatten Tree
// =============================================================================

type FlattenPageOptions = {
  readonly page: FigPage;
  readonly documentId: FigNodeId;
  readonly pageIndex: number;
  readonly result: FigNode[];
};

/**
 * Flatten a page's node tree into a nodeChanges array.
 */
function flattenPage(
  { page, documentId, pageIndex, result }: FlattenPageOptions,
): void {
  // Create CANVAS node
  const canvasGuid = nodeIdToGuid(page.id);
  const canvasBase: Record<string, unknown> = page._raw ? { ...page._raw } : {};
  canvasBase.guid = canvasGuid;
  canvasBase.parentIndex = createParentIndex(documentId, positionString(pageIndex));
  canvasBase.type = { value: 0, name: "CANVAS" } as KiwiEnumValue;
  canvasBase.phase = { value: 1, name: "CREATED" } as KiwiEnumValue;
  canvasBase.name = page.name;
  canvasBase.visible = true;
  canvasBase.backgroundColor = page.backgroundColor;
  result.push(canvasBase as FigNode);

  // Flatten children
  flattenNodes(page.children, page.id, result);
}

/**
 * Recursively flatten design nodes into the nodeChanges array.
 */
function flattenNodes(
  nodes: readonly FigDesignNode[],
  parentId: FigNodeId | FigPageId,
  result: FigNode[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    result.push(designNodeToFigNode(node, parentId, i));

    if (node.children && node.children.length > 0) {
      flattenNodes(node.children, node.id, result);
    }
  }
}

// =============================================================================
// Roundtrip Strategy
// =============================================================================

/**
 * Apply document modifications to the original loaded nodeChanges.
 *
 * This strategy preserves the original node ordering and fields
 * that were not modified through the high-level API.
 */
function applyModificationsToLoaded(
  doc: FigDesignDocument,
  loaded: LoadedFigFile,
): DocumentToTreeResult {
  // Build a map of current document nodes by GUID string
  const currentNodes = new Map<string, FigDesignNode>();
  const currentPages = new Map<string, FigPage>();

  for (const page of doc.pages) {
    currentPages.set(page.id, page);
    collectAllNodes(page.children, currentNodes);
  }

  // Update existing nodes in-place
  const updatedNodeChanges: FigNode[] = [];

  for (const originalNode of loaded.nodeChanges) {
    const guid = originalNode.guid;
    if (!guid) {
      updatedNodeChanges.push(originalNode);
      continue;
    }

    const guidStr = `${guid.sessionID}:${guid.localID}`;
    const currentNode = currentNodes.get(guidStr);

    if (currentNode) {
      // Node still exists: merge changes
      const merged = mergeNodeChanges(originalNode, currentNode);
      updatedNodeChanges.push(merged);
    } else {
      // Check if it's a CANVAS node (page)
      const currentPage = currentPages.get(guidStr);
      if (currentPage) {
        // Page still exists: merge canvas changes
        const merged = mergeCanvasChanges(originalNode, currentPage);
        updatedNodeChanges.push(merged);
      }
      // If neither: node was deleted, skip it
    }
  }

  // Add new nodes (those not in original)
  const originalGuids = new Set(
    loaded.nodeChanges
      .filter((n) => n.guid)
      .map((n) => `${n.guid.sessionID}:${n.guid.localID}`),
  );

  for (const page of doc.pages) {
    if (!originalGuids.has(page.id)) {
      // New page: need to add its canvas + children
      // Find document GUID from first root
      const docGuid = loaded.nodeChanges.find((n) => n.type?.name === "DOCUMENT")?.guid;
      if (docGuid) {
        const docId = `${docGuid.sessionID}:${docGuid.localID}` as FigNodeId;
        flattenPage({ page, documentId: docId, pageIndex: doc.pages.indexOf(page), result: updatedNodeChanges });
      }
    }
    addNewNodes({ nodes: page.children, parentId: page.id, originalGuids, result: updatedNodeChanges });
  }

  return {
    nodeChanges: updatedNodeChanges,
    blobs: loaded.blobs,
  };
}

/**
 * Collect all nodes in a tree into a flat map.
 */
function collectAllNodes(
  nodes: readonly FigDesignNode[],
  map: Map<string, FigDesignNode>,
): void {
  for (const node of nodes) {
    map.set(node.id, node);
    if (node.children) {
      collectAllNodes(node.children, map);
    }
  }
}

/**
 * Merge modifications from a FigDesignNode into an original FigNode.
 */
function mergeNodeChanges(original: FigNode, current: FigDesignNode): FigNode {
  const merged: Record<string, unknown> = { ...original };

  merged.name = current.name;
  merged.visible = current.visible;
  merged.opacity = current.opacity;
  merged.transform = current.transform;
  merged.size = current.size;
  merged.fillPaints = current.fills;
  merged.strokePaints = current.strokes;
  merged.strokeWeight = current.strokeWeight;

  if (current.effects.length > 0) {
    merged.effects = current.effects;
  }

  return merged as FigNode;
}

/**
 * Merge modifications from a FigPage into an original CANVAS FigNode.
 */
function mergeCanvasChanges(original: FigNode, currentPage: FigPage): FigNode {
  const merged: Record<string, unknown> = { ...original };
  merged.name = currentPage.name;
  merged.backgroundColor = currentPage.backgroundColor;
  return merged as FigNode;
}

type AddNewNodesOptions = {
  readonly nodes: readonly FigDesignNode[];
  readonly parentId: FigNodeId | FigPageId;
  readonly originalGuids: ReadonlySet<string>;
  readonly result: FigNode[];
};

/**
 * Add new nodes (not present in original) to the nodeChanges array.
 */
function addNewNodes(
  { nodes, parentId, originalGuids, result }: AddNewNodesOptions,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!originalGuids.has(node.id)) {
      result.push(designNodeToFigNode(node, parentId, i));
    }
    if (node.children) {
      addNewNodes({ nodes: node.children, parentId: node.id, originalGuids, result });
    }
  }
}

// =============================================================================
// Fresh Build Strategy
// =============================================================================

/**
 * Build nodeChanges from scratch for a document without _loaded data.
 */
function buildFreshNodeChanges(doc: FigDesignDocument): DocumentToTreeResult {
  const result: FigNode[] = [];

  // Create DOCUMENT node
  const documentId = "0:0" as FigNodeId;
  const documentNode: Record<string, unknown> = {
    guid: { sessionID: 0, localID: 0 },
    type: { value: 0, name: "DOCUMENT" },
    phase: { value: 1, name: "CREATED" },
    name: "Document",
    visible: true,
  };
  result.push(documentNode as FigNode);

  // Add pages
  for (let i = 0; i < doc.pages.length; i++) {
    flattenPage({ page: doc.pages[i], documentId, pageIndex: i, result });
  }

  return {
    nodeChanges: result,
    blobs: [],
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert a FigDesignDocument to flat nodeChanges for serialization.
 *
 * For roundtrip documents (those loaded from existing .fig files),
 * applies modifications to the original data to preserve compatibility.
 * For fresh documents, builds nodeChanges from scratch.
 */
export function documentToTree(doc: FigDesignDocument): DocumentToTreeResult {
  if (doc._loaded) {
    return applyModificationsToLoaded(doc, doc._loaded);
  }
  return buildFreshNodeChanges(doc);
}
