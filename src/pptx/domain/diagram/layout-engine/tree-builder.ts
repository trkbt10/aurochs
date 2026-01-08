/**
 * @file Diagram tree builder
 *
 * Builds a hierarchical tree structure from DiagramML data model.
 * The data model contains points (nodes) and connections (edges).
 * This module constructs a tree by resolving parent-child relationships.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 * @see ECMA-376 Part 1, Section 21.4.4 (dgm:dataModel)
 */

import type {
  DiagramDataModel,
  DiagramPoint,
  DiagramConnection,
  DiagramPropertySet,
} from "../types";
import type { TextBody } from "../../text";
import type { ShapeProperties } from "../../shape";

// =============================================================================
// Types
// =============================================================================

/**
 * A node in the diagram tree structure.
 * Built from DiagramPoint data with resolved parent-child relationships.
 */
export type DiagramTreeNode = {
  /** Unique identifier from modelId */
  readonly id: string;
  /** Node type from point type attribute */
  readonly type: DiagramPointType;
  /** Property set containing presentation and style info */
  readonly propertySet?: DiagramPropertySet;
  /** Shape properties for rendering */
  readonly shapeProperties?: ShapeProperties;
  /** Text content for this node */
  readonly textBody?: TextBody;
  /** Child nodes in the hierarchy */
  readonly children: readonly DiagramTreeNode[];
  /** Depth in the tree (0 = root) */
  readonly depth: number;
  /** Index among siblings (0-based) */
  readonly siblingIndex: number;
  /** Total number of siblings including self */
  readonly siblingCount: number;
};

/**
 * Diagram point types
 * @see ECMA-376 Part 1, Section 21.4.7.38 (ST_PtType)
 */
export type DiagramPointType =
  | "node"     // Normal content node
  | "doc"      // Document root
  | "asst"     // Assistant node
  | "parTrans" // Parent transition
  | "sibTrans" // Sibling transition
  | "pres";    // Presentation node

/**
 * Result of tree building operation
 */
export type DiagramTreeBuildResult = {
  /** Root nodes of the tree (usually one doc node) */
  readonly roots: readonly DiagramTreeNode[];
  /** Total number of nodes in the tree */
  readonly nodeCount: number;
  /** Maximum depth of the tree */
  readonly maxDepth: number;
  /** Map from node ID to tree node for quick lookup */
  readonly nodeMap: ReadonlyMap<string, DiagramTreeNode>;
};

// =============================================================================
// Tree Building
// =============================================================================

/**
 * Build a tree structure from diagram data model.
 *
 * The data model uses connections to define relationships:
 * - type="parOf": sourceId is child of destinationId
 * - type="presOf": presentation relationship (ignored for tree)
 * - type="presParOf": presentation parent relationship (ignored for tree)
 *
 * @param dataModel - Diagram data model with points and connections
 * @returns Tree build result with root nodes and metadata
 */
export function buildDiagramTree(dataModel: DiagramDataModel): DiagramTreeBuildResult {
  const { points, connections } = dataModel;

  // Build lookup maps
  const pointMap = new Map<string, DiagramPoint>();
  for (const point of points) {
    pointMap.set(point.modelId, point);
  }

  // Build parent-child relationship map from connections
  // Key: child ID, Value: parent ID
  const parentMap = new Map<string, string>();
  // Key: parent ID, Value: array of child IDs in order
  const childrenMap = new Map<string, string[]>();

  for (const conn of connections) {
    if (conn.type === "parOf" && conn.sourceId && conn.destinationId) {
      // sourceId is child, destinationId is parent
      parentMap.set(conn.sourceId, conn.destinationId);

      // Add to children list
      const children = childrenMap.get(conn.destinationId) ?? [];
      // Insert at correct position based on sourceOrder
      const insertIndex = conn.sourceOrder ?? children.length;
      children.splice(insertIndex, 0, conn.sourceId);
      childrenMap.set(conn.destinationId, children);
    }
  }

  // Find root nodes (nodes without parents)
  const rootIds: string[] = [];
  for (const point of points) {
    if (!parentMap.has(point.modelId)) {
      rootIds.push(point.modelId);
    }
  }

  // Sort roots by type (doc first, then others)
  rootIds.sort((a, b) => {
    const pointA = pointMap.get(a);
    const pointB = pointMap.get(b);
    const typeA = pointA?.type ?? "node";
    const typeB = pointB?.type ?? "node";
    if (typeA === "doc" && typeB !== "doc") {return -1;}
    if (typeA !== "doc" && typeB === "doc") {return 1;}
    return 0;
  });

  // Build tree recursively
  const nodeMap = new Map<string, DiagramTreeNode>();
  let maxDepth = 0;

  function buildNode(
    id: string,
    depth: number,
    siblingIndex: number,
    siblingCount: number
  ): DiagramTreeNode | undefined {
    const point = pointMap.get(id);
    if (!point) {return undefined;}

    // Get children IDs
    const childIds = childrenMap.get(id) ?? [];

    // Build child nodes
    const children: DiagramTreeNode[] = [];
    for (let i = 0; i < childIds.length; i++) {
      const child = buildNode(childIds[i], depth + 1, i, childIds.length);
      if (child) {
        children.push(child);
      }
    }

    // Track max depth
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    const node: DiagramTreeNode = {
      id,
      type: parsePointType(point.type),
      propertySet: point.propertySet,
      shapeProperties: point.shapeProperties,
      textBody: point.textBody,
      children,
      depth,
      siblingIndex,
      siblingCount,
    };

    nodeMap.set(id, node);
    return node;
  }

  // Build root nodes
  const roots: DiagramTreeNode[] = [];
  for (let i = 0; i < rootIds.length; i++) {
    const root = buildNode(rootIds[i], 0, i, rootIds.length);
    if (root) {
      roots.push(root);
    }
  }

  return {
    roots,
    nodeCount: nodeMap.size,
    maxDepth,
    nodeMap,
  };
}

/**
 * Parse point type string to enum
 */
function parsePointType(type: string | undefined): DiagramPointType {
  switch (type) {
    case "doc":
      return "doc";
    case "asst":
      return "asst";
    case "parTrans":
      return "parTrans";
    case "sibTrans":
      return "sibTrans";
    case "pres":
      return "pres";
    case "node":
    default:
      return "node";
  }
}

// =============================================================================
// Tree Traversal Utilities
// =============================================================================

/**
 * Traverse tree in depth-first order, calling callback for each node.
 */
export function traverseTree(
  roots: readonly DiagramTreeNode[],
  callback: (node: DiagramTreeNode, parent: DiagramTreeNode | undefined) => void
): void {
  function traverse(node: DiagramTreeNode, parent: DiagramTreeNode | undefined): void {
    callback(node, parent);
    for (const child of node.children) {
      traverse(child, node);
    }
  }

  for (const root of roots) {
    traverse(root, undefined);
  }
}

/**
 * Count nodes matching a predicate.
 */
export function countNodes(
  roots: readonly DiagramTreeNode[],
  predicate: (node: DiagramTreeNode) => boolean
): number {
  let count = 0;
  traverseTree(roots, (node) => {
    if (predicate(node)) {
      count++;
    }
  });
  return count;
}

/**
 * Filter nodes by type.
 */
export function filterNodesByType(
  roots: readonly DiagramTreeNode[],
  type: DiagramPointType
): DiagramTreeNode[] {
  const result: DiagramTreeNode[] = [];
  traverseTree(roots, (node) => {
    if (node.type === type) {
      result.push(node);
    }
  });
  return result;
}

/**
 * Get all content nodes (excluding transitions and presentation nodes).
 */
export function getContentNodes(roots: readonly DiagramTreeNode[]): DiagramTreeNode[] {
  const result: DiagramTreeNode[] = [];
  traverseTree(roots, (node) => {
    if (node.type === "node" || node.type === "doc" || node.type === "asst") {
      result.push(node);
    }
  });
  return result;
}

/**
 * Get the plain text content from a node's text body.
 */
export function getNodeText(node: DiagramTreeNode): string {
  if (!node.textBody?.paragraphs) {
    return "";
  }

  return node.textBody.paragraphs
    .flatMap((p) => p.runs?.map((r) => {
      // Only RegularRun has text property
      if (r.type === "text") {
        return r.text;
      }
      // LineBreakRun: return newline
      if (r.type === "break") {
        return "\n";
      }
      // FieldRun: skip
      return "";
    }) ?? [])
    .join("");
}
