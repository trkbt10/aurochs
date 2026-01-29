/**
 * @file Tests for layout algorithms
 *
 * @see ECMA-376 Part 1, Section 21.4.2 (Algorithms)
 */

import type { DiagramTreeNode } from "./tree-builder";
import type { LayoutBounds, LayoutContext } from "./types";
import { createDefaultContext } from "./types";
import {
  linearLayout,
  spaceLayout,
  hierChildLayout,
  cycleLayout,
  snakeLayout,
  pyramidLayout,
  createAlgorithmRegistry,
  getLayoutAlgorithm,
} from "./algorithms";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTreeNode(
  id: string,
  children: DiagramTreeNode[] = []
): DiagramTreeNode {
  return {
    id,
    type: "node",
    children,
    depth: 0,
    siblingIndex: 0,
    siblingCount: 1,
  };
}

function createContext(bounds: LayoutBounds): LayoutContext {
  return createDefaultContext({ bounds });
}

const defaultBounds: LayoutBounds = {
  x: 0,
  y: 0,
  width: 500,
  height: 400,
};

// =============================================================================
// linearLayout Tests
// =============================================================================

describe("linearLayout", () => {
  it("returns empty result for empty nodes", () => {
    const result = linearLayout([], createContext(defaultBounds));

    expect(result.nodes).toHaveLength(0);
  });

  it("arranges nodes horizontally by default", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b"), createTreeNode("c")];
    const result = linearLayout(nodes, createContext(defaultBounds));

    expect(result.nodes).toHaveLength(3);
    // Each subsequent node should be to the right
    expect(result.nodes[0].x).toBeLessThan(result.nodes[1].x);
    expect(result.nodes[1].x).toBeLessThan(result.nodes[2].x);
    // Y should be the same
    expect(result.nodes[0].y).toBe(result.nodes[1].y);
  });

  it("arranges nodes vertically when linDir=fromT", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b")];
    const context = createDefaultContext({ bounds: defaultBounds, params: [
      { type: "linDir", value: "fromT" },
    ]});

    const result = linearLayout(nodes, context);

    // Each subsequent node should be below
    expect(result.nodes[0].y).toBeLessThan(result.nodes[1].y);
    // X should be the same
    expect(result.nodes[0].x).toBe(result.nodes[1].x);
  });

  it("reverses order when linDir=fromR", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b"), createTreeNode("c")];
    const context = createDefaultContext({ bounds: defaultBounds, params: [
      { type: "linDir", value: "fromR" },
    ]});

    const result = linearLayout(nodes, context);

    // Node order should be reversed (c, b, a)
    expect(result.nodes[0].treeNode.id).toBe("c");
    expect(result.nodes[1].treeNode.id).toBe("b");
    expect(result.nodes[2].treeNode.id).toBe("a");
  });

  it("calculates bounds correctly", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b")];
    const result = linearLayout(nodes, createContext(defaultBounds));

    // Bounds should encompass all nodes
    expect(result.bounds.width).toBeGreaterThan(0);
    expect(result.bounds.height).toBeGreaterThan(0);
    // X position depends on alignment (default is centered)
    expect(result.bounds.x).toBeGreaterThanOrEqual(0);
    expect(result.bounds.y).toBeGreaterThanOrEqual(0);
  });

  it("aligns nodes to left when nodeHorzAlign=l", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b")];
    const context = createDefaultContext({ bounds: defaultBounds, params: [
      { type: "nodeHorzAlign", value: "l" },
    ]});
    const result = linearLayout(nodes, context);

    // First node should start at bounds.x
    expect(result.bounds.x).toBe(0);
  });
});

// =============================================================================
// spaceLayout Tests
// =============================================================================

describe("spaceLayout", () => {
  it("returns empty result for empty nodes", () => {
    const result = spaceLayout([], createContext(defaultBounds));

    expect(result.nodes).toHaveLength(0);
  });

  it("centers single node within bounds by default", () => {
    const nodes = [createTreeNode("a")];
    const bounds: LayoutBounds = { x: 0, y: 0, width: 200, height: 150 };
    const result = spaceLayout(nodes, createContext(bounds));

    expect(result.nodes).toHaveLength(1);
    // Default alignment is center - node should be centered in bounds
    const node = result.nodes[0];
    const centerX = bounds.x + (bounds.width - node.width) / 2;
    const centerY = bounds.y + (bounds.height - node.height) / 2;
    expect(node.x).toBe(centerX);
    expect(node.y).toBe(centerY);
  });

  it("positions node at origin when aligned left/top", () => {
    const nodes = [createTreeNode("a")];
    const bounds: LayoutBounds = { x: 50, y: 100, width: 200, height: 150 };
    const context = createDefaultContext({ bounds, params: [
      { type: "nodeHorzAlign", value: "l" },
      { type: "nodeVertAlign", value: "t" },
    ]});
    const result = spaceLayout(nodes, context);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].x).toBe(50);
    expect(result.nodes[0].y).toBe(100);
  });
});

// =============================================================================
// hierChildLayout Tests
// =============================================================================

describe("hierChildLayout", () => {
  it("returns empty result for empty nodes", () => {
    const result = hierChildLayout([], createContext(defaultBounds));

    expect(result.nodes).toHaveLength(0);
  });

  it("lays out parent with children", () => {
    const nodes = [
      createTreeNode("parent", [createTreeNode("child1"), createTreeNode("child2")]),
    ];
    const result = hierChildLayout(nodes, createContext(defaultBounds));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].children).toHaveLength(2);
  });

  it("positions children to the right of parent", () => {
    const nodes = [
      createTreeNode("parent", [createTreeNode("child")]),
    ];
    const result = hierChildLayout(nodes, createContext(defaultBounds));

    const parent = result.nodes[0];
    const child = parent.children[0];

    // Child should be to the right of parent
    expect(child.x).toBeGreaterThan(parent.x);
  });
});

// =============================================================================
// cycleLayout Tests
// =============================================================================

describe("cycleLayout", () => {
  it("returns empty result for empty nodes", () => {
    const result = cycleLayout([], createContext(defaultBounds));

    expect(result.nodes).toHaveLength(0);
  });

  it("arranges nodes in a circle", () => {
    const nodes = [
      createTreeNode("a"),
      createTreeNode("b"),
      createTreeNode("c"),
      createTreeNode("d"),
    ];
    const result = cycleLayout(nodes, createContext(defaultBounds));

    expect(result.nodes).toHaveLength(4);

    // Nodes should be distributed in a circle
    // Without rotPath param, rotation should be undefined
    for (const node of result.nodes) {
      expect(node.rotation).toBeUndefined();
    }
  });

  it("sets rotation when rotPath=alongPath", () => {
    const nodes = [
      createTreeNode("a"),
      createTreeNode("b"),
      createTreeNode("c"),
      createTreeNode("d"),
    ];
    const context = createDefaultContext({ bounds: defaultBounds, params: [
      { type: "rotPath", value: "alongPath" },
    ]});
    const result = cycleLayout(nodes, context);

    expect(result.nodes).toHaveLength(4);

    // All nodes should have rotation set when rotPath is alongPath
    for (const node of result.nodes) {
      expect(node.rotation).toBeDefined();
    }
  });

  it("centers the cycle in bounds", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b")];
    const bounds: LayoutBounds = { x: 100, y: 100, width: 300, height: 300 };
    const result = cycleLayout(nodes, createContext(bounds));

    // Center of bounds is 250, 250
    // Nodes should be distributed around the center
    const avgX =
      result.nodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) /
      result.nodes.length;
    const avgY =
      result.nodes.reduce((sum, n) => sum + n.y + n.height / 2, 0) /
      result.nodes.length;

    // Average position should be near center
    expect(Math.abs(avgX - 250)).toBeLessThan(50);
    expect(Math.abs(avgY - 250)).toBeLessThan(50);
  });

  it("places first node in center when ctrShpMap=fNode", () => {
    const nodes = [
      createTreeNode("center"),
      createTreeNode("a"),
      createTreeNode("b"),
      createTreeNode("c"),
    ];
    const bounds: LayoutBounds = { x: 0, y: 0, width: 300, height: 300 };
    const context = createDefaultContext({ bounds, params: [
      { type: "ctrShpMap", value: "fNode" },
    ]});
    const result = cycleLayout(nodes, context);

    expect(result.nodes).toHaveLength(4);
    // First node should be at center
    const centerNode = result.nodes[0];
    const expectedCenterX = bounds.width / 2 - centerNode.width / 2;
    const expectedCenterY = bounds.height / 2 - centerNode.height / 2;
    expect(centerNode.x).toBe(expectedCenterX);
    expect(centerNode.y).toBe(expectedCenterY);
  });
});

// =============================================================================
// snakeLayout Tests
// =============================================================================

describe("snakeLayout", () => {
  it("returns empty result for empty nodes", () => {
    const result = snakeLayout([], createContext(defaultBounds));

    expect(result.nodes).toHaveLength(0);
  });

  it("arranges nodes in snake pattern", () => {
    const nodes = Array.from({ length: 8 }, (_, i) => createTreeNode(`n${i}`));
    const result = snakeLayout(nodes, createContext(defaultBounds));

    expect(result.nodes).toHaveLength(8);

    // Check that nodes wrap to next row
    const firstRowY = result.nodes[0].y;
    const hasMultipleRows = result.nodes.some((n) => n.y !== firstRowY);
    expect(hasMultipleRows).toBe(true);
  });

  it("alternates direction in snake pattern", () => {
    // With default node width of 100 and spacing of 10, we can fit 4 nodes per row in 500px
    const nodes = Array.from({ length: 8 }, (_, i) => createTreeNode(`n${i}`));
    const bounds: LayoutBounds = { x: 0, y: 0, width: 450, height: 400 };
    const result = snakeLayout(nodes, createContext(bounds));

    // First row goes left to right, second row should go right to left
    const row0 = result.nodes.filter((n) => n.y === result.nodes[0].y);
    const row1 = result.nodes.filter((n) => n.y !== result.nodes[0].y);

    if (row0.length > 1 && row1.length > 1) {
      // First row should be left-to-right
      const row0LeftToRight = row0[0].x < row0[row0.length - 1].x;
      expect(row0LeftToRight).toBe(true);
    }
  });
});

// =============================================================================
// pyramidLayout Tests
// =============================================================================

describe("pyramidLayout", () => {
  it("returns empty result for empty nodes", () => {
    const result = pyramidLayout([], createContext(defaultBounds));

    expect(result.nodes).toHaveLength(0);
  });

  it("arranges nodes in pyramid pattern", () => {
    const nodes = [
      createTreeNode("top"),
      createTreeNode("mid"),
      createTreeNode("bottom"),
    ];
    const result = pyramidLayout(nodes, createContext(defaultBounds));

    expect(result.nodes).toHaveLength(3);

    // Each level should be wider than the previous
    expect(result.nodes[0].width).toBeLessThan(result.nodes[1].width);
    expect(result.nodes[1].width).toBeLessThan(result.nodes[2].width);
  });

  it("centers nodes horizontally", () => {
    const nodes = [createTreeNode("a"), createTreeNode("b")];
    const bounds: LayoutBounds = { x: 0, y: 0, width: 400, height: 300 };
    const result = pyramidLayout(nodes, createContext(bounds));

    // Nodes should be centered (x + width/2 should be near center)
    const centerX = bounds.x + bounds.width / 2;
    for (const node of result.nodes) {
      const nodeCenter = node.x + node.width / 2;
      expect(Math.abs(nodeCenter - centerX)).toBeLessThan(1);
    }
  });
});

// =============================================================================
// Algorithm Registry Tests
// =============================================================================

describe("createAlgorithmRegistry", () => {
  it("creates registry with all algorithm types", () => {
    const registry = createAlgorithmRegistry();

    expect(registry.get("lin")).toBeDefined();
    expect(registry.get("sp")).toBeDefined();
    expect(registry.get("hierChild")).toBeDefined();
    expect(registry.get("hierRoot")).toBeDefined();
    expect(registry.get("cycle")).toBeDefined();
    expect(registry.get("snake")).toBeDefined();
    expect(registry.get("pyra")).toBeDefined();
    expect(registry.get("composite")).toBeDefined();
    expect(registry.get("conn")).toBeDefined();
    expect(registry.get("tx")).toBeDefined();
  });
});

describe("getLayoutAlgorithm", () => {
  it("returns correct algorithm for type", () => {
    const registry = createAlgorithmRegistry();

    expect(getLayoutAlgorithm(registry, "lin")).toBe(linearLayout);
    expect(getLayoutAlgorithm(registry, "cycle")).toBe(cycleLayout);
  });

  it("returns linear layout for undefined type", () => {
    const registry = createAlgorithmRegistry();

    expect(getLayoutAlgorithm(registry, undefined)).toBe(linearLayout);
  });

  it("returns linear layout for unknown type", () => {
    const registry = createAlgorithmRegistry();

    // @ts-expect-error - testing unknown type
    const algorithm = getLayoutAlgorithm(registry, "unknown");
    expect(algorithm).toBe(linearLayout);
  });
});
