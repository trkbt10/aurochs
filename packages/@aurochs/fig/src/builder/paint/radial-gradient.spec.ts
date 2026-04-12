/**
 * @file Radial gradient builder unit tests
 */

import { radialGradient } from "./radial-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("RadialGradientBuilder", () => {
  it("creates radial gradient with defaults", () => {
    const result = radialGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_RADIAL, name: "GRADIENT_RADIAL" });
    expect(result.stops).toHaveLength(2);
    expect(result.transform).toBeDefined();
  });

  it("sets center position via transform", () => {
    const result = radialGradient().center(0.25, 0.75).build();

    expect(result.transform.m02).toBeCloseTo(0.25);
    expect(result.transform.m12).toBeCloseTo(0.75);
  });

  it("sets uniform radius via transform", () => {
    const result = radialGradient().center(0.5, 0.5).radius(0.3).build();

    expect(result.transform.m00).toBeCloseTo(0.3);
    expect(result.transform.m11).toBeCloseTo(0.3);
  });

  it("sets elliptical radius via transform", () => {
    const result = radialGradient().center(0.5, 0.5).ellipticalRadius(0.4, 0.2).build();

    expect(result.transform.m00).toBeCloseTo(0.4);
    expect(result.transform.m11).toBeCloseTo(0.2);
  });
});
