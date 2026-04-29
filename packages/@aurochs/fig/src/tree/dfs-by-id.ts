/**
 * @file SSoT: depth-first search by identifier over any tree shape.
 *
 * A single generic implementation of "walk a tree, return the first
 * node whose identifier matches". Every slot-lookup / reachability /
 * existence check in the fig pipeline must route through this
 * function so a single bug fix or semantic adjustment applies
 * uniformly across all input types (raw FigNode, mutable
 * FigDesignNode, readonly FigDesignNode).
 *
 * The input type is captured as a generic `TNode`; callers supply
 * - `getId`: identifier extractor
 * - `getChildren`: children extractor
 * - `onVisit?`: optional pre-descent mutation hook (used by domain
 *   callers to lazily materialize nested INSTANCE children).
 *
 * Reach / exist checks are spelled `dfsById(...) !== undefined`;
 * there are no helper wrappers for "reachable" or "exists" because
 * they would fragment the SoT into named predicates with identical
 * bodies.
 *
 * Hand-rolled DFS-by-id is banned repo-wide via the ESLint rule
 * `custom/no-inline-dfs-by-id` — see
 * `eslint/plugins/custom/rules/no-inline-dfs-by-id.js`.
 */

export type DfsByIdOptions<TNode> = {
  readonly getId: (node: TNode) => string;
  readonly getChildren: (node: TNode) => readonly TNode[];
  /**
   * Pre-descent hook. Called after an id mismatch, before the DFS
   * descends into the node's children. Used by the scene-graph domain
   * walker to lazily materialise nested INSTANCE children from the
   * symbolMap so multi-level override paths find their target slots.
   * No-op for pure-read callers.
   */
  readonly onVisit?: (node: TNode) => void;
};

/**
 * DFS over `roots` and their descendants, returning the first node
 * whose `getId(node)` equals `id`. Returns `undefined` when no node
 * matches.
 */
export function dfsById<TNode>(
  roots: readonly TNode[],
  id: string,
  opts: DfsByIdOptions<TNode>,
): TNode | undefined {
  for (const root of roots) {
    if (opts.getId(root) === id) { return root; }
    if (opts.onVisit) { opts.onVisit(root); }
    const children = opts.getChildren(root);
    if (children.length > 0) {
      const found = dfsById(children, id, opts);
      if (found) { return found; }
    }
  }
  return undefined;
}
