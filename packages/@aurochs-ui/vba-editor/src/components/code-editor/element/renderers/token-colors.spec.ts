/**
 * @file Token Colors Tests
 */

import {
  TOKEN_COLORS_RGB,
  rgbToCss,
  rgbToHex,
  getTokenColorRgb,
  getTokenColorCss,
} from "./token-colors";

describe("TOKEN_COLORS_RGB", () => {
  test("has colors for all token types", () => {
    const expectedTypes = [
      "keyword",
      "type",
      "builtin",
      "string",
      "comment",
      "number",
      "operator",
      "identifier",
      "punctuation",
      "whitespace",
    ];

    for (const type of expectedTypes) {
      expect(TOKEN_COLORS_RGB[type as keyof typeof TOKEN_COLORS_RGB]).toBeDefined();
    }
  });

  test("keyword is blue", () => {
    expect(TOKEN_COLORS_RGB.keyword).toEqual([0, 0, 255]);
  });

  test("comment is green", () => {
    expect(TOKEN_COLORS_RGB.comment).toEqual([0, 128, 0]);
  });
});

describe("rgbToCss", () => {
  test("converts RGB to CSS rgb() string", () => {
    expect(rgbToCss([255, 128, 64])).toBe("rgb(255, 128, 64)");
  });

  test("converts black", () => {
    expect(rgbToCss([0, 0, 0])).toBe("rgb(0, 0, 0)");
  });

  test("converts white", () => {
    expect(rgbToCss([255, 255, 255])).toBe("rgb(255, 255, 255)");
  });
});

describe("rgbToHex", () => {
  test("converts RGB to hex string", () => {
    expect(rgbToHex([255, 128, 64])).toBe("#ff8040");
  });

  test("converts black", () => {
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
  });

  test("converts blue", () => {
    expect(rgbToHex([0, 0, 255])).toBe("#0000ff");
  });

  test("pads single digit hex values", () => {
    expect(rgbToHex([1, 2, 3])).toBe("#010203");
  });
});

describe("getTokenColorRgb", () => {
  test("returns keyword color for keyword", () => {
    expect(getTokenColorRgb("keyword")).toEqual([0, 0, 255]);
  });

  test("returns identifier color for unknown type", () => {
    // @ts-expect-error - testing unknown type
    expect(getTokenColorRgb("unknown")).toEqual(TOKEN_COLORS_RGB.identifier);
  });
});

describe("getTokenColorCss", () => {
  test("returns transparent for whitespace", () => {
    expect(getTokenColorCss("whitespace")).toBe("transparent");
  });

  test("returns CSS rgb for keyword", () => {
    expect(getTokenColorCss("keyword")).toBe("rgb(0, 0, 255)");
  });

  test("returns CSS rgb for comment", () => {
    expect(getTokenColorCss("comment")).toBe("rgb(0, 128, 0)");
  });
});
