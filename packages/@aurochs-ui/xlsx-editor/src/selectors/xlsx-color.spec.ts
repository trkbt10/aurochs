/**
 * @file SpreadsheetML color resolver tests
 *
 * Tests the editor's `xlsxColorToCss` wrapper, which delegates to the
 * canonical color resolver in @aurochs-office/xlsx/domain/style/color-resolver.
 */

import { xlsxColorToCss } from "./xlsx-color";

/** Standard Office theme color scheme for testing */
const OFFICE_COLOR_SCHEME = {
  lt1: "FFFFFF",
  dk1: "000000",
  lt2: "E7E6E6",
  dk2: "44546A",
  accent1: "5B9BD5",
  accent2: "ED7D31",
  accent3: "A5A5A5",
  accent4: "FFC000",
  accent5: "4472C4",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72",
};

describe("xlsx-editor/selectors/xlsx-color", () => {
  it("converts ARGB rgb into css hex (alpha is dropped)", () => {
    expect(xlsxColorToCss({ type: "rgb", value: "FF112233" })).toBe("#112233");
    expect(xlsxColorToCss({ type: "rgb", value: "80112233" })).toBe("#112233");
  });

  it("converts indexed colors using default palette", () => {
    expect(xlsxColorToCss({ type: "indexed", index: 2 })).toBe("#FF0000");
    expect(xlsxColorToCss({ type: "indexed", index: 63 })).toBe("#333333");
  });

  it("converts indexed colors using palette overrides (styles.xml indexedColors)", () => {
    const indexedColors = Array.from({ length: 64 }, () => "00000000");
    indexedColors[61] = "00E8E8E8";
    indexedColors[18] = "00094A74";

    expect(xlsxColorToCss({ type: "indexed", index: 61 }, { indexedColors })).toBe("#E8E8E8");
    expect(xlsxColorToCss({ type: "indexed", index: 18 }, { indexedColors })).toBe("#094A74");
  });

  it("resolves theme colors from colorScheme", () => {
    const opts = { colorScheme: OFFICE_COLOR_SCHEME };
    // theme 0 = lt1 (white), theme 1 = dk1 (black)
    expect(xlsxColorToCss({ type: "theme", theme: 0 }, opts)).toBe("#FFFFFF");
    expect(xlsxColorToCss({ type: "theme", theme: 1 }, opts)).toBe("#000000");
    // theme 4 = accent1
    expect(xlsxColorToCss({ type: "theme", theme: 4 }, opts)).toBe("#5B9BD5");
  });

  it("falls back to ECMA-376 default Office theme when no colorScheme provided", () => {
    // theme=1 → dk1 → default Office theme dk1 = #000000
    expect(xlsxColorToCss({ type: "theme", theme: 1 })).toBe("#000000");
    // theme=0 → lt1 → default Office theme lt1 = #FFFFFF
    expect(xlsxColorToCss({ type: "theme", theme: 0 })).toBe("#FFFFFF");
    // theme=4 → accent1 → default Office theme accent1 = #4472C4
    expect(xlsxColorToCss({ type: "theme", theme: 4 })).toBe("#4472C4");
  });

  it("auto color defaults to black per ECMA-376", () => {
    expect(xlsxColorToCss({ type: "auto" })).toBe("#000000");
  });

  it("returns undefined for undefined color", () => {
    expect(xlsxColorToCss(undefined)).toBeUndefined();
  });
});
