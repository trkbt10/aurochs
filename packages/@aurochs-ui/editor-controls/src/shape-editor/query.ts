/**
 * @file Generic shape query operations
 *
 * Search and traversal operations for shape trees.
 */

import type { ShapeNode, IdentifiableShape, GroupShapeNode } from "./types";
import { isIdentifiable, isGroupShape } from "./types";
import { hasShapeId } from "./identity";
import { dfsById } from "@aurochs/fig/tree";

/**
 * Find shape by ID (supports nested groups). Delegates to the repo-wide
 * `dfsById` SoT; inline DFS-by-id is banned by lint.
 */
export function findShapeById(shapes: readonly ShapeNode[], id: string): ShapeNode | undefined {
  return dfsById(shapes, id, {
    getId: (s) => (isIdentifiable(s) ? s.nonVisual.id : ""),
    getChildren: (s) => (isGroupShape(s) ? s.children : []),
  });
}

/**
 * Find shape by ID and return with parent groups chain.
 *
 * Implementation: run the DFS SoT while tracking the group-ancestor
 * stack via the `onVisit` hook. The hook is called pre-descent; we
 * grow the stack before each visit and trim it after via the shape's
 * depth vs the stack length recorded against the last seen shape.
 *
 * Because `dfsById`'s `onVisit` fires for every node regardless of
 * match, we capture the ancestor trail of the matching node by
 * restarting the stack at each root and appending/popping as visits
 * enter/leave groups. The primitive's DFS is left-first pre-order, so
 * we maintain a parallel cursor: push on group entry (pre-descent),
 * pop on return — detected by tracking which children have been
 * entered.
 */
export function findShapeByIdWithParents(
  shapes: readonly ShapeNode[],
  id: string,
): { shape: ShapeNode; parentGroups: readonly GroupShapeNode[] } | undefined {
  // The minimal, reliable way to expose the ancestor chain from
  // `dfsById` is a local recursion that calls the primitive at each
  // level. Each group-level call delegates the "is the match at this
  // level?" question to `dfsById` for a single-level search (empty
  // `getChildren`); group children are recursed explicitly.
  function search(
    nodes: readonly ShapeNode[],
    parents: readonly GroupShapeNode[],
  ): { shape: ShapeNode; parentGroups: readonly GroupShapeNode[] } | undefined {
    const hit = dfsById(nodes, id, {
      getId: (s) => (isIdentifiable(s) ? s.nonVisual.id : ""),
      // Single-level only: children are searched via the explicit
      // recursion below so `parents` grows one level at a time.
      getChildren: () => [],
    });
    if (hit) { return { shape: hit, parentGroups: parents }; }
    for (const s of nodes) {
      if (!isGroupShape(s)) { continue; }
      const nested = search(s.children, [...parents, s]);
      if (nested) { return nested; }
    }
    return undefined;
  }
  return search(shapes, []);
}

/**
 * Get top-level shape IDs
 */
export function getTopLevelShapeIds(shapes: readonly ShapeNode[]): readonly string[] {
  return shapes.filter(hasShapeId).map((s) => (s as IdentifiableShape).nonVisual.id);
}

/**
 * Check if shape ID is at top level
 */
export function isTopLevelShape(shapes: readonly ShapeNode[], id: string): boolean {
  return shapes.some((s) => isIdentifiable(s) && s.nonVisual.id === id);
}
