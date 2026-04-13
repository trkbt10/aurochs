/**
 * @file Tests for bounds computation and flattened hit-area generation.
 *
 * Covers the key interaction scenarios:
 * 1. Flat (top-level) node bounds computation
 * 2. Nested node absolute bounds (transform composition)
 * 3. Tree flattening for hit-area generation (z-order correctness)
 * 4. Absolute bounds lookup for drag handler coordinate alignment
 */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import {
  getNodeBoundsForCanvas,
  getPageNodeBounds,
  flattenAllNodeBounds,
  computeAbsoluteTransform,
  computeAbsoluteNodeBounds,
} from "./bounds";

// =============================================================================
// Test helpers
// =============================================================================

function makeTransform(x: number, y: number, rotation = 0): FigMatrix {
  if (rotation === 0) {
    return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
  }
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { m00: cos, m01: -sin, m02: x, m10: sin, m11: cos, m12: y };
}

function makeNode(
  id: string,
  opts: {
    type?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    rotation?: number;
    visible?: boolean;
    children?: FigDesignNode[];
  } = {},
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: (opts.type ?? "RECTANGLE") as FigDesignNode["type"],
    name: id,
    visible: opts.visible ?? true,
    opacity: 1,
    transform: makeTransform(opts.x ?? 0, opts.y ?? 0, opts.rotation),
    size: { x: opts.w ?? 100, y: opts.h ?? 50 },
    fills: [],
    strokes: [],
    strokeWeight: 1,
    effects: [],
    children: opts.children,
  } as FigDesignNode;
}

// =============================================================================
// Scenario 1: Top-level bounds
// =============================================================================

describe("getNodeBoundsForCanvas", () => {
  it("returns position from transform and size from node", () => {
    const node = makeNode("rect1", { x: 100, y: 200, w: 300, h: 150 });
    const bounds = getNodeBoundsForCanvas(node);
    expect(bounds).toEqual({
      id: "rect1",
      x: 100,
      y: 200,
      width: 300,
      height: 150,
      rotation: 0,
    });
  });

  it("extracts rotation from transform matrix", () => {
    const node = makeNode("rotated", { x: 50, y: 50, w: 100, h: 100, rotation: 45 });
    const bounds = getNodeBoundsForCanvas(node);
    expect(bounds.rotation).toBeCloseTo(45, 5);
  });
});

describe("getPageNodeBounds", () => {
  it("returns bounds for all top-level nodes", () => {
    const nodes = [
      makeNode("a", { x: 0, y: 0, w: 100, h: 50 }),
      makeNode("b", { x: 200, y: 100, w: 150, h: 75 }),
    ];
    const result = getPageNodeBounds(nodes);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("b");
  });
});

// =============================================================================
// Scenario 2: Nested node absolute bounds
// =============================================================================

describe("computeAbsoluteTransform", () => {
  it("returns own transform for top-level node", () => {
    const nodes = [makeNode("top", { x: 100, y: 50 })];
    const abs = computeAbsoluteTransform(nodes, "top" as FigNodeId);
    expect(abs).toBeDefined();
    expect(abs!.m02).toBe(100);
    expect(abs!.m12).toBe(50);
  });

  it("composes parent + child transforms for nested node", () => {
    const child = makeNode("child", { x: 20, y: 30, w: 50, h: 25 });
    const parent = makeNode("parent", { x: 100, y: 50, w: 200, h: 100, children: [child] });
    const nodes = [parent];

    const abs = computeAbsoluteTransform(nodes, "child" as FigNodeId);
    expect(abs).toBeDefined();
    // Absolute position = parent(100,50) + child(20,30) = (120, 80)
    expect(abs!.m02).toBe(120);
    expect(abs!.m12).toBe(80);
  });

  it("composes three levels of nesting", () => {
    const grandchild = makeNode("gc", { x: 5, y: 10 });
    const child = makeNode("child", { x: 20, y: 30, children: [grandchild] });
    const parent = makeNode("parent", { x: 100, y: 50, children: [child] });
    const nodes = [parent];

    const abs = computeAbsoluteTransform(nodes, "gc" as FigNodeId);
    expect(abs).toBeDefined();
    // 100+20+5 = 125, 50+30+10 = 90
    expect(abs!.m02).toBe(125);
    expect(abs!.m12).toBe(90);
  });

  it("handles rotated parent correctly", () => {
    // Parent at (100,50) rotated 90 degrees
    const child = makeNode("child", { x: 20, y: 0, w: 50, h: 25 });
    const parent = makeNode("parent", { x: 100, y: 50, w: 200, h: 100, rotation: 90, children: [child] });
    const nodes = [parent];

    const abs = computeAbsoluteTransform(nodes, "child" as FigNodeId);
    expect(abs).toBeDefined();
    // With 90° rotation, child's local x=20 maps to parent's y-axis
    // x_abs = 100 + cos(90)*20 - sin(90)*0 = 100 + 0 - 0 = 100
    // y_abs = 50 + sin(90)*20 + cos(90)*0 = 50 + 20 + 0 = 70
    expect(abs!.m02).toBeCloseTo(100, 5);
    expect(abs!.m12).toBeCloseTo(70, 5);
  });

  it("returns undefined for non-existent node", () => {
    const nodes = [makeNode("a", { x: 0, y: 0 })];
    expect(computeAbsoluteTransform(nodes, "missing" as FigNodeId)).toBeUndefined();
  });
});

describe("computeAbsoluteNodeBounds", () => {
  it("returns absolute bounds for nested node", () => {
    const child = makeNode("child", { x: 20, y: 30, w: 50, h: 25 });
    const parent = makeNode("parent", { x: 100, y: 50, w: 200, h: 100, children: [child] });
    const nodes = [parent];

    const bounds = computeAbsoluteNodeBounds(nodes, "child" as FigNodeId);
    expect(bounds).toBeDefined();
    expect(bounds!.x).toBe(120);
    expect(bounds!.y).toBe(80);
    expect(bounds!.width).toBe(50);
    expect(bounds!.height).toBe(25);
  });
});

// =============================================================================
// Scenario 3: Flattened bounds for hit-area generation
// =============================================================================

describe("flattenAllNodeBounds", () => {
  it("includes all visible nodes in pre-order", () => {
    const child1 = makeNode("c1", { x: 10, y: 10, w: 30, h: 20 });
    const child2 = makeNode("c2", { x: 50, y: 10, w: 30, h: 20 });
    const frame = makeNode("frame", { x: 100, y: 50, w: 200, h: 100, type: "FRAME", children: [child1, child2] });
    const solo = makeNode("solo", { x: 400, y: 0, w: 80, h: 40 });

    const result = flattenAllNodeBounds([frame, solo]);

    // Pre-order: frame, c1, c2, solo
    expect(result.map((b) => b.id)).toEqual(["frame", "c1", "c2", "solo"]);
  });

  it("children have absolute coordinates", () => {
    const child = makeNode("child", { x: 20, y: 30, w: 50, h: 25 });
    const parent = makeNode("parent", { x: 100, y: 50, w: 200, h: 100, type: "FRAME", children: [child] });

    const result = flattenAllNodeBounds([parent]);

    const parentBounds = result.find((b) => b.id === "parent")!;
    const childBounds = result.find((b) => b.id === "child")!;

    expect(parentBounds.x).toBe(100);
    expect(parentBounds.y).toBe(50);
    expect(childBounds.x).toBe(120); // 100 + 20
    expect(childBounds.y).toBe(80);  // 50 + 30
  });

  it("children appear AFTER parents in the array (for correct z-order hit testing)", () => {
    const leaf = makeNode("leaf", { x: 0, y: 0 });
    const inner = makeNode("inner", { x: 0, y: 0, type: "GROUP", children: [leaf] });
    const outer = makeNode("outer", { x: 0, y: 0, type: "FRAME", children: [inner] });

    const result = flattenAllNodeBounds([outer]);
    const ids = result.map((b) => b.id);

    // Leaf must appear AFTER its ancestors
    expect(ids.indexOf("outer")).toBeLessThan(ids.indexOf("inner"));
    expect(ids.indexOf("inner")).toBeLessThan(ids.indexOf("leaf"));
  });

  it("skips invisible nodes and their children", () => {
    const visibleChild = makeNode("visible", { x: 10, y: 10 });
    const hiddenChild = makeNode("hidden", { x: 50, y: 10, visible: false, children: [makeNode("deep", { x: 0, y: 0 })] });
    const frame = makeNode("frame", { x: 0, y: 0, type: "FRAME", children: [visibleChild, hiddenChild] });

    const result = flattenAllNodeBounds([frame]);
    const ids = result.map((b) => b.id);

    expect(ids).toContain("frame");
    expect(ids).toContain("visible");
    expect(ids).not.toContain("hidden");
    expect(ids).not.toContain("deep");
  });

  it("handles deeply nested nodes (3 levels)", () => {
    const gc = makeNode("gc", { x: 5, y: 5, w: 10, h: 10 });
    const child = makeNode("child", { x: 20, y: 20, w: 50, h: 30, type: "GROUP", children: [gc] });
    const frame = makeNode("frame", { x: 100, y: 100, w: 200, h: 150, type: "FRAME", children: [child] });

    const result = flattenAllNodeBounds([frame]);
    const gcBounds = result.find((b) => b.id === "gc")!;

    // gc absolute: 100 + 20 + 5 = 125, 100 + 20 + 5 = 125
    expect(gcBounds.x).toBe(125);
    expect(gcBounds.y).toBe(125);
    expect(gcBounds.width).toBe(10);
    expect(gcBounds.height).toBe(10);
  });
});

// =============================================================================
// Scenario 4: Drag handler coordinate alignment
// =============================================================================

describe("drag coordinate alignment", () => {
  it("absolute bounds match flattened bounds for nested nodes", () => {
    // This is the critical invariant: the initialBounds used by drag handlers
    // (via getAbsoluteNodeBounds) must match the itemBounds passed to
    // EditorCanvas (via flattenAllNodeBounds). If they differ, the selection
    // box jumps during drag.

    const child = makeNode("child", { x: 20, y: 30, w: 50, h: 25 });
    const parent = makeNode("parent", { x: 100, y: 50, w: 200, h: 100, type: "FRAME", children: [child] });
    const nodes = [parent];

    // What EditorCanvas sees (hit area + selection box position)
    const flattened = flattenAllNodeBounds(nodes);
    const flattenedChild = flattened.find((b) => b.id === "child")!;

    // What drag handler uses for initialBounds
    const absoluteChild = computeAbsoluteNodeBounds(nodes, "child" as FigNodeId)!;

    expect(flattenedChild.x).toBe(absoluteChild.x);
    expect(flattenedChild.y).toBe(absoluteChild.y);
    expect(flattenedChild.width).toBe(absoluteChild.width);
    expect(flattenedChild.height).toBe(absoluteChild.height);
    expect(flattenedChild.rotation).toBe(absoluteChild.rotation);
  });

  it("absolute bounds match for deeply nested rotated nodes", () => {
    const gc = makeNode("gc", { x: 10, y: 5, w: 20, h: 15, rotation: 30 });
    const child = makeNode("child", { x: 50, y: 50, w: 100, h: 80, children: [gc] });
    const parent = makeNode("parent", { x: 200, y: 100, w: 300, h: 200, type: "FRAME", children: [child] });
    const nodes = [parent];

    const flattened = flattenAllNodeBounds(nodes);
    const flatGc = flattened.find((b) => b.id === "gc")!;

    const absGc = computeAbsoluteNodeBounds(nodes, "gc" as FigNodeId)!;

    expect(flatGc.x).toBeCloseTo(absGc.x, 10);
    expect(flatGc.y).toBeCloseTo(absGc.y, 10);
    expect(flatGc.width).toBe(absGc.width);
    expect(flatGc.height).toBe(absGc.height);
    expect(flatGc.rotation).toBeCloseTo(absGc.rotation, 10);
  });
});
