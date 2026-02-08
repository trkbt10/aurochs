/**
 * @file Radial gradient builder unit tests
 */

import { radialGradient } from "./radial-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("RadialGradientBuilder", () => {
  it("creates radial gradient with defaults", () => {
    const result = radialGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_RADIAL, name: "GRADIENT_RADIAL" });
    expect(result.gradientStops).toHaveLength(2);
    expect(result.gradientHandlePositions).toHaveLength(3);
  });

  it("sets center position", () => {
    const result = radialGradient().center(0.25, 0.75).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0.25, y: 0.75 });
  });

  it("sets uniform radius", () => {
    const result = radialGradient().center(0.5, 0.5).radius(0.3).build();

    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.8);
    expect(result.gradientHandlePositions![2].y).toBeCloseTo(0.8);
  });

  it("sets elliptical radius", () => {
    const result = radialGradient().center(0.5, 0.5).ellipticalRadius(0.4, 0.2).build();

    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.9);
    expect(result.gradientHandlePositions![2].y).toBeCloseTo(0.7);
  });
});
