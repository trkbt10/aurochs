/**
 * @file Tests for node-geometry — focusing on absolute bounds computation.
 *
 * The getAbsoluteNodeBounds function is critical for drag/resize/rotate
 * correctness. The initialBounds stored in DragState must be in the same
 * coordinate space as the itemBounds passed to EditorCanvas (absolute
 * page coordinates).
 */

import { describe, it, expect } from "vitest";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import { getNodeBounds, getAbsoluteNodeBounds } from "./node-geometry";

// =============================================================================
// Test helpers
// =============================================================================

function makeTransform(x: number, y: number): FigMatrix {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function makeNode(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  children?: FigDesignNode[],
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "RECTANGLE" as FigDesignNode["type"],
    name: id,
    visible: true,
    opacity: 1,
    transform: makeTransform(x, y),
    size: { x: w, y: h },
    fills: [],
    strokes: [],
    strokeWeight: 1,
    effects: [],
    children,
  } as FigDesignNode;
}

// =============================================================================
// getNodeBounds (local)
// =============================================================================

describe("getNodeBounds", () => {
  it("returns local transform coordinates", () => {
    const node = makeNode("n", 20, 30, 100, 50);
    const b = getNodeBounds(node);
    expect(b.x).toBe(20);
    expect(b.y).toBe(30);
    expect(b.width).toBe(100);
    expect(b.height).toBe(50);
  });
});

// =============================================================================
// getAbsoluteNodeBounds
// =============================================================================

describe("getAbsoluteNodeBounds", () => {
  it("returns local coords for top-level node (same as getNodeBounds)", () => {
    const node = makeNode("top", 100, 50, 200, 100);
    const abs = getAbsoluteNodeBounds([node], "top" as FigNodeId);
    expect(abs).toBeDefined();
    expect(abs!.x).toBe(100);
    expect(abs!.y).toBe(50);
  });

  it("composes parent + child transforms", () => {
    const child = makeNode("child", 20, 30, 50, 25);
    const parent = makeNode("parent", 100, 50, 200, 100, [child]);
    const abs = getAbsoluteNodeBounds([parent], "child" as FigNodeId);
    expect(abs!.x).toBe(120);
    expect(abs!.y).toBe(80);
    expect(abs!.width).toBe(50);
    expect(abs!.height).toBe(25);
  });

  it("composes three levels of nesting", () => {
    const gc = makeNode("gc", 5, 10, 10, 10);
    const child = makeNode("child", 20, 30, 50, 30, [gc]);
    const parent = makeNode("parent", 100, 50, 200, 100, [child]);
    const abs = getAbsoluteNodeBounds([parent], "gc" as FigNodeId);
    expect(abs!.x).toBe(125); // 100 + 20 + 5
    expect(abs!.y).toBe(90);  // 50 + 30 + 10
  });

  it("returns undefined for non-existent node", () => {
    const node = makeNode("a", 0, 0, 100, 50);
    expect(getAbsoluteNodeBounds([node], "missing" as FigNodeId)).toBeUndefined();
  });

  it("critical invariant: absolute bounds differ from local bounds for nested nodes", () => {
    // This test documents the bug that was fixed. Before the fix, drag handlers
    // used getNodeBounds (local coords) for initialBounds, but EditorCanvas
    // displayed selection boxes at absolute coords. This caused the selection
    // box to jump when dragging started.
    const child = makeNode("child", 20, 30, 50, 25);
    const parent = makeNode("parent", 100, 50, 200, 100, [child]);

    const local = getNodeBounds(child);
    const absolute = getAbsoluteNodeBounds([parent], "child" as FigNodeId)!;

    // Local coords = relative to parent
    expect(local.x).toBe(20);
    expect(local.y).toBe(30);

    // Absolute coords = page-space
    expect(absolute.x).toBe(120);
    expect(absolute.y).toBe(80);

    // They must NOT be equal for nested nodes
    expect(absolute.x).not.toBe(local.x);
    expect(absolute.y).not.toBe(local.y);
  });
});
