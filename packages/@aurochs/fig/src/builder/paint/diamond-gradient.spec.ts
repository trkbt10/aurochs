/**
 * @file Diamond gradient builder unit tests
 */

import { diamondGradient } from "./diamond-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("DiamondGradientBuilder", () => {
  it("creates diamond gradient with defaults", () => {
    const result = diamondGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_DIAMOND, name: "GRADIENT_DIAMOND" });
    expect(result.gradientStops).toHaveLength(2);
    expect(result.gradientHandlePositions).toHaveLength(3);
  });

  it("sets center and size", () => {
    const result = diamondGradient().center(0.5, 0.5).size(0.3).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0.5, y: 0.5 });
    expect(result.gradientHandlePositions![1]).toEqual({ x: 0.8, y: 0.5 });
    expect(result.gradientHandlePositions![2]).toEqual({ x: 0.5, y: 0.8 });
  });
});
