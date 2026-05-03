/**
 * @file Tree builder for reconstructing node hierarchy from flat nodeChanges
 */

import type { FigNode, FigNodeType } from "../types";
import { walkTree } from "../tree";

/**
 * GUID identifier for a node
 */
export type FigGuid = {
  readonly sessionID: number;
  readonly localID: number;
};

/**
 * Convert GUID to string key.
 *
 * SoT primitive: every "format a GUID as a Map key / lookup string"
 * call site in the fig pipeline routes through here — DO NOT inline
 * `` `${guid.sessionID}:${guid.localID}` `` at call sites. Doing so
 * fragments the format, defeats the cache layer, and forces every
 * future format change (escaping, separator, etc.) into a hunt for
 * silent duplicates.
 *
 * Hot loops that call this many times for the same `FigGuid` should
 * route through a scoped `FigResolveContext`
 * (`@aurochs/fig/symbols/resolve-context`) which interns the result
 * per FigGuid for one conversion's lifetime.
 */
export function guidToString(guid: FigGuid | undefined): string {
  if (!guid) { return ""; }
  return `${guid.sessionID}:${guid.localID}`;
}

/**
 * Parse a `"sessionID:localID"` GUID string back into a FigGuid.
 *
 * Inverse of `guidToString`. SoT primitive — duplicated parse helpers
 * (`parseGuidString`, `parseGuidToFigGuid`) elsewhere in the codebase
 * have been replaced with calls to this. Keep them in sync by using
 * this function rather than re-rolling `split(":")` / `Number(...)`
 * pairs at call sites.
 */
export function parseGuidString(guidStr: string): FigGuid {
  const idx = guidStr.indexOf(":");
  return {
    sessionID: Number(guidStr.slice(0, idx)),
    localID: Number(guidStr.slice(idx + 1)),
  };
}

/**
 * Extract GUID from a node
 */
function getNodeGuid(node: FigNode): FigGuid | undefined {
  return node.guid;
}

/**
 * Extract parent GUID from a node
 */
function getParentGuid(node: FigNode): FigGuid | undefined {
  return node.parentIndex?.guid;
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
 * Get the node type as the canonical domain string-union `FigNodeType`.
 *
 * Return type is `FigNodeType | "UNKNOWN"`: this lets every caller's
 * equality / switch compare against `FIG_NODE_TYPE.*` (or literal-narrowed
 * string) with TypeScript enforcing typo-safety. Returning `string`
 * here would silently widen every consumer's comparison and defeat
 * the SSoT the `FigNodeType` union provides.
 */
export function getNodeType(node: { readonly type?: FigNode["type"] | string; readonly [key: string]: unknown }): FigNodeType | "UNKNOWN" {
  const type = node.type;

  // KiwiEnumValue has { value, name } — return the name string.
  // The Kiwi schema constrains `name` to the FigNodeType set, so the
  // runtime string matches the domain union. Passing it through without
  // a runtime validator is consistent with how other Kiwi enum values
  // reach the domain layer.
  if (typeof type === "object" && "name" in type) {
    return type.name as FigNodeType;
  }

  // API format: string literal
  if (typeof type === "string") {
    return type as FigNodeType;
  }

  return "UNKNOWN";
}

/**
 * Find all nodes of a specific type in the tree.
 *
 * Routes through the `walkTree` SoT primitive (`@aurochs/fig/tree`)
 * — the inline `function visit(n) { ...; for (c of children) visit(c); }`
 * idiom that used to live here was a duplicate of that primitive.
 */
export function findNodesByType(
  roots: readonly FigNode[],
  nodeType: string
): FigNode[] {
  const result: FigNode[] = [];
  walkTree(roots, (node) => {
    if (getNodeType(node) === nodeType) { result.push(node); }
  }, { getChildren: safeChildren });
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

/**
 * Get valid (non-null/undefined) children from a FigNode.
 *
 * Real .fig files can have sparse children arrays with null/undefined
 * entries caused by deleted nodes or malformed data. All tree-walking
 * code must use this function instead of accessing `.children`
 * directly. Returns `readonly FigNode[]` — callers must not mutate the
 * result.
 *
 * Pure primitive — no module-level caching. Hot conversion paths that
 * call this for the same nodes repeatedly should route through a
 * scoped `FigResolveContext` (see
 * `@aurochs/fig/symbols/resolve-context`) which interns the result per
 * node for one conversion's lifetime.
 *
 * Fast path: when the source array has no holes, return it as-is
 * (typed readonly). Real .fig files almost never carry sparse children
 * — the `.filter` walk is the rare exception, not the norm — so the
 * common case avoids both the predicate scan and the fresh
 * allocation. The contract permits this because the return type is
 * already readonly.
 */
const EMPTY_CHILDREN: readonly FigNode[] = [];
export function safeChildren(node: FigNode): readonly FigNode[] {
  const children = node.children;
  if (!children || children.length === 0) { return EMPTY_CHILDREN; }
  for (let i = 0; i < children.length; i++) {
    if (children[i] == null) {
      return children.filter((c): c is FigNode => c != null);
    }
  }
  return children as readonly FigNode[];
}
