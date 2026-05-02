/**
 * @file Font cache tests.
 */

import { createCachingFontLoader } from "./cache";
import type { AbstractFont, FontLoadOptions, LoadedFont } from "./types";

const EMPTY_FONT: AbstractFont = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  charToGlyph: () => ({
    index: 1,
    advanceWidth: 500,
    getPath: () => ({ commands: [], toPathData: () => "" }),
  }),
  getPath: () => ({ commands: [], toPathData: () => "" }),
};

const LOADED_FONT: LoadedFont = {
  font: EMPTY_FONT,
  family: "Unit Test Sans",
  weight: 400,
  style: "normal",
};

describe("createCachingFontLoader", () => {
  it("exposes loaded fonts synchronously without starting a load", async () => {
    const requested: FontLoadOptions[] = [];
    const loader = createCachingFontLoader({
      loadFont: async (options) => {
        requested.push(options);
        return LOADED_FONT;
      },
      isFontAvailable: async () => true,
    });
    const options = { family: "Unit Test Sans", weight: 400, style: "normal" as const };

    expect(loader.getCachedFont(options)).toBeUndefined();
    await loader.loadFont(options);

    expect(requested).toHaveLength(1);
    expect(loader.getCachedFont(options)).toBe(LOADED_FONT);
  });
});
