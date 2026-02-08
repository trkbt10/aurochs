/**
 * @file Rectangle node builder unit tests
 */

import { rectNode } from "./rectangle";
import { SHAPE_NODE_TYPES } from "../../constants";

describe("RectangleNodeBuilder", () => {
  it("creates basic rectangle with defaults", () => {
    const result = rectNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.RECTANGLE);
    expect(result.localID).toBe(1);
    expect(result.parentID).toBe(0);
    expect(result.name).toBe("Rectangle");
    expect(result.size).toEqual({ x: 100, y: 100 });
    expect(result.fillPaints).toHaveLength(1);
    expect(result.visible).toBe(true);
    expect(result.opacity).toBe(1);
  });

  it("creates rectangle with custom properties", () => {
    const result = rectNode(2, 1)
      .name("My Rect")
      .size(200, 150)
      .position(10, 20)
      .fill({ r: 1, g: 0, b: 0, a: 1 })
      .build();

    expect(result.name).toBe("My Rect");
    expect(result.size).toEqual({ x: 200, y: 150 });
    expect(result.transform.m02).toBe(10);
    expect(result.transform.m12).toBe(20);
    expect(result.fillPaints[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("creates rectangle with stroke", () => {
    const result = rectNode(3, 1)
      .noFill()
      .stroke({ r: 0, g: 0, b: 1, a: 1 })
      .strokeWeight(2)
      .build();

    expect(result.fillPaints).toHaveLength(0);
    expect(result.strokePaints).toHaveLength(1);
    expect(result.strokePaints![0].color).toEqual({ r: 0, g: 0, b: 1, a: 1 });
    expect(result.strokeWeight).toBe(2);
  });

  it("applies rotation transform", () => {
    const result = rectNode(1, 0).rotation(45).build();

    const rad = (45 * Math.PI) / 180;
    expect(result.transform.m00).toBeCloseTo(Math.cos(rad));
    expect(result.transform.m01).toBeCloseTo(-Math.sin(rad));
    expect(result.transform.m10).toBeCloseTo(Math.sin(rad));
    expect(result.transform.m11).toBeCloseTo(Math.cos(rad));
  });
});
