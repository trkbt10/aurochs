/**
 * @file Unit tests for color transformation utilities
 *
 * Tests shade, tint, and other color modifications per ECMA-376/MS-ODRAWXML spec.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3.31 (shade)
 * @see ECMA-376 Part 1, Section 20.1.2.3.34 (tint)
 * @see MS-ODRAWXML Section 2.1.1410 (shade), 2.1.1432 (tint)
 */

import { describe, it, expect } from "vitest";
import {
  applyShade,
  applyTint,
  applyLumMod,
  applyLumOff,
  applySatMod,
  applyHueMod,
} from "./transform";

describe("applyShade - ECMA-376/MS-ODRAWXML compliance", () => {
  /**
   * Per MS-ODRAWXML 2.1.1410:
   * "shade specifies the shade value as a percentage...
   * A 10% shade is 10% of the input color combined with 90% black."
   *
   * Formula: newColor = inputColor * shadePercentage
   */

  describe("boundary values", () => {
    it("shade 100% returns original color", () => {
      expect(applyShade("FFFFFF", 1.0)).toBe("ffffff");
      expect(applyShade("FF0000", 1.0)).toBe("ff0000");
      expect(applyShade("EEECE1", 1.0)).toBe("eeece1");
    });

    it("shade 0% returns black", () => {
      expect(applyShade("FFFFFF", 0.0)).toBe("000000");
      expect(applyShade("FF0000", 0.0)).toBe("000000");
      expect(applyShade("EEECE1", 0.0)).toBe("000000");
    });
  });

  describe("intermediate values", () => {
    it("shade 50% halves RGB values", () => {
      // White (255, 255, 255) * 0.5 = (128, 128, 128) = 808080
      expect(applyShade("FFFFFF", 0.5)).toBe("808080");

      // Red (255, 0, 0) * 0.5 = (128, 0, 0) = 800000
      expect(applyShade("FF0000", 0.5)).toBe("800000");
    });

    it("shade 30% produces correct result for EEECE1 (bg2 theme color)", () => {
      // EEECE1 = (238, 236, 225)
      // * 0.3 = (71.4, 70.8, 67.5) = (71, 71, 68) = 474744
      expect(applyShade("EEECE1", 0.3)).toBe("474744");
    });

    it("shade 30% on F5F1DB (after satMod 200%)", () => {
      // F5F1DB = (245, 241, 219)
      // * 0.3 = (73.5, 72.3, 65.7) = (74, 72, 66) = 4a4842
      expect(applyShade("F5F1DB", 0.3)).toBe("4a4842");
    });
  });

  describe("handles input formats", () => {
    it("accepts lowercase hex", () => {
      expect(applyShade("ffffff", 0.5)).toBe("808080");
    });

    it("accepts with # prefix", () => {
      expect(applyShade("#FFFFFF", 0.5)).toBe("808080");
    });

    it("preserves alpha channel when isAlpha=true", () => {
      expect(applyShade("FFFFFF80", 0.5, true)).toBe("80808080");
    });
  });
});

describe("applyTint - ECMA-376/MS-ODRAWXML compliance", () => {
  /**
   * Per MS-ODRAWXML 2.1.1432:
   * "tint specifies the tint value as a percentage...
   * A 10% tint is 10% of the input color combined with 90% white."
   *
   * Formula: newColor = inputColor * tintPercentage + white * (1 - tintPercentage)
   *        = inputColor + (255 - inputColor) * (1 - tintPercentage)
   */

  describe("boundary values", () => {
    it("tint 100% returns original color", () => {
      expect(applyTint("000000", 1.0)).toBe("000000");
      expect(applyTint("FF0000", 1.0)).toBe("ff0000");
      expect(applyTint("EEECE1", 1.0)).toBe("eeece1");
    });

    it("tint 0% returns white", () => {
      expect(applyTint("000000", 0.0)).toBe("ffffff");
      expect(applyTint("FF0000", 0.0)).toBe("ffffff");
      expect(applyTint("EEECE1", 0.0)).toBe("ffffff");
    });
  });

  describe("intermediate values", () => {
    it("tint 50% moves halfway to white", () => {
      // Black (0, 0, 0) + (255-0) * 0.5 = (128, 128, 128) = 808080
      expect(applyTint("000000", 0.5)).toBe("808080");

      // Red (255, 0, 0) + (255-255, 255-0, 255-0) * 0.5 = (255, 128, 128) = FF8080
      expect(applyTint("FF0000", 0.5)).toBe("ff8080");
    });

    it("tint 80% on EEECE1 (bg2 theme color)", () => {
      // EEECE1 = (238, 236, 225)
      // + (255-238, 255-236, 255-225) * 0.2
      // = (238 + 3.4, 236 + 3.8, 225 + 6) = (241, 240, 231)
      // = F1F0E7
      expect(applyTint("EEECE1", 0.8)).toBe("f1f0e7");
    });
  });

  describe("handles input formats", () => {
    it("accepts lowercase hex", () => {
      expect(applyTint("000000", 0.5)).toBe("808080");
    });

    it("accepts with # prefix", () => {
      expect(applyTint("#000000", 0.5)).toBe("808080");
    });

    it("preserves alpha channel when isAlpha=true", () => {
      expect(applyTint("00000080", 0.5, true)).toBe("80808080");
    });
  });
});

describe("applySatMod - saturation modification", () => {
  it("satMod 200% doubles saturation", () => {
    // EEECE1 in HSL: H≈43°, S≈27%, L≈91%
    // After satMod 200%: S=54%, L=91%
    // Back to RGB: approximately F5F1DB
    const result = applySatMod("EEECE1", 2.0);
    // Allow some tolerance due to HSL conversion rounding
    expect(result.toLowerCase()).toMatch(/^f[0-9a-f]f[0-9a-f][d-e][0-9a-f]$/);
  });

  it("satMod 100% returns original color", () => {
    const result = applySatMod("FF0000", 1.0);
    expect(result.toLowerCase()).toBe("ff0000");
  });

  it("satMod 0% removes all saturation (grayscale)", () => {
    const result = applySatMod("FF0000", 0.0);
    // Pure red becomes gray (based on luminance)
    expect(result).toMatch(/^[0-9a-f]{6}$/);
    // Should be grayscale (R=G=B)
    const r = parseInt(result.slice(0, 2), 16);
    const g = parseInt(result.slice(2, 4), 16);
    const b = parseInt(result.slice(4, 6), 16);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });
});

describe("combined transformations - real world scenario", () => {
  /**
   * Theme gradient edge color calculation:
   * Base: bg2 = EEECE1
   * Transforms: satMod 200%, then shade 30%
   */

  it("satMod 200% then shade 30% on EEECE1 produces gray edge color", () => {
    // Step 1: satMod 200%
    const afterSatMod = applySatMod("EEECE1", 2.0);
    console.log("After satMod 200%:", afterSatMod);

    // Step 2: shade 30%
    const afterShade = applyShade(afterSatMod, 0.3);
    console.log("After shade 30%:", afterShade);

    // The result should be a neutral gray/taupe color, not olive/brown
    // Expected approximately: 4a4842 or similar neutral gray
    const r = parseInt(afterShade.slice(0, 2), 16);
    const g = parseInt(afterShade.slice(2, 4), 16);
    const b = parseInt(afterShade.slice(4, 6), 16);

    // Check it's a neutral color (R, G, B should be close to each other)
    expect(Math.abs(r - g)).toBeLessThan(15);
    expect(Math.abs(g - b)).toBeLessThan(15);
    expect(Math.abs(r - b)).toBeLessThan(20);

    // Check it's dark (shaded)
    expect(r).toBeLessThan(100);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(100);
  });
});
