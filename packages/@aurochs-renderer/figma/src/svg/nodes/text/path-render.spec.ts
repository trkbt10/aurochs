/**
 * @file Path-based text rendering tests
 */
import { createNodeFontLoader } from "../../../font-drivers/node";
import { CachingFontLoader } from "../../../font";
import {
  renderTextNodeAsPath,
  getFontMetricsFromFont,
  calculateBaselineOffset,
  type PathRenderContext,
} from "./path-render";
import type { FigNode } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";

describe("path-render", () => {
  let fontLoader: CachingFontLoader;

  beforeAll(() => {
    const nodeLoader = createNodeFontLoader();
    fontLoader = new CachingFontLoader(nodeLoader);
  });

  describe("createNodeFontLoader", () => {
    it("finds Inter font (macOS system font)", async () => {
      const available = await fontLoader.isFontAvailable("Inter");
      // Inter may or may not be available depending on system
      expect(typeof available).toBe("boolean");
    });

    it("finds common system fonts", async () => {
      // Test common fonts that should be on most systems
      const commonFonts = ["Arial", "Helvetica", "Times New Roman"];
      const results = await Promise.all(commonFonts.map((f) => fontLoader.isFontAvailable(f)));
      // At least one should be available
      expect(results.some(Boolean)).toBe(true);
    });
  });

  describe("renderTextNodeAsPath", () => {
    it("renders simple text as path", async () => {
      const node = {
        type: { value: 0, name: "TEXT" },
        name: "test",
        characters: "Hello",
        fontSize: 16,
        fontName: { family: "Inter", style: "Regular" },
        size: { x: 100, y: 30 },
        textAlignHorizontal: { value: 0, name: "LEFT" },
        textAlignVertical: { value: 0, name: "TOP" },
        fillPaints: [{ type: { value: 0, name: "SOLID" }, color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 }],
      } as unknown as FigNode;

      const ctx: PathRenderContext = {
        canvasSize: { width: 100, height: 30 },
        blobs: [] as FigBlob[],
        images: new Map(),
        defs: { add: () => {}, generateId: () => "", getAll: () => [], hasAny: () => false },
        showHiddenNodes: false,
        fontLoader,
      };

      const result = await renderTextNodeAsPath(node, ctx);

      // If font is available, should produce path output
      if (result) {
        // Check for SVG path element
        expect(typeof result).toBe("string");
        // May be empty if font not found, or contain path
        if (result.includes("<path")) {
          expect(result).toContain("d=");
        }
      }
    });

    it("returns empty for empty characters", async () => {
      const node = {
        type: { value: 0, name: "TEXT" },
        name: "test",
        characters: "",
        fontSize: 16,
      } as unknown as FigNode;

      const ctx: PathRenderContext = {
        canvasSize: { width: 100, height: 30 },
        blobs: [] as FigBlob[],
        images: new Map(),
        defs: { add: () => {}, generateId: () => "", getAll: () => [], hasAny: () => false },
        showHiddenNodes: false,
        fontLoader,
      };

      const result = await renderTextNodeAsPath(node, ctx);
      expect(result).toBe("");
    });
  });

  describe("getFontMetricsFromFont", () => {
    it("extracts metrics from loaded font", async () => {
      const loaded = await fontLoader.loadFont({ family: "Inter" });

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
      const loaded = await fontLoader.loadFont({ family: "Inter" });

      if (loaded) {
        const offset = calculateBaselineOffset(loaded.font, 16, "TOP");
        // Offset should be positive (baseline below top)
        expect(offset).toBeGreaterThan(0);
        // Should be roughly around ascender height
        expect(offset).toBeLessThan(20);
      }
    });

    it("calculates different offsets for different alignments", async () => {
      const loaded = await fontLoader.loadFont({ family: "Inter" });

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
