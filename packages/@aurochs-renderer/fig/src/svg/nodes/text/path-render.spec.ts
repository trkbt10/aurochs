/**
 * @file Path-based text rendering tests
 */
import { createNodeFontLoader } from "../../../font-drivers/node";
import { createCachingFontLoader, type CachingFontLoader } from "../../../font";
import {
  renderTextNodeAsPath,
  getFontMetricsFromFont,
  calculateBaselineOffset,
  type PathRenderContext,
} from "./path-render";
import type { FigNode } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";
import type { AbstractFont, FontLoader, FontLoadOptions, LoadedFont } from "../../../font";

function createFakeFont(supportedChars: string): AbstractFont {
  return {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    charToGlyph(char) {
      const supported = supportedChars.includes(char);
      return {
        index: supported ? char.codePointAt(0) ?? 1 : 0,
        advanceWidth: 500,
        getPath(x, y, fontSize) {
          if (!supported) {
            return { commands: [], toPathData: () => "" };
          }
          return {
            commands: [
              { type: "M", x, y },
              { type: "L", x: x + fontSize / 2, y },
              { type: "L", x: x + fontSize / 2, y: y - fontSize },
              { type: "L", x, y: y - fontSize },
              { type: "Z" },
            ],
            toPathData: () => "",
          };
        },
      };
    },
    getPath(...args: Parameters<AbstractFont["getPath"]>) {
      const [text, x, y, fontSize, options] = args;
      const commands = Array.from(text).flatMap((char, index) =>
        this.charToGlyph(char).getPath(x + index * (fontSize / 2 + (options?.letterSpacing ?? 0)), y, fontSize).commands,
      );
      return { commands, toPathData: () => "" };
    },
  };
}

function loadedFont(font: AbstractFont, family: string): LoadedFont {
  return { font, family, weight: 400, style: "normal" };
}

function createFakeFontLoader(params: {
  readonly primary?: LoadedFont;
  readonly fallback?: LoadedFont;
}): FontLoader {
  return {
    loadFont(_options: FontLoadOptions) {
      return Promise.resolve(params.primary);
    },
    loadFallbackFont(_options: FontLoadOptions) {
      return Promise.resolve(params.fallback);
    },
    isFontAvailable() {
      return Promise.resolve(params.primary !== undefined);
    },
  };
}

function createTextNode(characters: string): FigNode {
  return {
    type: { value: 8, name: "TEXT" },
    name: "test",
    characters,
    fontSize: 16,
    fontName: { family: "MissingPrimary", style: "Regular" },
    size: { x: 100, y: 30 },
    textAlignHorizontal: { value: 0, name: "LEFT" },
    textAlignVertical: { value: 0, name: "TOP" },
    fillPaints: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
    guid: { sessionID: 0, localID: 0 },
    phase: { value: 1, name: "CREATED" },
  };
}

function createPathRenderContext(fontLoader: FontLoader): PathRenderContext {
  return {
    canvasSize: { width: 100, height: 30 },
    blobs: [] as FigBlob[],
    images: new Map(),
    showHiddenNodes: false,
    styleRegistry: { fills: new Map(), strokes: new Map() },
    fontLoader,
  };
}

describe("path-render", () => {
  const fontLoaderRef = { value: undefined as CachingFontLoader | undefined };

  beforeAll(() => {
    const nodeLoader = createNodeFontLoader();
    fontLoaderRef.value = createCachingFontLoader(nodeLoader);
  });

  /** Get the font loader, asserting it was initialized by beforeAll */
  function getFontLoader(): CachingFontLoader {
    if (!fontLoaderRef.value) { throw new Error("fontLoader not initialized"); }
    return fontLoaderRef.value;
  }

  describe("createNodeFontLoader", () => {
    it("finds Inter font (macOS system font)", async () => {
      const available = await getFontLoader().isFontAvailable("Inter");
      // Inter may or may not be available depending on system
      expect(typeof available).toBe("boolean");
    });

    it("finds common system fonts", async () => {
      // Test common fonts that should be on most systems
      const commonFonts = ["Arial", "Helvetica", "Times New Roman"];
      const results = await Promise.all(commonFonts.map((f) => getFontLoader().isFontAvailable(f)));
      // At least one should be available
      expect(results.some(Boolean)).toBe(true);
    });
  });

  describe("renderTextNodeAsPath", () => {
    it("renders simple text as path", async () => {
      const node = createTextNode("Hello");
      const primary = loadedFont(createFakeFont("Helo"), "Primary");
      const ctx = createPathRenderContext(createFakeFontLoader({ primary }));

      const result = await renderTextNodeAsPath(node, ctx);

      expect(result).toContain("<path");
      expect(result).toContain("d=");
    });

    it("returns empty for empty characters", async () => {
      const node: FigNode = {
        type: { value: 8, name: "TEXT" },
        name: "test",
        characters: "",
        fontSize: 16,
        guid: { sessionID: 0, localID: 0 },
        phase: { value: 1, name: "CREATED" },
      };

      const ctx: PathRenderContext = {
        canvasSize: { width: 100, height: 30 },
        blobs: [] as FigBlob[],
        images: new Map(),
        showHiddenNodes: false,
        styleRegistry: { fills: new Map(), strokes: new Map() },
        fontLoader: getFontLoader(),
      };

      const result = await renderTextNodeAsPath(node, ctx);
      expect(result).toBe("");
    });

    it("uses the explicit fallback font when the primary font is unavailable and the fallback covers the text", async () => {
      const fallback = loadedFont(createFakeFont("漢"), "FallbackCJK");
      const ctx = createPathRenderContext(createFakeFontLoader({ fallback }));

      const result = await renderTextNodeAsPath(createTextNode("漢"), ctx);

      expect(result).toContain("<path");
      expect(result).toContain("d=");
    });

    it("throws when neither the primary nor fallback font can cover visible text", async () => {
      const fallback = loadedFont(createFakeFont("A"), "FallbackLatinOnly");
      const ctx = createPathRenderContext(createFakeFontLoader({ fallback }));

      await expect(renderTextNodeAsPath(createTextNode("漢"), ctx))
        .rejects.toThrow("requires font");
    });
  });

  describe("getFontMetricsFromFont", () => {
    it("extracts metrics from loaded font", async () => {
      const loaded = await getFontLoader().loadFont({ family: "Inter" });

      if (loaded) {
        const metrics = getFontMetricsFromFont(loaded.font);

        expect(metrics.unitsPerEm).toBeGreaterThan(0);
        expect(metrics.ascender).toBeGreaterThan(0);
        expect(metrics.descender).toBeLessThan(0);
        expect(typeof metrics.lineGap).toBe("number");
      }
    });
  });

  describe("calculateBaselineOffset", () => {
    it("calculates offset for TOP alignment", async () => {
      const loaded = await getFontLoader().loadFont({ family: "Inter" });

      if (loaded) {
        const offset = calculateBaselineOffset(loaded.font, 16, "TOP");
        // Offset should be positive (baseline below top)
        expect(offset).toBeGreaterThan(0);
        // Should be roughly around ascender height
        expect(offset).toBeLessThan(20);
      }
    });

    it("calculates different offsets for different alignments", async () => {
      const loaded = await getFontLoader().loadFont({ family: "Inter" });

      if (loaded) {
        const top = calculateBaselineOffset(loaded.font, 16, "TOP");
        const center = calculateBaselineOffset(loaded.font, 16, "CENTER");
        const bottom = calculateBaselineOffset(loaded.font, 16, "BOTTOM");

        // All should be distinct (or at least similar pattern)
        expect(top).not.toBe(center);
        expect(center).not.toBe(bottom);
      }
    });
  });
});
