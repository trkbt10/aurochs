/** @file Tests for canvas interaction target resolution. */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import { flattenAllNodeBounds } from "./bounds";
import { resolveCanvasInteractionTarget } from "./target-resolution";

function makeTransform(x: number, y: number): FigMatrix {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function makeNode(
  id: string,
  options: {
    readonly type?: FigDesignNode["type"];
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly children?: readonly FigDesignNode[];
    readonly editable?: boolean;
  },
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: options.type ?? "RECTANGLE",
    name: id,
    visible: true,
    opacity: 1,
    transform: makeTransform(options.x, options.y),
    size: { x: options.width, y: options.height },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children: options.children,
    vectorPaths: options.editable ? [{ windingRule: "NONZERO", data: "M 0 0 L 10 0 L 10 10 Z" }] : undefined,
  } as FigDesignNode;
}

describe("resolveCanvasInteractionTarget", () => {
  it("keeps the browser hit target for select mode", () => {
    const child = makeNode("child", { x: 20, y: 20, width: 40, height: 30, editable: true });
    const group = makeNode("group", { type: "GROUP", x: 100, y: 100, width: 140, height: 100, children: [child] });
    const bounds = flattenAllNodeBounds([group]);

    const result = resolveCanvasInteractionTarget({
      pageChildren: [group],
      itemBounds: bounds,
      point: { x: 125, y: 125 },
      hitNodeId: "group" as FigNodeId,
      mode: "select",
      canEditPath: (node) => Boolean(node?.vectorPaths),
    });

    expect(result).toBe("group");
  });

  it("resolves to the deepest editable descendant for path-edit mode", () => {
    const child = makeNode("child", { x: 20, y: 20, width: 40, height: 30, editable: true });
    const group = makeNode("group", { type: "GROUP", x: 100, y: 100, width: 140, height: 100, children: [child] });
    const bounds = flattenAllNodeBounds([group]);

    const result = resolveCanvasInteractionTarget({
      pageChildren: [group],
      itemBounds: bounds,
      point: { x: 125, y: 125 },
      hitNodeId: "group" as FigNodeId,
      mode: "path-edit",
      canEditPath: (node) => Boolean(node?.vectorPaths),
    });

    expect(result).toBe("child");
  });

  it("prefers the editable child when an imported frame also carries render vectorPaths", () => {
    const child = makeNode("child", { type: "VECTOR", x: 20, y: 20, width: 40, height: 30, editable: true });
    const frame = makeNode("frame", {
      type: "FRAME",
      x: 100,
      y: 100,
      width: 140,
      height: 100,
      children: [child],
      editable: true,
    });
    const bounds = flattenAllNodeBounds([frame]);

    const result = resolveCanvasInteractionTarget({
      pageChildren: [frame],
      itemBounds: bounds,
      point: { x: 125, y: 125 },
      hitNodeId: "frame" as FigNodeId,
      mode: "path-edit",
      canEditPath: (node) => node?.type === "VECTOR" && Boolean(node.vectorPaths),
    });

    expect(result).toBe("child");
  });
});
