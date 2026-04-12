/**
 * @file Angular gradient builder unit tests
 */

import { angularGradient } from "./angular-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("AngularGradientBuilder", () => {
  it("creates angular gradient with rainbow defaults", () => {
    const result = angularGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_ANGULAR, name: "GRADIENT_ANGULAR" });
    expect(result.stops.length).toBeGreaterThan(2);
    expect(result.transform).toBeDefined();
  });

  it("sets center via transform", () => {
    const result = angularGradient().center(0.3, 0.7).build();

    expect(result.transform.m02).toBeCloseTo(0.3);
    expect(result.transform.m12).toBeCloseTo(0.7);
  });

  it("sets rotation via transform", () => {
    const result = angularGradient().rotation(45).build();

    const rad = (45 * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const radius = 0.5;

    // m00 = xAxisEnd.x - center.x = cos * radius
    expect(result.transform.m00).toBeCloseTo(cos * radius);
    // m10 = xAxisEnd.y - center.y = sin * radius
    expect(result.transform.m10).toBeCloseTo(sin * radius);
  });
});
