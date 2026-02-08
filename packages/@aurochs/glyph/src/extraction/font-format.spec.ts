/**
 * @file Tests for font-family.ts
 *
 * Tests font family formatting for CSS font strings.
 */

import { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-format";

describe("font-family", () => {
  describe("GENERIC_FONT_FAMILIES", () => {
    it("should include all standard CSS generic font families", () => {
      expect(GENERIC_FONT_FAMILIES).toContain("serif");
      expect(GENERIC_FONT_FAMILIES).toContain("sans-serif");
      expect(GENERIC_FONT_FAMILIES).toContain("monospace");
      expect(GENERIC_FONT_FAMILIES).toContain("cursive");
      expect(GENERIC_FONT_FAMILIES).toContain("fantasy");
      expect(GENERIC_FONT_FAMILIES).toContain("system-ui");
    });
  });

  describe("formatFontFamily", () => {
    it("should return single unquoted font name as-is", () => {
      const result = formatFontFamily("Arial");
      expect(result).toBe("Arial");
    });

    it("should quote font names with spaces", () => {
      const result = formatFontFamily("Times New Roman");
      expect(result).toBe('"Times New Roman"');
    });

    it("should not quote generic font families", () => {
      const result = formatFontFamily("sans-serif");
      expect(result).toBe("sans-serif");
    });

    it("should handle comma-separated font families", () => {
      const result = formatFontFamily("Arial, Helvetica, sans-serif");
      expect(result).toBe("Arial, Helvetica, sans-serif");
    });

    it("should quote only font names with spaces in a list", () => {
      const result = formatFontFamily("Times New Roman, Arial, sans-serif");
      expect(result).toBe('"Times New Roman", Arial, sans-serif');
    });

    it("should remove existing quotes and re-add if needed", () => {
      const result = formatFontFamily('"Times New Roman"');
      expect(result).toBe('"Times New Roman"');
    });

    it("should handle single quotes and convert to double quotes", () => {
      const result = formatFontFamily("'Times New Roman'");
      expect(result).toBe('"Times New Roman"');
    });

    it("should filter out empty font names", () => {
      const result = formatFontFamily("Arial, , Helvetica");
      expect(result).toBe("Arial, Helvetica");
    });

    it("should trim whitespace around font names", () => {
      const result = formatFontFamily("  Arial  ,  Helvetica  ");
      expect(result).toBe("Arial, Helvetica");
    });

    it("should use custom generic families list", () => {
      const customGenerics = ["custom-generic"];
      const result = formatFontFamily("custom-generic, serif", customGenerics);
      expect(result).toBe("custom-generic, serif");
    });

    it("should handle empty string", () => {
      const result = formatFontFamily("");
      expect(result).toBe("");
    });

    it("should handle font name that looks like generic but is quoted", () => {
      const result = formatFontFamily('"serif"');
      expect(result).toBe("serif");
    });
  });
});
