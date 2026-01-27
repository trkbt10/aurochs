/**
 * @file Unit tests for shape/hierarchy.ts
 */

import { describe, expect, it } from "vitest";
import type { Shape, GrpShape, SpShape } from "@oxen/pptx/domain";
import { px, deg } from "@oxen/ooxml/domain/units";
import { moveShapeInHierarchy } from "./hierarchy";

const createShape = (id: string, x: number, y: number): SpShape => ({
  type: "sp",
  nonVisual: { id, name: `Shape ${id}` },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(40),
      height: px(30),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
  },
});

const createGroup = (id: string, x: number, y: number, children: Shape[]): GrpShape => ({
  type: "grpSp",
  nonVisual: { id, name: `Group ${id}` },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(200),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(200),
    },
  },
  children,
});

describe("moveShapeInHierarchy", () => {
  it("moves a top-level shape into a group and adjusts coordinates", () => {
    const shapeA = createShape("1", 150, 160);
    const group = createGroup("g1", 100, 100, []);
    const shapes: Shape[] = [shapeA, group];

    const result = moveShapeInHierarchy(shapes, "1", { parentId: "g1", index: 0 });

    expect(result).toBeDefined();
    const next = result as Shape[];
    const nextGroup = next.find((shape) => shape.type === "grpSp") as GrpShape;
    expect(nextGroup.children).toHaveLength(1);
    const moved = nextGroup.children[0] as SpShape;
    expect(moved.properties.transform?.x).toBe(50);
    expect(moved.properties.transform?.y).toBe(60);
  });

  it("moves a group child to top-level and restores slide coordinates", () => {
    const child = createShape("2", 50, 60);
    const group = createGroup("g1", 100, 100, [child]);
    const shapes: Shape[] = [group];

    const result = moveShapeInHierarchy(shapes, "2", { parentId: null, index: 0 });

    expect(result).toBeDefined();
    const next = result as Shape[];
    const moved = next.find((shape) => shape.type === "sp") as SpShape;
    expect(moved.properties.transform?.x).toBe(150);
    expect(moved.properties.transform?.y).toBe(160);
  });
});
