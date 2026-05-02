/**
 * @file SSoT: visit every node in a tree (DFS pre-order).
 *
 * The pre-order DFS is the most common tree-walk shape used by fig
 * conversion code — collecting the node map, building style
 * registries, gathering component definitions, walking SYMBOL
 * descendants. Hand-rolled copies of the same `visit + recurse`
 * idiom proliferate without a primitive: each consumer writes its
 * own `function walk(n) { do(n); for (c of children(n)) walk(c); }`.
 *
 * `walkTree` is that primitive. Callers supply children-extractor
 * (so the same primitive works for raw `FigNode` trees, mutable
 * `FigDesignNode` trees, etc.) and a per-node visitor.
 *
 * Behavioural notes:
 *   - Pre-order: `visit(n)` runs BEFORE descending into children.
 *   - Returns nothing — for "find a single node" semantics use
 *     `dfsById`; for "produce a derived value" use a closure
 *     over an accumulator.
 *
 * Use this instead of writing yet another inline DFS — every
 * downstream change to "how does the fig pipeline visit a tree"
 * (e.g. cycle detection, depth caps) lands in one place.
 */

export type WalkTreeOptions<TNode> = {
  readonly getChildren: (node: TNode) => readonly TNode[];
};

/** Walk every node in `roots` and their descendants, pre-order DFS. */
export function walkTree<TNode>(
  roots: readonly TNode[],
  visit: (node: TNode) => void,
  opts: WalkTreeOptions<TNode>,
): void {
  for (const root of roots) {
    visitOne(root, visit, opts.getChildren);
  }
}

function visitOne<TNode>(
  node: TNode,
  visit: (n: TNode) => void,
  getChildren: (n: TNode) => readonly TNode[],
): void {
  visit(node);
  for (const child of getChildren(node)) {
    visitOne(child, visit, getChildren);
  }
}
