/**
 * @file Tests for Shape Guide Formula Engine
 *
 * Tests all 17 ECMA-376 guide formula types and context initialization.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.11 (gd - Shape Guide)
 */

import {
  createGuideContext,
  evaluateGuides,
  evaluateExpression,
  angleUnitsToDegrees,
  degreesToAngleUnits,
  normalizeAngle,
} from "./guide-engine";
import type { GeometryGuide, AdjustValue } from "../shape";

describe("guide-engine - ECMA-376 compliance", () => {
  describe("createGuideContext - built-in variables (ECMA-376 20.1.10.56)", () => {
    it("initializes shape dimension variables", () => {
      const ctx = createGuideContext(1000, 500);
      expect(ctx.get("w")).toBe(1000);
      expect(ctx.get("h")).toBe(500);
    });

    it("initializes shortest/longest side variables", () => {
      const ctx = createGuideContext(1000, 500);
      expect(ctx.get("ss")).toBe(500); // min(1000, 500)
      expect(ctx.get("ls")).toBe(1000); // max(1000, 500)
    });

    it("initializes center variables", () => {
      const ctx = createGuideContext(1000, 500);
      expect(ctx.get("hc")).toBe(500); // w / 2
      expect(ctx.get("vc")).toBe(250); // h / 2
    });

    it("initializes width fraction variables", () => {
      const ctx = createGuideContext(1200, 600);
      expect(ctx.get("wd2")).toBe(600); // w / 2
      expect(ctx.get("wd3")).toBe(400); // w / 3
      expect(ctx.get("wd4")).toBe(300); // w / 4
      expect(ctx.get("wd6")).toBe(200); // w / 6
    });

    it("initializes height fraction variables", () => {
      const ctx = createGuideContext(800, 1200);
      expect(ctx.get("hd2")).toBe(600); // h / 2
      expect(ctx.get("hd3")).toBe(400); // h / 3
      expect(ctx.get("hd4")).toBe(300); // h / 4
    });

    it("initializes circle angle constants", () => {
      const ctx = createGuideContext(100, 100);
      expect(ctx.get("cd2")).toBe(10800000); // 180 degrees
      expect(ctx.get("cd4")).toBe(5400000); // 90 degrees
      expect(ctx.get("cd8")).toBe(2700000); // 45 degrees
      expect(ctx.get("3cd4")).toBe(16200000); // 270 degrees
    });

    it("initializes shortest side fraction variables", () => {
      const ctx = createGuideContext(1200, 800);
      expect(ctx.get("ssd2")).toBe(400); // ss / 2
      expect(ctx.get("ssd4")).toBe(200); // ss / 4
      expect(ctx.get("ssd8")).toBe(100); // ss / 8
      expect(ctx.get("ssd16")).toBe(50); // ss / 16
      expect(ctx.get("ssd32")).toBe(25); // ss / 32
    });

    it("initializes boundary variables", () => {
      const ctx = createGuideContext(1000, 500);
      expect(ctx.get("l")).toBe(0); // left
      expect(ctx.get("t")).toBe(0); // top
      expect(ctx.get("r")).toBe(1000); // right = width
      expect(ctx.get("b")).toBe(500); // bottom = height
    });

    it("includes adjust values in context", () => {
      const adjustValues: AdjustValue[] = [
        { name: "adj1", value: 50000 },
        { name: "adj2", value: 25000 },
      ];
      const ctx = createGuideContext(1000, 500, adjustValues);
      expect(ctx.get("adj1")).toBe(50000);
      expect(ctx.get("adj2")).toBe(25000);
    });
  });

  describe("evaluateGuides - formula evaluation (ECMA-376 20.1.9.11)", () => {
    describe("*/ (Multiply Divide)", () => {
      it("calculates (x * y) / z correctly", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "*/ w 1 2" }, // 1000 * 1 / 2 = 500
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(500);
      });

      it("handles division by zero", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "*/ w 1 0" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(0);
      });
    });

    describe("+- (Add Subtract)", () => {
      it("calculates (x + y) - z correctly", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "+- w h 100" }, // 1000 + 500 - 100 = 1400
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(1400);
      });
    });

    describe("+/ (Add Divide)", () => {
      it("calculates (x + y) / z correctly", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "+/ w h 2" }, // (1000 + 500) / 2 = 750
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(750);
      });
    });

    describe("?: (If Else)", () => {
      it("returns y when x > 0", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "?: 1 100 200" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(100);
      });

      it("returns z when x <= 0", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "?: 0 100 200" },
          { name: "g2", formula: "?: -1 100 200" },
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(200);
        expect(ctx.get("g2")).toBe(200);
      });
    });

    describe("abs (Absolute Value)", () => {
      it("returns absolute value", () => {
        const ctx = createGuideContext(1000, 500);
        ctx.set("neg", -500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "abs neg" },
          { name: "g2", formula: "abs h" },
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(500);
        expect(ctx.get("g2")).toBe(500);
      });
    });

    describe("at2 (ArcTan2)", () => {
      it("calculates atan2 in angle units", () => {
        const ctx = createGuideContext(1000, 1000);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "at2 1 1" }, // atan2(1, 1) = 45 degrees
        ];
        evaluateGuides(guides, ctx);
        // 45 degrees = 2700000 angle units
        expect(ctx.get("g1")).toBeCloseTo(2700000, -2);
      });
    });

    describe("cos (Cosine)", () => {
      it("calculates x * cos(y) where y is in angle units", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "cos 1000 0" }, // 1000 * cos(0) = 1000
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(1000, 5);
      });

      it("calculates cos(90 degrees) correctly", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "cos 1000 cd4" }, // 1000 * cos(90°) ≈ 0
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(0, 5);
      });
    });

    describe("sin (Sine)", () => {
      it("calculates x * sin(y) where y is in angle units", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "sin 1000 cd4" }, // 1000 * sin(90°) = 1000
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(1000, 5);
      });

      it("calculates sin(0) correctly", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "sin 1000 0" }, // 1000 * sin(0) = 0
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(0, 5);
      });
    });

    describe("tan (Tangent)", () => {
      it("calculates x * tan(y) where y is in angle units", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "tan 1000 2700000" }, // 1000 * tan(45°) = 1000
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(1000, 4);
      });
    });

    describe("max (Maximum)", () => {
      it("returns maximum of two values", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "max w h" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(1000);
      });
    });

    describe("min (Minimum)", () => {
      it("returns minimum of two values", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "min w h" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(500);
      });
    });

    describe("mod (Euclidean Norm)", () => {
      it("calculates sqrt(x² + y² + z²)", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "mod 3 4 0" }, // sqrt(9 + 16 + 0) = 5
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(5);
      });

      it("calculates 3D norm correctly", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "mod 1 2 2" }, // sqrt(1 + 4 + 4) = 3
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(3);
      });
    });

    describe("pin (Pin To Range)", () => {
      it("clamps value to range", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "pin 0 50 100" }, // 50 is in range
          { name: "g2", formula: "pin 0 -10 100" }, // -10 clamped to 0
          { name: "g3", formula: "pin 0 150 100" }, // 150 clamped to 100
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(50);
        expect(ctx.get("g2")).toBe(0);
        expect(ctx.get("g3")).toBe(100);
      });
    });

    describe("sqrt (Square Root)", () => {
      it("calculates square root", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "sqrt 100" },
          { name: "g2", formula: "sqrt 2" },
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(10);
        expect(ctx.get("g2")).toBeCloseTo(Math.SQRT2, 10);
      });

      it("returns 0 for negative input", () => {
        const ctx = createGuideContext(1000, 500);
        ctx.set("neg", -100);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "sqrt neg" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(0);
      });
    });

    describe("val (Literal Value)", () => {
      it("returns literal value", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "val 50000" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(50000);
      });

      it("resolves variable reference", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [{ name: "g1", formula: "val w" }];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(1000);
      });
    });

    describe("cat2 (Cosine ArcTan)", () => {
      it("calculates x * cos(atan2(z, y))", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "cat2 100 1 0" }, // 100 * cos(atan2(0, 1)) = 100 * cos(0) = 100
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(100, 5);
      });
    });

    describe("sat2 (Sine ArcTan)", () => {
      it("calculates x * sin(atan2(z, y))", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "sat2 100 1 1" }, // 100 * sin(atan2(1, 1)) = 100 * sin(45°) ≈ 70.71
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBeCloseTo(100 * Math.sin(Math.PI / 4), 5);
      });
    });

    describe("guide chaining", () => {
      it("allows later guides to reference earlier ones", () => {
        const ctx = createGuideContext(1000, 500);
        const guides: GeometryGuide[] = [
          { name: "g1", formula: "*/ w 1 2" }, // 500
          { name: "g2", formula: "+- g1 100 0" }, // 500 + 100 = 600
          { name: "g3", formula: "*/ g2 2 1" }, // 600 * 2 = 1200
        ];
        evaluateGuides(guides, ctx);
        expect(ctx.get("g1")).toBe(500);
        expect(ctx.get("g2")).toBe(600);
        expect(ctx.get("g3")).toBe(1200);
      });
    });
  });

  describe("evaluateExpression", () => {
    it("resolves simple variable references", () => {
      const ctx = createGuideContext(1000, 500);
      expect(evaluateExpression("w", ctx)).toBe(1000);
      expect(evaluateExpression("h", ctx)).toBe(500);
      expect(evaluateExpression("hc", ctx)).toBe(500);
    });

    it("resolves numeric literals", () => {
      const ctx = createGuideContext(1000, 500);
      expect(evaluateExpression("100", ctx)).toBe(100);
      expect(evaluateExpression("50000", ctx)).toBe(50000);
    });

    it("evaluates inline formulas", () => {
      const ctx = createGuideContext(1000, 500);
      expect(evaluateExpression("*/ w 1 2", ctx)).toBe(500);
      expect(evaluateExpression("+- w h 0", ctx)).toBe(1500);
    });

    it("throws on unknown variables", () => {
      const ctx = createGuideContext(1000, 500);
      expect(() => evaluateExpression("unknownVar", ctx))
        .toThrow("Non-ECMA guide variable: unknownVar");
    });

    it("throws on unknown operations", () => {
      const ctx = createGuideContext(1000, 500);
      expect(() => evaluateExpression("nope 1 2 3", ctx))
        .toThrow("Non-ECMA guide operation: nope");
    });
  });

  describe("angle conversion utilities", () => {
    it("converts angle units to degrees", () => {
      expect(angleUnitsToDegrees(5400000)).toBe(90);
      expect(angleUnitsToDegrees(10800000)).toBe(180);
      expect(angleUnitsToDegrees(21600000)).toBe(360);
    });

    it("converts degrees to angle units", () => {
      expect(degreesToAngleUnits(90)).toBe(5400000);
      expect(degreesToAngleUnits(180)).toBe(10800000);
      expect(degreesToAngleUnits(360)).toBe(21600000);
    });

    it("normalizes angles to 0-360 range", () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(21600000)).toBe(0); // 360° -> 0°
      expect(normalizeAngle(27000000)).toBe(5400000); // 450° -> 90°
      expect(normalizeAngle(-5400000)).toBe(16200000); // -90° -> 270°
    });
  });
});
