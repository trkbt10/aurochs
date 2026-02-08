/**
 * @file Angular gradient builder unit tests
 */

import { angularGradient } from "./angular-gradient";
import { PAINT_TYPE_VALUES } from "../../constants";

describe("AngularGradientBuilder", () => {
  it("creates angular gradient with rainbow defaults", () => {
    const result = angularGradient().build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.GRADIENT_ANGULAR, name: "GRADIENT_ANGULAR" });
    expect(result.gradientStops.length).toBeGreaterThan(2);
  });

  it("sets center position", () => {
    const result = angularGradient().center(0.3, 0.7).build();

    expect(result.gradientHandlePositions![0]).toEqual({ x: 0.3, y: 0.7 });
  });

  it("sets rotation", () => {
    const result = angularGradient().rotation(45).build();

    const rad = (45 * Math.PI) / 180;
    expect(result.gradientHandlePositions![1].x).toBeCloseTo(0.5 + Math.cos(rad) * 0.5);
  });
});
