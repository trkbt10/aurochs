/**
 * @file Tests for Text Rectangle Calculator
 *
 * @see ECMA-376 Part 1, Section 20.1.9.22 (rect - Shape Text Rectangle)
 */

import { calculateTextRect, isInsideTextRect, applyTextInsets } from "./text-rect";
import type {
  AdjustValue,
  CustomGeometry,
  GeometryGuide,
  PresetGeometry,
  TextRect,
} from "../shape";

describe("text-rect - ECMA-376 compliance", () => {
  describe("calculateTextRect - preset geometry (ECMA-376 20.1.9.18)", () => {
    it("returns full bounds for rect", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 50);

      expect(result.left).toBe(0);
      expect(result.top).toBe(0);
      expect(result.right).toBe(100);
      expect(result.bottom).toBe(50);
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
    });

    it("returns full bounds for ellipse", () => {
      const geom: PresetGeometry = { type: "preset", preset: "ellipse", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 80);

      expect(result.left).toBe(0);
      expect(result.right).toBe(100);
      expect(result.width).toBe(100);
    });

    it("returns inset bounds for triangle", () => {
      const geom: PresetGeometry = { type: "preset", preset: "triangle", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 100);

      // Triangle text is in the center area
      expect(result.left).toBeGreaterThan(0);
      expect(result.top).toBeGreaterThan(0);
      expect(result.right).toBeLessThan(100);
      expect(result.bottom).toBeLessThan(100);
    });

    it("returns inset bounds for star shapes", () => {
      const geom: PresetGeometry = { type: "preset", preset: "star5", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 100);

      // Star text is in the inner area
      expect(result.left).toBe(25);
      expect(result.top).toBe(25);
      expect(result.right).toBe(75);
      expect(result.bottom).toBe(75);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("returns inset bounds for callout shapes", () => {
      const geom: PresetGeometry = { type: "preset", preset: "wedgeRectCallout", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 100);

      // Callout text avoids the pointer area
      expect(result.left).toBeGreaterThan(0);
      expect(result.top).toBeGreaterThan(0);
      expect(result.bottom).toBeLessThan(100);
    });

    it("returns inset bounds for arrow shapes", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rightArrow", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 100);

      // Arrow text is in the main body
      expect(result.left).toBeGreaterThan(0);
      expect(result.right).toBeLessThan(100);
    });

    it("returns inset bounds for donut", () => {
      const geom: PresetGeometry = { type: "preset", preset: "donut", adjustValues: [] };
      const result = calculateTextRect(geom, 100, 100);

      // Donut text is in the center
      expect(result.left).toBe(30);
      expect(result.top).toBe(30);
      expect(result.right).toBe(70);
      expect(result.bottom).toBe(70);
    });
  });

  describe("calculateTextRect - custom geometry (ECMA-376 20.1.9.22)", () => {
    it("returns full bounds when no text rect defined", () => {
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
        textRect: undefined,
      };
      const result = calculateTextRect(geom, 100, 50);

      expect(result.left).toBe(0);
      expect(result.top).toBe(0);
      expect(result.right).toBe(100);
      expect(result.bottom).toBe(50);
    });

    it("resolves text rect with literal coordinates", () => {
      const textRect: TextRect = {
        left: "10",
        top: "5",
        right: "90",
        bottom: "45",
      };
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
        textRect,
      };
      const result = calculateTextRect(geom, 100, 50);

      expect(result.left).toBe(10);
      expect(result.top).toBe(5);
      expect(result.right).toBe(90);
      expect(result.bottom).toBe(45);
      expect(result.width).toBe(80);
      expect(result.height).toBe(40);
    });

    it("resolves text rect with guide references", () => {
      const guides: GeometryGuide[] = [
        { name: "g1", formula: "*/ w 1 4" }, // 25 (w/4)
        { name: "g2", formula: "*/ h 1 4" }, // 25 (h/4)
        { name: "g3", formula: "*/ w 3 4" }, // 75 (3w/4)
        { name: "g4", formula: "*/ h 3 4" }, // 75 (3h/4)
      ];
      const textRect: TextRect = {
        left: "g1",
        top: "g2",
        right: "g3",
        bottom: "g4",
      };
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides,
        connectionSites: [],
        textRect,
      };
      const result = calculateTextRect(geom, 100, 100);

      expect(result.left).toBe(25);
      expect(result.top).toBe(25);
      expect(result.right).toBe(75);
      expect(result.bottom).toBe(75);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("resolves text rect with built-in variables", () => {
      const textRect: TextRect = {
        left: "0",
        top: "0",
        right: "w", // Full width
        bottom: "vc", // Half height (vertical center)
      };
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
        textRect,
      };
      const result = calculateTextRect(geom, 100, 80);

      expect(result.left).toBe(0);
      expect(result.top).toBe(0);
      expect(result.right).toBe(100); // w = 100
      expect(result.bottom).toBe(40); // vc = h/2 = 40
      expect(result.height).toBe(40);
    });

    it("handles mixed literal and guide values", () => {
      const textRect: TextRect = {
        left: "10", // Literal
        top: "0", // Literal
        right: "hc", // Guide (horizontal center = w/2)
        bottom: "h", // Built-in (height)
      };
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
        textRect,
      };
      const result = calculateTextRect(geom, 100, 50);

      expect(result.left).toBe(10);
      expect(result.top).toBe(0);
      expect(result.right).toBe(50); // hc = 100/2
      expect(result.bottom).toBe(50); // h = 50
    });

    it("resolves with adjust values", () => {
      const adjustValues: AdjustValue[] = [
        { name: "adj", value: 20000 }, // 20% inset in EMU-style units
      ];
      const guides: GeometryGuide[] = [
        { name: "inset", formula: "*/ w adj 100000" }, // w * adj / 100000
      ];
      const textRect: TextRect = {
        left: "inset",
        top: "0",
        right: "w",
        bottom: "h",
      };
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues,
        adjustHandles: [],
        guides,
        connectionSites: [],
        textRect,
      };
      const result = calculateTextRect(geom, 100, 50);

      expect(result.left).toBe(20); // 100 * 20000 / 100000 = 20
    });
  });

  describe("calculateTextRect - edge cases", () => {
    it("returns full bounds when geometry is undefined", () => {
      const result = calculateTextRect(undefined, 100, 50);

      expect(result.left).toBe(0);
      expect(result.top).toBe(0);
      expect(result.right).toBe(100);
      expect(result.bottom).toBe(50);
    });

    it("handles zero-size shapes", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };
      const result = calculateTextRect(geom, 0, 0);

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("clamps negative dimensions to zero", () => {
      const textRect: TextRect = {
        left: "90",
        top: "40",
        right: "10", // Left > right = negative width
        bottom: "10", // Top > bottom = negative height
      };
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
        textRect,
      };
      const result = calculateTextRect(geom, 100, 50);

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });

  describe("isInsideTextRect", () => {
    it("returns true for points inside", () => {
      const textRect = calculateTextRect(undefined, 100, 50);

      expect(isInsideTextRect(textRect, 50, 25)).toBe(true);
      expect(isInsideTextRect(textRect, 0, 0)).toBe(true);
      expect(isInsideTextRect(textRect, 100, 50)).toBe(true);
    });

    it("returns false for points outside", () => {
      const textRect = calculateTextRect(undefined, 100, 50);

      expect(isInsideTextRect(textRect, -1, 25)).toBe(false);
      expect(isInsideTextRect(textRect, 101, 25)).toBe(false);
      expect(isInsideTextRect(textRect, 50, -1)).toBe(false);
      expect(isInsideTextRect(textRect, 50, 51)).toBe(false);
    });
  });

  describe("applyTextInsets (ECMA-376 21.1.2.1.2 bodyPr)", () => {
    it("applies insets to text rect", () => {
      const textRect = calculateTextRect(undefined, 100, 50);
      const result = applyTextInsets(textRect, 10, 10, 5, 5);

      expect(result.left).toBe(10);
      expect(result.top).toBe(5);
      expect(result.right).toBe(90);
      expect(result.bottom).toBe(45);
      expect(result.width).toBe(80);
      expect(result.height).toBe(40);
    });

    it("handles asymmetric insets", () => {
      const textRect = calculateTextRect(undefined, 100, 100);
      const result = applyTextInsets(textRect, 5, 15, 10, 20);

      expect(result.left).toBe(5);
      expect(result.top).toBe(10);
      expect(result.right).toBe(85); // 100 - 15
      expect(result.bottom).toBe(80); // 100 - 20
    });

    it("clamps to zero when insets exceed dimensions", () => {
      const textRect = calculateTextRect(undefined, 100, 50);
      const result = applyTextInsets(textRect, 60, 60, 30, 30);

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("uses default zero insets", () => {
      const textRect = calculateTextRect(undefined, 100, 50);
      const result = applyTextInsets(textRect);

      expect(result.left).toBe(0);
      expect(result.top).toBe(0);
      expect(result.right).toBe(100);
      expect(result.bottom).toBe(50);
    });
  });
});
