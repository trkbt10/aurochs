/**
 * @file Tests for forEach and conditional branching
 *
 * @see ECMA-376 Part 1, Section 21.4.5 (ForEach)
 * @see ECMA-376 Part 1, Section 21.4.6 (Choose/If/Else)
 */

import type { DiagramForEach, DiagramChoose, DiagramIf } from "../types";
import type { DiagramTreeNode } from "./tree-builder";
import {
  processForEach,
  selectNodesByAxis,
  filterNodesByPointType,
  processChoose,
  evaluateIf,
  evaluateFunction,
  evaluateOperator,
  createForEachContext,
  createForEachChildContext,
  type ForEachContext,
} from "./iteration";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTreeNode(
  id: string,
  type: "node" | "doc" | "asst" | "parTrans" | "sibTrans" | "pres" = "node",
  children: DiagramTreeNode[] = [],
  depth: number = 0
): DiagramTreeNode {
  return {
    id,
    type,
    children,
    depth,
    siblingIndex: 0,
    siblingCount: children.length || 1,
  };
}

function createTree(): DiagramTreeNode[] {
  const grandchild1 = createTreeNode("gc1", "node", [], 2);
  const grandchild2 = createTreeNode("gc2", "node", [], 2);
  const child1 = createTreeNode("c1", "node", [grandchild1, grandchild2], 1);
  const child2 = createTreeNode("c2", "asst", [], 1);
  const child3 = createTreeNode("c3", "parTrans", [], 1);
  const root = createTreeNode("root", "doc", [child1, child2, child3], 0);
  return [root];
}

function createContext(node: DiagramTreeNode, allNodes: DiagramTreeNode[]): ForEachContext {
  return createForEachContext(node, allNodes);
}

// =============================================================================
// selectNodesByAxis Tests
// =============================================================================

describe("selectNodesByAxis", () => {
  const tree = createTree();
  const root = tree[0];

  it("selects self", () => {
    const result = selectNodesByAxis(root, ["self"], tree);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("root");
  });

  it("selects children", () => {
    const result = selectNodesByAxis(root, ["ch"], tree);

    expect(result).toHaveLength(3);
    expect(result.map((n) => n.id)).toContain("c1");
    expect(result.map((n) => n.id)).toContain("c2");
    expect(result.map((n) => n.id)).toContain("c3");
  });

  it("selects descendants", () => {
    const result = selectNodesByAxis(root, ["des"], tree);

    expect(result).toHaveLength(5);
    expect(result.map((n) => n.id)).toContain("c1");
    expect(result.map((n) => n.id)).toContain("gc1");
    expect(result.map((n) => n.id)).toContain("gc2");
  });

  it("selects descendants or self", () => {
    const result = selectNodesByAxis(root, ["desOrSelf"], tree);

    expect(result).toHaveLength(6);
    expect(result[0].id).toBe("root");
  });

  it("selects parent", () => {
    const child = root.children[0];
    const result = selectNodesByAxis(child, ["par"], tree);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("root");
  });

  it("selects ancestors", () => {
    const grandchild = root.children[0].children[0];
    const result = selectNodesByAxis(grandchild, ["ancst"], tree);

    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toContain("c1");
    expect(result.map((n) => n.id)).toContain("root");
  });

  it("selects ancestors or self", () => {
    const grandchild = root.children[0].children[0];
    const result = selectNodesByAxis(grandchild, ["ancstOrSelf"], tree);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("gc1");
  });

  it("selects root", () => {
    const grandchild = root.children[0].children[0];
    const result = selectNodesByAxis(grandchild, ["root"], tree);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("root");
  });

  it("selects following siblings", () => {
    const child1 = root.children[0];
    const result = selectNodesByAxis(child1, ["followSib"], tree);

    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toContain("c2");
    expect(result.map((n) => n.id)).toContain("c3");
  });

  it("selects preceding siblings", () => {
    const child3 = root.children[2];
    const result = selectNodesByAxis(child3, ["precedSib"], tree);

    expect(result).toHaveLength(2);
    expect(result.map((n) => n.id)).toContain("c1");
    expect(result.map((n) => n.id)).toContain("c2");
  });

  it("returns empty for none axis", () => {
    const result = selectNodesByAxis(root, ["none"], tree);

    expect(result).toHaveLength(0);
  });

  it("combines multiple axes", () => {
    const result = selectNodesByAxis(root, ["self", "ch"], tree);

    expect(result).toHaveLength(4);
  });
});

// =============================================================================
// filterNodesByPointType Tests
// =============================================================================

describe("filterNodesByPointType", () => {
  const tree = createTree();
  const allNodes = selectNodesByAxis(tree[0], ["desOrSelf"], tree);

  it("filters by node type", () => {
    const result = filterNodesByPointType(allNodes, ["node"]);

    expect(result.every((n) => n.type === "node")).toBe(true);
  });

  it("filters by asst type", () => {
    const result = filterNodesByPointType(allNodes, ["asst"]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("asst");
  });

  it("filters by doc type", () => {
    const result = filterNodesByPointType(allNodes, ["doc"]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("doc");
  });

  it("includes all with 'all' type", () => {
    const result = filterNodesByPointType(allNodes, ["all"]);

    expect(result).toHaveLength(allNodes.length);
  });

  it("filters nonAsst", () => {
    const result = filterNodesByPointType(allNodes, ["nonAsst"]);

    expect(result.every((n) => n.type !== "asst")).toBe(true);
  });

  it("combines multiple types", () => {
    const result = filterNodesByPointType(allNodes, ["node", "asst"]);

    expect(result.every((n) => n.type === "node" || n.type === "asst")).toBe(true);
  });
});

// =============================================================================
// processForEach Tests
// =============================================================================

describe("processForEach", () => {
  const tree = createTree();
  const root = tree[0];

  it("processes basic forEach", () => {
    const forEach: DiagramForEach = {
      axis: ["ch"],
      content: {},
    };
    const context = createContext(root, tree);

    const result = processForEach(forEach, context);

    expect(result.selectedNodes).toHaveLength(3);
  });

  it("respects pointType filter", () => {
    const forEach: DiagramForEach = {
      axis: ["ch"],
      pointType: ["node"],
      content: {},
    };
    const context = createContext(root, tree);

    const result = processForEach(forEach, context);

    expect(result.selectedNodes.every((n) => n.type === "node")).toBe(true);
  });

  it("respects start parameter", () => {
    const forEach: DiagramForEach = {
      axis: ["ch"],
      start: [2], // Start from 2nd element (1-based)
      content: {},
    };
    const context = createContext(root, tree);

    const result = processForEach(forEach, context);

    expect(result.selectedNodes).toHaveLength(2);
    expect(result.selectedNodes[0].id).toBe("c2");
  });

  it("respects step parameter", () => {
    const forEach: DiagramForEach = {
      axis: ["ch"],
      step: [2], // Every 2nd element
      content: {},
    };
    const context = createContext(root, tree);

    const result = processForEach(forEach, context);

    expect(result.selectedNodes).toHaveLength(2);
    expect(result.selectedNodes[0].id).toBe("c1");
    expect(result.selectedNodes[1].id).toBe("c3");
  });

  it("respects count parameter", () => {
    const forEach: DiagramForEach = {
      axis: ["ch"],
      count: [2], // Only first 2
      content: {},
    };
    const context = createContext(root, tree);

    const result = processForEach(forEach, context);

    expect(result.selectedNodes).toHaveLength(2);
  });

  it("handles hideLastTransition", () => {
    const forEach: DiagramForEach = {
      axis: ["ch"],
      hideLastTransition: [true],
      content: {},
    };
    const context = createContext(root, tree);

    const result = processForEach(forEach, context);

    // Last child is parTrans, should be hidden
    expect(result.selectedNodes).toHaveLength(2);
    expect(result.selectedNodes.every((n) => n.type !== "parTrans")).toBe(true);
  });
});

// =============================================================================
// processChoose Tests
// =============================================================================

describe("processChoose", () => {
  const tree = createTree();
  const root = tree[0];

  it("matches if condition", () => {
    const choose: DiagramChoose = {
      if: {
        function: "cnt",
        operator: "gt",
        value: 0,
        // DiagramIf extends DiagramLayoutContent directly (no content property)
      },
    };
    const context = createContext(root, tree);

    const result = processChoose(choose, context);

    expect(result.matched).toBe(true);
  });

  it("falls through to else when if fails", () => {
    const choose: DiagramChoose = {
      if: {
        function: "cnt",
        operator: "equ",
        value: 100,
      },
      else: {
        name: "fallback",
      },
    };
    const context = createContext(root, tree);

    const result = processChoose(choose, context);

    expect(result.matched).toBe(true);
    expect(result.branchName).toBe("fallback");
  });

  it("returns unmatched when no else and if fails", () => {
    const choose: DiagramChoose = {
      if: {
        function: "cnt",
        operator: "equ",
        value: 100,
      },
    };
    const context = createContext(root, tree);

    const result = processChoose(choose, context);

    expect(result.matched).toBe(false);
  });
});

// =============================================================================
// evaluateIf Tests
// =============================================================================

describe("evaluateIf", () => {
  const tree = createTree();
  const root = tree[0];

  it("returns true for no condition", () => {
    const ifElement: DiagramIf = {};
    const context = createContext(root, tree);

    expect(evaluateIf(ifElement, context)).toBe(true);
  });

  it("evaluates cnt function", () => {
    const ifElement: DiagramIf = {
      function: "cnt",
      operator: "equ",
      value: 3,
    };
    const context = createContext(root, tree);

    expect(evaluateIf(ifElement, context)).toBe(true);
  });

  it("evaluates depth function", () => {
    const ifElement: DiagramIf = {
      function: "depth",
      operator: "equ",
      value: 0,
    };
    const context = createContext(root, tree);

    expect(evaluateIf(ifElement, context)).toBe(true);
  });
});

// =============================================================================
// evaluateFunction Tests
// =============================================================================

describe("evaluateFunction", () => {
  const tree = createTree();
  const root = tree[0];

  it("evaluates cnt", () => {
    const context = createContext(root, tree);
    const result = evaluateFunction("cnt", undefined, context);

    expect(result).toBe(3);
  });

  it("evaluates depth", () => {
    const context = createContext(root, tree);
    const result = evaluateFunction("depth", undefined, context);

    expect(result).toBe(0);
  });

  it("evaluates pos", () => {
    const context = createForEachChildContext(createContext(root, tree), root, 5, 10);
    const result = evaluateFunction("pos", undefined, context);

    expect(result).toBe(5);
  });

  it("evaluates posEven", () => {
    const context = createForEachChildContext(createContext(root, tree), root, 4, 10);
    const result = evaluateFunction("posEven", undefined, context);

    expect(result).toBe(true);
  });

  it("evaluates posOdd", () => {
    const context = createForEachChildContext(createContext(root, tree), root, 3, 10);
    const result = evaluateFunction("posOdd", undefined, context);

    expect(result).toBe(true);
  });

  it("evaluates revPos", () => {
    const context = createForEachChildContext(createContext(root, tree), root, 3, 10);
    const result = evaluateFunction("revPos", undefined, context);

    expect(result).toBe(8); // 10 - 3 + 1
  });

  it("evaluates maxDepth", () => {
    const context = createContext(root, tree);
    const result = evaluateFunction("maxDepth", undefined, context);

    expect(result).toBe(2);
  });

  it("evaluates var with argument", () => {
    const vars = new Map<string, number>();
    vars.set("dir", 1);
    const context = createForEachContext(root, tree, vars);
    const result = evaluateFunction("var", "dir", context);

    expect(result).toBe(1);
  });
});

// =============================================================================
// evaluateOperator Tests
// =============================================================================

describe("evaluateOperator", () => {
  it("evaluates equ", () => {
    expect(evaluateOperator(5, "equ", 5)).toBe(true);
    expect(evaluateOperator(5, "equ", 3)).toBe(false);
  });

  it("evaluates neq", () => {
    expect(evaluateOperator(5, "neq", 3)).toBe(true);
    expect(evaluateOperator(5, "neq", 5)).toBe(false);
  });

  it("evaluates gt", () => {
    expect(evaluateOperator(5, "gt", 3)).toBe(true);
    expect(evaluateOperator(5, "gt", 5)).toBe(false);
  });

  it("evaluates gte", () => {
    expect(evaluateOperator(5, "gte", 5)).toBe(true);
    expect(evaluateOperator(5, "gte", 6)).toBe(false);
  });

  it("evaluates lt", () => {
    expect(evaluateOperator(3, "lt", 5)).toBe(true);
    expect(evaluateOperator(5, "lt", 5)).toBe(false);
  });

  it("evaluates lte", () => {
    expect(evaluateOperator(5, "lte", 5)).toBe(true);
    expect(evaluateOperator(6, "lte", 5)).toBe(false);
  });

  it("compares strings with equ", () => {
    expect(evaluateOperator("norm", "equ", "norm")).toBe(true);
    expect(evaluateOperator("norm", "equ", "rev")).toBe(false);
  });

  it("handles booleans", () => {
    expect(evaluateOperator(true, "equ", true)).toBe(true);
    expect(evaluateOperator(true, "equ", 1)).toBe(true);
    expect(evaluateOperator(false, "equ", 0)).toBe(true);
  });

  it("returns true for undefined operator", () => {
    expect(evaluateOperator(5, undefined, 3)).toBe(true);
  });
});

// =============================================================================
// Context Creation Tests
// =============================================================================

describe("createForEachContext", () => {
  const tree = createTree();
  const root = tree[0];

  it("creates context with defaults", () => {
    const context = createForEachContext(root, tree);

    expect(context.currentNode).toBe(root);
    expect(context.position).toBe(1);
    expect(context.count).toBe(1);
  });

  it("creates context with variables", () => {
    const vars = new Map<string, number>();
    vars.set("test", 42);
    const context = createForEachContext(root, tree, vars);

    expect(context.variables.get("test")).toBe(42);
  });
});

describe("createForEachChildContext", () => {
  const tree = createTree();
  const root = tree[0];

  it("creates child context with position", () => {
    const parent = createForEachContext(root, tree);
    const child = root.children[0];
    const context = createForEachChildContext(parent, child, 2, 5);

    expect(context.currentNode).toBe(child);
    expect(context.position).toBe(2);
    expect(context.count).toBe(5);
    expect(context.parent).toBe(parent);
  });

  it("inherits variables from parent", () => {
    const vars = new Map<string, number>();
    vars.set("inherited", 123);
    const parent = createForEachContext(root, tree, vars);
    const context = createForEachChildContext(parent, root.children[0], 1, 3);

    expect(context.variables.get("inherited")).toBe(123);
  });
});
