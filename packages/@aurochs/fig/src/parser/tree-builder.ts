/**
 * @file Tree builder for reconstructing node hierarchy from flat nodeChanges
 */

import type { FigNode } from "../types";

/**
 * GUID identifier for a node
 */
export type FigGuid = {
  readonly sessionID: number;
  readonly localID: number;
};

/**
 * Convert GUID to string key
 */
export function guidToString(guid: FigGuid | undefined): string {
  if (!guid) return "";
  return `${guid.sessionID}:${guid.localID}`;
}

/**
 * Extract GUID from a node
 */
function getNodeGuid(node: FigNode): FigGuid | undefined {
  const nodeData = node as Record<string, unknown>;
  return nodeData.guid as FigGuid | undefined;
}

/**
 * Extract parent GUID from a node
 */
function getParentGuid(node: FigNode): FigGuid | undefined {
  const nodeData = node as Record<string, unknown>;
  const parentIndex = nodeData.parentIndex as { guid?: FigGuid } | undefined;
  return parentIndex?.guid;
}

/**
 * Build a node with its children attached
 */
function buildNodeWithChildren(
  node: FigNode,
  children: FigNode[],
  buildFn: (n: FigNode) => FigNode
): FigNode {
  if (children.length === 0) {
    return node;
  }
  return { ...node, children: children.map(buildFn) };
}

/**
 * Result of building the node tree
 */
export type NodeTreeResult = {
  /** Root nodes (typically DOCUMENT) */
  readonly roots: readonly FigNode[];
  /** Map of GUID string to node (with children populated) */
  readonly nodeMap: ReadonlyMap<string, FigNode>;
};

/**
 * Build a tree structure from flat nodeChanges
 *
 * Figma's nodeChanges is a flat list where parent-child relationships
 * are represented via guid and parentIndex.guid properties.
 * This function reconstructs the tree hierarchy.
 *
 * @param nodeChanges - Flat list of nodes from ParsedFigFile
 * @returns Tree structure with roots and node map
 */
export function buildNodeTree(nodeChanges: readonly FigNode[]): NodeTreeResult {
  // Build guid -> node map (original nodes without children)
  const originalMap = new Map<string, FigNode>();
  for (const node of nodeChanges) {
    const guid = getNodeGuid(node);
    if (guid) {
      originalMap.set(guidToString(guid), node);
    }
  }

  // Build parent -> children map
  const childrenMap = new Map<string, FigNode[]>();
  for (const node of nodeChanges) {
    const parentGuid = getParentGuid(node);
    if (parentGuid) {
      const parentKey = guidToString(parentGuid);
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)!.push(node);
    }
  }

  // Recursively build tree nodes
  const builtMap = new Map<string, FigNode>();

  function buildNode(node: FigNode): FigNode {
    const guid = getNodeGuid(node);
    const guidStr = guidToString(guid);

    // Check if already built
    if (builtMap.has(guidStr)) {
      return builtMap.get(guidStr)!;
    }

    const children = childrenMap.get(guidStr) ?? [];

    // Build node with children
    const builtNode = buildNodeWithChildren(node, children, buildNode);

    builtMap.set(guidStr, builtNode);
    return builtNode;
  }

  // Find root nodes (nodes without parentIndex or with no parent in the map)
  const roots: FigNode[] = [];
  for (const node of nodeChanges) {
    const parentGuid = getParentGuid(node);
    if (!parentGuid || !originalMap.has(guidToString(parentGuid))) {
      roots.push(buildNode(node));
    }
  }

  return {
    roots,
    nodeMap: builtMap,
  };
}

/**
 * Get node type as string
 */
export function getNodeType(node: FigNode): string {
  const nodeData = node as Record<string, unknown>;
  const type = nodeData.type;

  if (typeof type === "string") {
    return type;
  }

  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }

  return "UNKNOWN";
}

/**
 * Find all nodes of a specific type in the tree
 */
export function findNodesByType(
  roots: readonly FigNode[],
  nodeType: string
): FigNode[] {
  const result: FigNode[] = [];

  function visit(node: FigNode) {
    if (getNodeType(node) === nodeType) {
      result.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  for (const root of roots) {
    visit(root);
  }

  return result;
}

/**
 * Find a node by GUID string
 */
export function findNodeByGuid(
  nodeMap: ReadonlyMap<string, FigNode>,
  guidStr: string
): FigNode | undefined {
  return nodeMap.get(guidStr);
}
