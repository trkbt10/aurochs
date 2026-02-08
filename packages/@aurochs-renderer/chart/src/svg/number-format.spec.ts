/**
 * @file Tests for number format utilities
 *
 * @see ECMA-376 Part 1, Section 18.8.31 (numFmt)
 */

import { formatNumber, formatAxisValue, formatDataValue } from "./number-format";

describe("formatNumber - ECMA-376 format codes", () => {
  describe("General format", () => {
    it("formats integers without decimals", () => {
      expect(formatNumber(42, "General")).toBe("42");
      expect(formatNumber(42, undefined)).toBe("42");
    });

    it("formats decimals with reasonable precision", () => {
      expect(formatNumber(42.5, "General")).toBe("42.5");
      expect(formatNumber(0.123, undefined)).toBe("0.12");
    });
  });

  describe("Number format (0 and #)", () => {
    it("formats with fixed decimals", () => {
      expect(formatNumber(42, "0.00")).toBe("42.00");
      expect(formatNumber(42.567, "0.00")).toBe("42.57");
    });

    it("formats with thousands separator", () => {
      expect(formatNumber(1234567, "#,##0")).toBe("1,234,567");
      expect(formatNumber(1234567.89, "#,##0.00")).toBe("1,234,567.89");
    });
  });

  describe("Percentage format", () => {
    it("formats as percentage", () => {
      expect(formatNumber(0.5, "0%")).toBe("50%");
      expect(formatNumber(0.1234, "0.00%")).toBe("12.34%");
    });
  });

  describe("Currency format", () => {
    it("formats with dollar sign", () => {
      expect(formatNumber(1234.56, "$#,##0.00")).toBe("$1,234.56");
    });

    it("formats with yen sign", () => {
      // ¥#,##0 has no decimal places specified, defaults to 0
      expect(formatNumber(1234, "¥#,##0.00")).toBe("¥1,234.00");
    });
  });

  describe("Scientific format", () => {
    it("formats in scientific notation", () => {
      expect(formatNumber(1234567, "0.00E+00")).toBe("1.23e+6");
    });
  });
});

describe("formatAxisValue - Smart abbreviation", () => {
  it("abbreviates billions", () => {
    expect(formatAxisValue(1500000000, undefined)).toBe("1.5B");
  });

  it("abbreviates millions", () => {
    expect(formatAxisValue(2500000, undefined)).toBe("2.5M");
  });

  it("abbreviates thousands", () => {
    expect(formatAxisValue(15000, undefined)).toBe("15k");
    expect(formatAxisValue(1500, undefined)).toBe("1.5k");
  });

  it("formats small numbers normally", () => {
    expect(formatAxisValue(42, undefined)).toBe("42");
    expect(formatAxisValue(42.5, undefined)).toBe("42.5");
  });

  it("uses format code when provided", () => {
    expect(formatAxisValue(0.5, "0%")).toBe("50%");
    expect(formatAxisValue(1234, "#,##0")).toBe("1,234");
  });
});

describe("formatDataValue - Data label formatting", () => {
  it("formats integers without decimals", () => {
    expect(formatDataValue(42, undefined)).toBe("42");
  });

  it("formats decimals with one decimal place", () => {
    expect(formatDataValue(42.567, undefined)).toBe("42.6");
  });

  it("uses format code when provided", () => {
    expect(formatDataValue(0.25, "0%")).toBe("25%");
    expect(formatDataValue(1234.5, "#,##0.00")).toBe("1,234.50");
  });
});
