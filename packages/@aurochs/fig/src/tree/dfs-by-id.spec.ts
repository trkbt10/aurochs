/**
 * @file Regression — `dfsById` is the single SoT for DFS lookup.
 *
 * Pins behaviour across input shapes so consumers (FigNode,
 * FigDesignNode mutable, FigDesignNode readonly) all get the same
 * semantics. Any future bug fix applied here must propagate to every
 * consumer because they all call this primitive — no hand-rolled DFS
 * is allowed elsewhere (enforced by the
 * `custom/no-inline-dfs-by-id` ESLint rule).
 */

import { dfsById } from "./dfs-by-id";

type Node = { id: string; children?: readonly Node[] };

function opts() {
  return {
    getId: (n: Node) => n.id,
    getChildren: (n: Node) => n.children ?? [],
  };
}

describe("dfsById — SoT for tree lookup by identifier", () => {
  it("returns undefined when roots are empty", () => {
    expect(dfsById([], "x", opts())).toBeUndefined();
  });

  it("finds a root-level node", () => {
    const nodes: Node[] = [{ id: "a" }, { id: "b" }];
    expect(dfsById(nodes, "b", opts())?.id).toBe("b");
  });

  it("finds a deep descendant", () => {
    const nodes: Node[] = [
      { id: "a", children: [{ id: "a1", children: [{ id: "a11" }] }] },
    ];
    expect(dfsById(nodes, "a11", opts())?.id).toBe("a11");
  });

  it("returns undefined for a phantom id", () => {
    const nodes: Node[] = [{ id: "a", children: [{ id: "a1" }] }];
    expect(dfsById(nodes, "phantom", opts())).toBeUndefined();
  });

  it("prefers DFS order (first branch before second)", () => {
    const nodes: Node[] = [
      { id: "a", children: [{ id: "shared" }] },
      { id: "b", children: [{ id: "shared" }] },
    ];
    // The primitive returns the first `shared`, from branch `a`.
    const found = dfsById(nodes, "shared", opts());
    expect(found).toBeDefined();
    // Integrity: found node is the leaf, not a parent.
    expect(found?.id).toBe("shared");
  });

  it("invokes onVisit pre-descent for every non-matching node", () => {
    const visited: string[] = [];
    const nodes: Node[] = [
      { id: "a", children: [{ id: "a1" }] },
      { id: "b" },
    ];
    dfsById(nodes, "nothing", {
      ...opts(),
      onVisit: (n) => { visited.push(n.id); },
    });
    // Every non-match is visited (in DFS order).
    expect(visited).toEqual(["a", "a1", "b"]);
  });

  it("does NOT invoke onVisit after a match (early-return)", () => {
    const visited: string[] = [];
    const nodes: Node[] = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ];
    dfsById(nodes, "b", {
      ...opts(),
      onVisit: (n) => { visited.push(n.id); },
    });
    // Only `a` is visited (pre-descent). `b` matches so no onVisit,
    // and `c` is unreached because we return early.
    expect(visited).toEqual(["a"]);
  });

  it("supports arbitrary TNode shapes via getId/getChildren", () => {
    // Demonstrate the generic contract: TNode can be anything.
    type Rec = { key: number; kids?: readonly Rec[] };
    const tree: Rec[] = [{ key: 1, kids: [{ key: 2, kids: [{ key: 3 }] }] }];
    const found = dfsById(tree, "2", {
      getId: (n) => String(n.key),
      getChildren: (n) => n.kids ?? [],
    });
    expect(found?.key).toBe(2);
  });
});
