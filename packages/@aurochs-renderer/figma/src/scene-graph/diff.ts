/**
 * @file Scene graph diffing
 *
 * Computes the minimal set of operations to transform one scene graph into another.
 * Uses SceneNodeId for stable identity matching (React-style keyed reconciliation).
 */

import type { SceneGraph, SceneNode, SceneNodeId, GroupNode, FrameNode } from "./types";

// =============================================================================
// Diff Operation Types
// =============================================================================

export type AddOp = {
  readonly type: "add";
  readonly parentId: SceneNodeId;
  readonly node: SceneNode;
  readonly index: number;
};

export type RemoveOp = {
  readonly type: "remove";
  readonly parentId: SceneNodeId;
  readonly nodeId: SceneNodeId;
};

export type UpdateOp = {
  readonly type: "update";
  readonly nodeId: SceneNodeId;
  readonly changes: Partial<SceneNode>;
};

export type ReorderOp = {
  readonly type: "reorder";
  readonly parentId: SceneNodeId;
  readonly nodeId: SceneNodeId;
  readonly newIndex: number;
};

export type DiffOp = AddOp | RemoveOp | UpdateOp | ReorderOp;

export type SceneGraphDiff = {
  readonly ops: readonly DiffOp[];
  readonly versionFrom: number;
  readonly versionTo: number;
};

// =============================================================================
// Node Comparison
// =============================================================================

/**
 * Check if two values are shallowly equal
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a !== "object") return a === b;

  // For arrays, compare length and elements
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  // For objects, compare own keys
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => aObj[key] === bObj[key]);
}

/**
 * Get children of a node (if it has them)
 */
function getChildren(node: SceneNode): readonly SceneNode[] | undefined {
  if (node.type === "group" || node.type === "frame") {
    return (node as GroupNode | FrameNode).children;
  }
  return undefined;
}

/**
 * Compare two nodes and return changes (ignoring children)
 */
function compareNodeProperties(prev: SceneNode, next: SceneNode): Partial<SceneNode> | null {
  if (prev.type !== next.type) {
    // Type changed - treat as full replacement
    return next;
  }

  const changes: Record<string, unknown> = {};
  let hasChanges = false;

  // Compare all properties except id, type, and children
  const nextObj = next as Record<string, unknown>;
  const prevObj = prev as Record<string, unknown>;

  for (const key of Object.keys(nextObj)) {
    if (key === "id" || key === "type" || key === "children") continue;

    if (!shallowEqual(prevObj[key], nextObj[key])) {
      changes[key] = nextObj[key];
      hasChanges = true;
    }
  }

  // Check for removed properties
  for (const key of Object.keys(prevObj)) {
    if (key === "id" || key === "type" || key === "children") continue;
    if (!(key in nextObj)) {
      changes[key] = undefined;
      hasChanges = true;
    }
  }

  return hasChanges ? (changes as Partial<SceneNode>) : null;
}

// =============================================================================
// Recursive Diffing
// =============================================================================

/**
 * Diff two arrays of children with stable ID matching
 */
function diffChildren(
  parentId: SceneNodeId,
  prevChildren: readonly SceneNode[],
  nextChildren: readonly SceneNode[],
  ops: DiffOp[]
): void {
  // Build index maps by ID
  const prevById = new Map<string, { node: SceneNode; index: number }>();
  for (let i = 0; i < prevChildren.length; i++) {
    prevById.set(prevChildren[i].id, { node: prevChildren[i], index: i });
  }

  const nextById = new Map<string, { node: SceneNode; index: number }>();
  for (let i = 0; i < nextChildren.length; i++) {
    nextById.set(nextChildren[i].id, { node: nextChildren[i], index: i });
  }

  // Find removed nodes
  for (const [id] of prevById) {
    if (!nextById.has(id)) {
      ops.push({
        type: "remove",
        parentId,
        nodeId: id as SceneNodeId,
      });
    }
  }

  // Find added and updated nodes
  for (let i = 0; i < nextChildren.length; i++) {
    const nextChild = nextChildren[i];
    const prevEntry = prevById.get(nextChild.id);

    if (!prevEntry) {
      // New node
      ops.push({
        type: "add",
        parentId,
        node: nextChild,
        index: i,
      });
    } else {
      // Existing node - check for property changes
      const changes = compareNodeProperties(prevEntry.node, nextChild);
      if (changes) {
        ops.push({
          type: "update",
          nodeId: nextChild.id,
          changes,
        });
      }

      // Check for reorder
      if (prevEntry.index !== i) {
        ops.push({
          type: "reorder",
          parentId,
          nodeId: nextChild.id,
          newIndex: i,
        });
      }

      // Recursively diff children
      const prevChildChildren = getChildren(prevEntry.node);
      const nextChildChildren = getChildren(nextChild);

      if (prevChildChildren && nextChildChildren) {
        diffChildren(nextChild.id, prevChildChildren, nextChildChildren, ops);
      }
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Compute the diff between two scene graphs
 *
 * @param prev - Previous scene graph
 * @param next - Next scene graph
 * @returns Diff operations to transform prev into next
 */
export function diffSceneGraphs(
  prev: SceneGraph,
  next: SceneGraph
): SceneGraphDiff {
  const ops: DiffOp[] = [];

  // Diff root children
  diffChildren(
    prev.root.id,
    prev.root.children,
    next.root.children,
    ops
  );

  return {
    ops,
    versionFrom: prev.version,
    versionTo: next.version,
  };
}

/**
 * Check if a diff has any operations
 */
export function hasDiffOps(diff: SceneGraphDiff): boolean {
  return diff.ops.length > 0;
}
