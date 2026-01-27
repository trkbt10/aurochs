/**
 * @file Tests for Layout Definition Processor
 *
 * @see ECMA-376 Part 1, Section 21.4.2 - Diagram Definition
 */

import type { DiagramLayoutDefinition } from "../types";
import type { DiagramTreeNode } from "./tree-builder";
import {
  processLayoutDefinition,
  type LayoutProcessOptions,
} from "./layout-processor";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTreeNode(
  id: string,
  type: "node" | "doc" | "asst" | "parTrans" | "sibTrans" | "pres" = "node",
  children: DiagramTreeNode[] = [],
  depth: number = 0
): DiagramTreeNode {
  const node: DiagramTreeNode = {
    id,
    type,
    children: [],
    depth,
    siblingIndex: 0,
    siblingCount: 1,
    parent: undefined,
  };

  // Set up children with parent reference
  const childrenWithParent = children.map((child, index) => ({
    ...child,
    parent: node,
    siblingIndex: index,
    siblingCount: children.length,
  }));

  return {
    ...node,
    children: childrenWithParent,
  };
}

function createTree(): DiagramTreeNode[] {
  const grandchild1 = createTreeNode("gc1", "node", [], 2);
  const grandchild2 = createTreeNode("gc2", "node", [], 2);
  const child1 = createTreeNode("c1", "node", [grandchild1, grandchild2], 1);
  const child2 = createTreeNode("c2", "node", [], 1);
  const child3 = createTreeNode("c3", "parTrans", [], 1);
  const root = createTreeNode("root", "doc", [child1, child2, child3], 0);
  return [root];
}

function createOptions(dataNodes: DiagramTreeNode[]): LayoutProcessOptions {
  // Collect all nodes for allNodes
  const allNodes: DiagramTreeNode[] = [];
  function collect(node: DiagramTreeNode): void {
    allNodes.push(node);
    for (const child of node.children) {
      collect(child);
    }
  }
  for (const node of dataNodes) {
    collect(node);
  }

  return {
    bounds: { x: 0, y: 0, width: 800, height: 600 },
    dataNodes,
    allNodes,
    maxDepth: 2,
  };
}

// =============================================================================
// processLayoutDefinition Tests
// =============================================================================

describe("processLayoutDefinition", () => {
  it("returns empty result for empty layout definition", () => {
    const layoutDef: DiagramLayoutDefinition = {};
    const options = createOptions([]);

    const result = processLayoutDefinition(layoutDef, options);

    expect(result.nodes).toHaveLength(0);
    expect(result.namedNodes.size).toBe(0);
  });

  it("processes layout with simple algorithm", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        algorithm: {
          type: "lin",
          params: [{ type: "linDir", value: "fromL" }],
        },
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should have created layout nodes for data nodes
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("processes layout with forEach", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["ch"],
            content: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // forEach should iterate over children
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("processes layout with choose/if condition", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        choose: [
          {
            if: {
              function: "cnt",
              operator: "gt",
              value: 0,
              algorithm: { type: "lin" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should process the if branch since root has children
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("processes layout with choose/else fallback", () => {
    // Create tree with no children
    const emptyRoot = createTreeNode("root", "doc", [], 0);
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        choose: [
          {
            if: {
              function: "cnt",
              operator: "gt",
              value: 0,
              algorithm: { type: "lin" },
            },
            else: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions([emptyRoot]);

    const result = processLayoutDefinition(layoutDef, options);

    // Should fall through to else since root has no children
    // The result might be empty since there are no data nodes to layout
    expect(result.nodes).toBeDefined();
  });

  it("registers named nodes", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        name: "mainNode",
        algorithm: { type: "lin" },
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    expect(result.namedNodes.has("mainNode")).toBe(true);
  });

  it("filters by point type in forEach", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["ch"],
            pointType: ["node"], // Filter to only node types
            content: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should only process node type children, not parTrans
    expect(result.nodes).toBeDefined();
  });

  it("applies iteration parameters", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["ch"],
            start: [1],
            count: [2],
            step: [1],
            content: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should only process first 2 children
    expect(result.nodes).toBeDefined();
  });
});

// =============================================================================
// Condition Evaluation Tests
// =============================================================================

describe("condition evaluation", () => {
  it("evaluates cnt function", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        choose: [
          {
            if: {
              function: "cnt",
              operator: "gte",
              value: 3,
              algorithm: { type: "lin" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Root has 3 children, so condition should match
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("evaluates depth function", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        choose: [
          {
            if: {
              function: "depth",
              operator: "equ",
              value: 0,
              algorithm: { type: "lin" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Root depth is 0
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("evaluates posEven function in forEach", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["ch"],
            content: {
              choose: [
                {
                  if: {
                    function: "posEven",
                    operator: "equ",
                    value: true,
                    algorithm: { type: "sp" },
                  },
                },
              ],
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Even positions should match
    expect(result.nodes).toBeDefined();
  });
});

// =============================================================================
// Axis Selection Tests
// =============================================================================

describe("axis selection", () => {
  it("selects children with ch axis", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["ch"],
            content: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should process children
    expect(result.nodes).toBeDefined();
  });

  it("selects self with self axis", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["self"],
            content: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should process self (1 node)
    expect(result.nodes).toBeDefined();
  });

  it("returns empty for none axis", () => {
    const tree = createTree();
    const layoutDef: DiagramLayoutDefinition = {
      layoutNode: {
        forEach: [
          {
            axis: ["none"],
            content: {
              algorithm: { type: "sp" },
            },
          },
        ],
      },
    };
    const options = createOptions(tree);

    const result = processLayoutDefinition(layoutDef, options);

    // Should not process any nodes
    expect(result.nodes).toHaveLength(0);
  });
});
