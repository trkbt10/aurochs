/**
 * @file Recursive tree utilities for FigDesignNode trees
 *
 * Provides immutable operations for finding, updating, and removing
 * nodes within a tree structure.
 */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { dfsById } from "@aurochs/fig/tree";

// =============================================================================
// Find
// =============================================================================

/**
 * Find a node by ID anywhere in a tree of nodes. Returns undefined if
 * not found.
 *
 * Implementation delegates to the repo-wide `dfsById` SoT in
 * `@aurochs/fig/tree`. Inline DFS-by-id is banned by the ESLint rule
 * `custom/no-inline-dfs-by-id`; every consumer MUST route through a
 * thin type-tying wrapper like this one.
 */
export function findNodeById(
  nodes: readonly FigDesignNode[],
  id: FigNodeId,
): FigDesignNode | undefined {
  return dfsById(nodes, id, {
    getId: (n) => n.id,
    getChildren: (n) => n.children ?? [],
  });
}

/**
 * Find the parent of a node by ID. Returns undefined if the node is a
 * top-level child or not found.
 *
 * Implementation: locate the child via the `dfsById` SoT, then return
 * the parent that was captured during the walk. `onVisit` is the only
 * place in the DFS where we observe the pre-descent parent, so we use
 * it to record the candidate parent before recursion continues.
 */
export function findParentNode(
  nodes: readonly FigDesignNode[],
  id: FigNodeId,
): FigDesignNode | undefined {
  // eslint-disable-next-line no-restricted-syntax -- mutable reference captured by closure to surface DFS parent
  const parentRef: { value: FigDesignNode | undefined } = { value: undefined };
  dfsById(nodes, id, {
    getId: (n) => n.id,
    getChildren: (n) => n.children ?? [],
    // Before descending into `n`'s children, tentatively mark `n` as
    // the candidate parent. If the DFS matches one of its direct
    // children, `n` is the answer; matches deeper in the tree
    // overwrite `parentRef.value` with the nearer parent.
    onVisit: (n) => {
      const children = n.children;
      if (children && children.some((c) => c.id === id)) {
        parentRef.value = n;
      }
    },
  });
  return parentRef.value;
}

// =============================================================================
// Update
// =============================================================================

/**
 * Update a node by ID anywhere in a tree, returning a new tree.
 *
 * The updater function receives the current node and returns the updated node.
 * If the node is not found, the tree is returned unchanged.
 */
export function updateNodeInTree(
  nodes: readonly FigDesignNode[],
  id: FigNodeId,
  updater: (node: FigDesignNode) => FigDesignNode,
): readonly FigDesignNode[] {
  // eslint-disable-next-line no-restricted-syntax -- structural sharing: `changed` flag avoids re-allocating unchanged tree branches
  let changed = false;
  const result = nodes.map((node) => {
    if (node.id === id) {
      changed = true;
      return updater(node);
    }
    if (node.children) {
      const updatedChildren = updateNodeInTree(node.children, id, updater);
      if (updatedChildren !== node.children) {
        changed = true;
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });

  return changed ? result : nodes;
}

// =============================================================================
// Remove
// =============================================================================

/**
 * Remove a node by ID from anywhere in a tree, returning a new tree.
 *
 * If the node is not found, the tree is returned unchanged.
 * Removes the node and all its descendants.
 */
export function removeNodeFromTree(
  nodes: readonly FigDesignNode[],
  id: FigNodeId,
): readonly FigDesignNode[] {
  // eslint-disable-next-line no-restricted-syntax -- structural sharing: `changed` flag avoids re-allocating unchanged tree branches
  let changed = false;
  const result: FigDesignNode[] = [];

  /* eslint-disable custom/no-inline-dfs-by-id -- structural tree transform
   (produces a new tree with the target node excised), not a slot lookup.
   The `dfsById` SoT returns a single node; the transform here walks every
   branch building a rebuilt tree with structural sharing. Different
   contract from find-style lookup. */
  for (const node of nodes) {
    if (node.id === id) {
      changed = true;
      continue; // Skip this node (remove it)
    }

    if (node.children) {
      const updatedChildren = removeNodeFromTree(node.children, id);
      if (updatedChildren !== node.children) {
        changed = true;
        result.push({ ...node, children: updatedChildren });
        continue;
      }
    }

    result.push(node);
  }
  /* eslint-enable custom/no-inline-dfs-by-id */

  return changed ? result : nodes;
}

// =============================================================================
// Insert
// =============================================================================

type InsertNodeInTreeOptions = {
  readonly nodes: readonly FigDesignNode[];
  readonly parentId: FigNodeId | null;
  readonly node: FigDesignNode;
  readonly index?: number;
};

/**
 * Insert a node at a specific position within a parent's children.
 *
 * If parentId is null, inserts as a top-level node.
 * Returns the updated tree, or the original tree if the parent is not found.
 */
export function insertNodeInTree(
  { nodes, parentId, node, index }: InsertNodeInTreeOptions,
): readonly FigDesignNode[] {
  if (parentId === null) {
    // Insert as top-level
    const insertAt = index ?? nodes.length;
    const result = [...nodes];
    result.splice(insertAt, 0, node);
    return result;
  }

  // eslint-disable-next-line no-restricted-syntax -- structural sharing: `changed` flag avoids re-allocating unchanged tree branches
  let changed = false;
  const result = nodes.map((existing) => {
    if (existing.id === parentId) {
      changed = true;
      const children = existing.children ? [...existing.children] : [];
      const insertAt = index ?? children.length;
      children.splice(insertAt, 0, node);
      return { ...existing, children };
    }

    if (existing.children) {
      const updatedChildren = insertNodeInTree({ nodes: existing.children, parentId, node, index });
      if (updatedChildren !== existing.children) {
        changed = true;
        return { ...existing, children: updatedChildren };
      }
    }

    return existing;
  });

  return changed ? result : nodes;
}

// =============================================================================
// Flatten
// =============================================================================

/**
 * Flatten a tree of nodes into a flat array (pre-order traversal).
 */
export function flattenNodes(nodes: readonly FigDesignNode[]): readonly FigDesignNode[] {
  const result: FigDesignNode[] = [];

  function visit(nodeList: readonly FigDesignNode[]): void {
    for (const node of nodeList) {
      result.push(node);
      if (node.children) {
        visit(node.children);
      }
    }
  }

  visit(nodes);
  return result;
}

// =============================================================================
// Reorder
// =============================================================================

/**
 * Reorder a node within its parent's children list.
 *
 * Directions:
 * - "front": Move to end (top of visual stack)
 * - "back": Move to start (bottom of visual stack)
 * - "forward": Move one position toward end
 * - "backward": Move one position toward start
 */
export function reorderNodeInTree(
  nodes: readonly FigDesignNode[],
  id: FigNodeId,
  direction: "front" | "back" | "forward" | "backward",
): readonly FigDesignNode[] {
  // Check if it's a direct child
  const index = nodes.findIndex((n) => n.id === id);
  if (index !== -1) {
    return reorderAtIndex(nodes, index, direction);
  }

  // Search in children
  // eslint-disable-next-line no-restricted-syntax -- structural sharing: `changed` flag avoids re-allocating unchanged tree branches
  let changed = false;
  const result = nodes.map((node) => {
    if (node.children) {
      const updatedChildren = reorderNodeInTree(node.children, id, direction);
      if (updatedChildren !== node.children) {
        changed = true;
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });

  return changed ? result : nodes;
}

/**
 * Reorder an item at a known index within an array.
 */
function reorderAtIndex(
  items: readonly FigDesignNode[],
  index: number,
  direction: "front" | "back" | "forward" | "backward",
): readonly FigDesignNode[] {
  const result = [...items];
  const [item] = result.splice(index, 1);

  switch (direction) {
    case "front":
      result.push(item);
      break;
    case "back":
      result.unshift(item);
      break;
    case "forward":
      if (index < items.length - 1) {
        result.splice(index + 1, 0, item);
      } else {
        result.push(item); // Already at end
      }
      break;
    case "backward":
      if (index > 0) {
        result.splice(index - 1, 0, item);
      } else {
        result.unshift(item); // Already at start
      }
      break;
  }

  return result;
}
