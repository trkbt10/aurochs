/**
 * @file Font scheme unit tests
 *
 * Tests for EMPTY_FONT_SCHEME constant and resolveThemeFont function.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */

import { EMPTY_FONT_SCHEME, resolveThemeFont } from "./font-scheme";

describe("EMPTY_FONT_SCHEME", () => {
  it("has required majorFont and minorFont properties", () => {
    expect(EMPTY_FONT_SCHEME.majorFont).toBeDefined();
    expect(EMPTY_FONT_SCHEME.minorFont).toBeDefined();
  });

  it("has no typeface values (all optional fields undefined)", () => {
    expect(EMPTY_FONT_SCHEME.majorFont.latin).toBeUndefined();
    expect(EMPTY_FONT_SCHEME.majorFont.eastAsian).toBeUndefined();
    expect(EMPTY_FONT_SCHEME.majorFont.complexScript).toBeUndefined();
    expect(EMPTY_FONT_SCHEME.minorFont.latin).toBeUndefined();
    expect(EMPTY_FONT_SCHEME.minorFont.eastAsian).toBeUndefined();
    expect(EMPTY_FONT_SCHEME.minorFont.complexScript).toBeUndefined();
  });
});

describe("resolveThemeFont", () => {
  it("returns undefined for theme references with EMPTY_FONT_SCHEME", () => {
    expect(resolveThemeFont("+mj-lt", EMPTY_FONT_SCHEME)).toBeUndefined();
    expect(resolveThemeFont("+mn-lt", EMPTY_FONT_SCHEME)).toBeUndefined();
    expect(resolveThemeFont("+mj-ea", EMPTY_FONT_SCHEME)).toBeUndefined();
    expect(resolveThemeFont("+mn-cs", EMPTY_FONT_SCHEME)).toBeUndefined();
  });

  it("passes through non-theme-reference typefaces", () => {
    expect(resolveThemeFont("Arial", EMPTY_FONT_SCHEME)).toBe("Arial");
    expect(resolveThemeFont("Times New Roman", EMPTY_FONT_SCHEME)).toBe("Times New Roman");
  });

  it("returns undefined when fontScheme is undefined", () => {
    expect(resolveThemeFont("+mj-lt", undefined)).toBeUndefined();
  });

  it("returns undefined when typeface is undefined", () => {
    expect(resolveThemeFont(undefined, EMPTY_FONT_SCHEME)).toBeUndefined();
  });

  it("resolves populated font scheme references", () => {
    const scheme = {
      majorFont: { latin: "Calibri Light", eastAsian: "MS Gothic" },
      minorFont: { latin: "Calibri", complexScript: "Arial" },
    };
    expect(resolveThemeFont("+mj-lt", scheme)).toBe("Calibri Light");
    expect(resolveThemeFont("+mj-ea", scheme)).toBe("MS Gothic");
    expect(resolveThemeFont("+mn-lt", scheme)).toBe("Calibri");
    expect(resolveThemeFont("+mn-cs", scheme)).toBe("Arial");
  });

  it("returns undefined for unknown theme references", () => {
    const scheme = { majorFont: { latin: "Arial" }, minorFont: { latin: "Arial" } };
    expect(resolveThemeFont("+xx-lt", scheme)).toBeUndefined();
  });
});
