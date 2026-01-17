/**
 * @file Font name normalization tests
 *
 * Tests for normalizeFontFamily function.
 * Only PDF Standard 14 fonts (ISO 32000-1:2008 Section 9.6.2.2) are mapped.
 * All other fonts preserve their original names for @font-face matching.
 */
import { normalizeFontFamily } from "./font-name-map";

describe("normalizeFontFamily", () => {
  describe("basic normalization", () => {
    it("should remove leading slash (PDF name syntax)", () => {
      expect(normalizeFontFamily("/Helvetica")).toBe("Arial");
      expect(normalizeFontFamily("/CustomFont")).toBe("CustomFont");
    });

    it("should remove subset prefix (ISO 32000-1 Section 9.6.4)", () => {
      expect(normalizeFontFamily("ABCDEF+Helvetica")).toBe("Arial");
      expect(normalizeFontFamily("XYZABC+CustomFont")).toBe("CustomFont");
    });

    it("should handle combined transformations", () => {
      expect(normalizeFontFamily("/XYZABC+Helvetica")).toBe("Arial");
      expect(normalizeFontFamily("/XYZABC+CustomFont")).toBe("CustomFont");
    });
  });

  describe("PDF Standard 14 fonts (ISO 32000-1:2008 Section 9.6.2.2)", () => {
    it("should map Helvetica family to Arial", () => {
      expect(normalizeFontFamily("Helvetica")).toBe("Arial");
      expect(normalizeFontFamily("Helvetica-Bold")).toBe("Arial");
      expect(normalizeFontFamily("Helvetica-Oblique")).toBe("Arial");
      expect(normalizeFontFamily("Helvetica-BoldOblique")).toBe("Arial");
    });

    it("should map Times family to Times New Roman", () => {
      expect(normalizeFontFamily("Times-Roman")).toBe("Times New Roman");
      expect(normalizeFontFamily("Times-Bold")).toBe("Times New Roman");
      expect(normalizeFontFamily("Times-Italic")).toBe("Times New Roman");
      expect(normalizeFontFamily("Times-BoldItalic")).toBe("Times New Roman");
    });

    it("should map Courier family to Courier New", () => {
      expect(normalizeFontFamily("Courier")).toBe("Courier New");
      expect(normalizeFontFamily("Courier-Bold")).toBe("Courier New");
      expect(normalizeFontFamily("Courier-Oblique")).toBe("Courier New");
      expect(normalizeFontFamily("Courier-BoldOblique")).toBe("Courier New");
    });

    it("should map Symbol fonts", () => {
      expect(normalizeFontFamily("Symbol")).toBe("Symbol");
      expect(normalizeFontFamily("ZapfDingbats")).toBe("Wingdings");
    });
  });

  describe("non-standard fonts (preserved as-is)", () => {
    it("should preserve font names with hyphens", () => {
      // Non-standard fonts are not transformed
      expect(normalizeFontFamily("MS-Gothic")).toBe("MS-Gothic");
      expect(normalizeFontFamily("MS-PGothic")).toBe("MS-PGothic");
      expect(normalizeFontFamily("Hiragino-Sans")).toBe("Hiragino-Sans");
    });

    it("should preserve PostScript font names", () => {
      // PostScript variants are not in Standard 14
      expect(normalizeFontFamily("ArialMT")).toBe("ArialMT");
      expect(normalizeFontFamily("TimesNewRomanPSMT")).toBe("TimesNewRomanPSMT");
    });

    it("should preserve unknown font names exactly", () => {
      expect(normalizeFontFamily("CustomFont-Regular")).toBe("CustomFont-Regular");
      expect(normalizeFontFamily("MyFont")).toBe("MyFont");
    });

    it("should remove subset prefix but preserve non-standard font names", () => {
      expect(normalizeFontFamily("ABCDEF+MS-Gothic")).toBe("MS-Gothic");
      expect(normalizeFontFamily("XYZABC+CustomFont-Bold")).toBe("CustomFont-Bold");
    });
  });
});
