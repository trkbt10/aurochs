/**
 * @file Tests for text-rendering glyph outline resolution.
 */

import type { AbstractFont, FontPath } from "../../font/types";
import { resolveTextRendering } from "./resolve";
import type { TextFontResolver } from "./types";

const RECT_FONT_PATH: FontPath = {
  commands: [
    { type: "M", x: 0, y: 0 },
    { type: "L", x: 10, y: 0 },
    { type: "L", x: 10, y: 10 },
    { type: "L", x: 0, y: 10 },
    { type: "Z" },
  ],
  toPathData: () => "M0 0L10 0L10 10L0 10Z",
};

const RECT_FONT: AbstractFont = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  charToGlyph: () => ({
    index: 1,
    advanceWidth: 500,
    getPath: () => RECT_FONT_PATH,
  }),
  getPath: () => RECT_FONT_PATH,
};

const RECT_FONT_RESOLVER: TextFontResolver = () => RECT_FONT;

const BASE_TEXT_NODE = {
  size: { x: 200, y: 80 },
  opacity: 1,
  textData: {
    characters: "Hello",
    fontSize: 20,
    fontName: { family: "Unit Test Sans", style: "Regular" },
    textAlignHorizontal: { value: 0, name: "LEFT" },
    textAlignVertical: { value: 0, name: "TOP" },
    textAutoResize: { value: 0, name: "WIDTH_AND_HEIGHT" },
    textDecoration: { value: 0, name: "NONE" },
  },
  fills: [
    {
      type: "SOLID",
      color: { r: 0, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true,
    },
  ],
} as const;

describe("resolveTextRendering font outlines", () => {
  it("keeps line rendering visible when no explicit font resolver is supplied", () => {
    const rendering = resolveTextRendering(BASE_TEXT_NODE, { blobs: [] });

    expect(rendering.kind).toBe("lines");
  });

  it("uses an explicit font resolver to produce shared glyph contours", () => {
    const rendering = resolveTextRendering(BASE_TEXT_NODE, {
      blobs: [],
      fontResolver: RECT_FONT_RESOLVER,
    });

    expect(rendering.kind).toBe("glyphs");
    if (rendering.kind !== "glyphs") {
      return;
    }
    expect(rendering.glyphContours).toHaveLength(1);
    expect(rendering.props.fontFamily).toBe("Unit Test Sans");
    expect(rendering.layout.lines[0]?.text).toBe("Hello");
  });
});
