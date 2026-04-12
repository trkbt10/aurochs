/**
 * @file Diamond gradient builder unit tests
 */

import { diamondGradient } from "./diamond-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("DiamondGradientBuilder", () => {
  it("creates diamond gradient with defaults", () => {
    const result = diamondGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_DIAMOND, name: "GRADIENT_DIAMOND" });
    expect(result.stops).toHaveLength(2);
    expect(result.transform).toBeDefined();
  });

  it("sets center and size via transform", () => {
    const result = diamondGradient().center(0.5, 0.5).size(0.3).build();
    const t = result.transform;

    // center
    expect(t.m02).toBeCloseTo(0.5);
    expect(t.m12).toBeCloseTo(0.5);
    // x-axis: (0.5+0.3, 0.5) - (0.5, 0.5) = (0.3, 0)
    expect(t.m00).toBeCloseTo(0.3);
    expect(t.m10).toBeCloseTo(0);
    // y-axis: (0.5, 0.5+0.3) - (0.5, 0.5) = (0, 0.3)
    expect(t.m01).toBeCloseTo(0);
    expect(t.m11).toBeCloseTo(0.3);
  });
});
