/**
 * @file Tests for Text Warp Geometry Transformation
 *
 * Tests type definitions and warp preset support.
 * Actual geometry transformation tests require WebGL environment.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.76 (ST_TextShapeType)
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */

import { isTextWarpSupported, getSupportedTextWarps } from "./text-warp";
import type { TextShapeType, TextWarp } from "@oxen-office/pptx/domain/text";

describe("Text Warp", () => {
  describe("isTextWarpSupported", () => {
    it("should return true for supported presets", () => {
      const supportedPresets: TextShapeType[] = [
        "textNoShape",
        "textPlain",
        "textArchUp",
        "textArchDown",
        "textCircle",
        "textWave1",
        "textWave2",
        "textInflate",
        "textDeflate",
        "textTriangle",
        "textChevron",
      ];

      for (const preset of supportedPresets) {
        expect(isTextWarpSupported(preset)).toBe(true);
      }
    });

    it("should return false for unsupported presets", () => {
      // Some complex presets that may not be implemented yet
      const unsupportedPresets: TextShapeType[] = [
        "textFadeLeft",
        "textFadeRight",
        "textSlantUp",
        "textSlantDown",
      ];

      for (const preset of unsupportedPresets) {
        expect(isTextWarpSupported(preset)).toBe(false);
      }
    });
  });

  describe("getSupportedTextWarps", () => {
    it("should return array of supported presets", () => {
      const supported = getSupportedTextWarps();

      expect(Array.isArray(supported)).toBe(true);
      expect(supported.length).toBeGreaterThan(10);
    });

    it("should include common warp types", () => {
      const supported = getSupportedTextWarps();

      expect(supported).toContain("textArchUp");
      expect(supported).toContain("textArchDown");
      expect(supported).toContain("textWave1");
      expect(supported).toContain("textCircle");
    });

    it("should include identity warps", () => {
      const supported = getSupportedTextWarps();

      expect(supported).toContain("textNoShape");
      expect(supported).toContain("textPlain");
    });
  });

  describe("TextWarp type", () => {
    it("should accept valid warp configuration", () => {
      const warp: TextWarp = {
        preset: "textArchUp",
        adjustValues: [],
      };

      expect(warp.preset).toBe("textArchUp");
      expect(warp.adjustValues).toEqual([]);
    });

    it("should accept adjust values", () => {
      const warp: TextWarp = {
        preset: "textWave1",
        adjustValues: [
          { name: "adj", value: 25000 },
        ],
      };

      expect(warp.adjustValues.length).toBe(1);
      expect(warp.adjustValues[0].name).toBe("adj");
      expect(warp.adjustValues[0].value).toBe(25000);
    });

    it("should accept multiple adjust values", () => {
      const warp: TextWarp = {
        preset: "textCircle",
        adjustValues: [
          { name: "adj1", value: 50000 },
          { name: "adj2", value: 25000 },
        ],
      };

      expect(warp.adjustValues.length).toBe(2);
    });
  });

  describe("ECMA-376 Compliance", () => {
    /**
     * ECMA-376 Part 1, Section 20.1.10.76 defines 42 text shape types.
     * Our implementation should cover the most common ones.
     */
    it("should cover major ECMA-376 text shape categories", () => {
      const supported = getSupportedTextWarps();

      // Basic
      expect(supported.filter((p) => p.startsWith("textNo") || p === "textPlain").length).toBeGreaterThan(0);

      // Arch
      expect(supported.filter((p) => p.startsWith("textArch")).length).toBeGreaterThan(0);

      // Wave
      expect(supported.filter((p) => p.includes("Wave")).length).toBeGreaterThan(0);

      // Geometric
      expect(supported.filter((p) => p.startsWith("textTriangle") || p.startsWith("textChevron")).length).toBeGreaterThan(0);

      // Inflate/Deflate
      expect(supported.filter((p) => p.includes("flate")).length).toBeGreaterThan(0);
    });

    /**
     * ECMA-376 adjust values use 1/100000 percentage units.
     * Our implementation should handle these correctly.
     */
    it("should support ECMA-376 adjust value format", () => {
      // ECMA-376 uses 0-100000 for percentages (1/1000%)
      const ecma376Value = 50000; // 50%

      const warp: TextWarp = {
        preset: "textArchUp",
        adjustValues: [
          { name: "adj", value: ecma376Value },
        ],
      };

      expect(warp.adjustValues[0].value).toBe(50000);
    });
  });

  describe("Warp Preset Coverage", () => {
    const allPresets: TextShapeType[] = [
      "textNoShape",
      "textPlain",
      "textStop",
      "textTriangle",
      "textTriangleInverted",
      "textChevron",
      "textChevronInverted",
      "textRingInside",
      "textRingOutside",
      "textArchUp",
      "textArchDown",
      "textCircle",
      "textButton",
      "textArchUpPour",
      "textArchDownPour",
      "textCirclePour",
      "textButtonPour",
      "textCurveUp",
      "textCurveDown",
      "textCanUp",
      "textCanDown",
      "textWave1",
      "textWave2",
      "textDoubleWave1",
      "textWave4",
      "textInflate",
      "textDeflate",
      "textInflateBottom",
      "textDeflateBottom",
      "textInflateTop",
      "textDeflateTop",
      "textDeflateInflate",
      "textDeflateInflateDeflate",
      "textFadeRight",
      "textFadeLeft",
      "textFadeUp",
      "textFadeDown",
      "textSlantUp",
      "textSlantDown",
      "textCascadeUp",
      "textCascadeDown",
    ];

    it("should have reasonable coverage of ECMA-376 presets", () => {
      const supported = getSupportedTextWarps();
      const coverage = supported.length / allPresets.length;

      // Should have at least 50% coverage
      expect(coverage).toBeGreaterThan(0.5);
    });

    it("should track unsupported presets", () => {
      const supported = new Set(getSupportedTextWarps());
      const unsupported = allPresets.filter((p) => !supported.has(p));

      // Log unsupported for tracking (these are expected)
      // console.log("Unsupported presets:", unsupported);

      // Just verify we can identify unsupported ones
      expect(unsupported.length).toBeLessThan(allPresets.length);
    });
  });
});
