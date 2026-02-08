/**
 * @file Star node builder unit tests
 */

import { starNode } from "./star";
import { SHAPE_NODE_TYPES } from "../../constants";

describe("StarNodeBuilder", () => {
  it("creates basic 5-point star with defaults", () => {
    const result = starNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.STAR);
    expect(result.name).toBe("Star");
    expect(result.pointCount).toBe(5);
    expect(result.starInnerRadius).toBeCloseTo(0.382); // golden ratio
    expect(result.fillPaints).toHaveLength(1);
  });

  it("creates 8-point star with custom inner radius", () => {
    const result = starNode(2, 1)
      .name("8-Point Star")
      .points(8)
      .innerRadius(0.4)
      .size(120, 120)
      .fill({ r: 1, g: 1, b: 0, a: 1 }) // yellow
      .build();

    expect(result.name).toBe("8-Point Star");
    expect(result.pointCount).toBe(8);
    expect(result.starInnerRadius).toBe(0.4);
    expect(result.size).toEqual({ x: 120, y: 120 });
  });

  it("clamps point count to minimum 3", () => {
    const result = starNode(3, 1).points(1).build();
    expect(result.pointCount).toBe(3);
  });

  it("clamps inner radius to 0-1 range", () => {
    const result1 = starNode(4, 1).innerRadius(-0.5).build();
    expect(result1.starInnerRadius).toBe(0);

    const result2 = starNode(5, 1).innerRadius(1.5).build();
    expect(result2.starInnerRadius).toBe(1);
  });

  it("applies visibility and opacity", () => {
    const result = starNode(1, 0).visible(false).opacity(0.5).build();

    expect(result.visible).toBe(false);
    expect(result.opacity).toBe(0.5);
  });
});
