/**
 * @file SpreadsheetML color resolver tests
 */

import { xlsxColorToCss } from "./xlsx-color";

describe("xlsx-editor/selectors/xlsx-color", () => {
  it("converts ARGB rgb into css color", () => {
    expect(xlsxColorToCss({ type: "rgb", value: "FF112233" })).toBe("#112233");
    expect(xlsxColorToCss({ type: "rgb", value: "#80112233" })).toBe("rgba(17, 34, 51, 0.5019607843137255)");
  });

  it("converts indexed colors", () => {
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

  it("converts theme colors with tint", () => {
    // accent1: #4F81BD
    expect(xlsxColorToCss({ type: "theme", theme: 4 })).toBe("#4F81BD");
    // lighten by 50%: channel = channel*(1-0.5)+255*0.5
    expect(xlsxColorToCss({ type: "theme", theme: 4, tint: 0.5 })).toBe("#A7C0DE");
    // darken by 50%: channel = channel*(1-0.5)
    expect(xlsxColorToCss({ type: "theme", theme: 4, tint: -0.5 })).toBe("#28415F");
  });
});
