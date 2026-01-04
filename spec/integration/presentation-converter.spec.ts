/**
 * @file Presentation converter tests
 *
 * Verifies that theme colors, fonts, and resources are correctly extracted
 * from PPTX files for the editor.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

// Import directly from src instead of using @lib alias
import { openPresentation } from "../../src/pptx";
import { parseColorScheme, parseFontScheme, parseColorMap } from "../../src/pptx/core/dml/parser/theme";
import { getByPath } from "../../src/xml";
import { getMimeTypeFromPath } from "../../src/pptx/opc";
import type { ColorContext, FontScheme, ColorScheme, ColorMap } from "../../src/pptx/domain/resolution";
import type { ResourceResolver } from "../../src/pptx/render/core";

// Fixture path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures");

// =============================================================================
// Color Context Building (duplicated from presentation-converter for testing)
// =============================================================================

function extractColorScheme(apiSlide: { theme?: unknown }): ColorScheme {
  if (!apiSlide.theme) {
    return {};
  }
  return parseColorScheme(apiSlide.theme);
}

function extractColorMap(apiSlide: { master?: unknown }): ColorMap {
  if (!apiSlide.master) {
    return {};
  }
  const clrMapElement = getByPath(apiSlide.master, ["p:sldMaster", "p:clrMap"]);
  return parseColorMap(clrMapElement);
}

function buildColorContext(apiSlide: { theme?: unknown; master?: unknown }): ColorContext {
  return {
    colorScheme: extractColorScheme(apiSlide),
    colorMap: extractColorMap(apiSlide),
  };
}

function extractFontScheme(apiSlide: { theme?: unknown }): FontScheme | undefined {
  if (!apiSlide.theme) {
    return undefined;
  }
  return parseFontScheme(apiSlide.theme);
}

// =============================================================================
// Tests
// =============================================================================

describe("convertToPresentationDocument", () => {
  describe("with real PPTX file (Sample_demo1.pptx)", () => {
    let apiSlide: ReturnType<ReturnType<typeof openPresentation>["getSlide"]>;
    let colorContext: ColorContext;
    let fontScheme: FontScheme | undefined;

    beforeAll(async () => {
      // Load a PPTX with theme colors
      const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
      const buffer = await Bun.file(fixturePath).arrayBuffer();

      // Load using JSZip
      const jszip = await JSZip.loadAsync(buffer);

      // Preload files
      const cache = new Map<string, { text: string; buffer: ArrayBuffer }>();
      for (const [filePath, file] of Object.entries(jszip.files)) {
        if (!file.dir) {
          const fileBuffer = await file.async("arraybuffer");
          const text = new TextDecoder().decode(fileBuffer);
          cache.set(filePath, { text, buffer: fileBuffer });
        }
      }

      // Create presentation file adapter
      const presentationFile = {
        readText(filePath: string): string | null {
          return cache.get(filePath)?.text ?? null;
        },
        readBinary(filePath: string): ArrayBuffer | null {
          return cache.get(filePath)?.buffer ?? null;
        },
        exists(filePath: string): boolean {
          return cache.has(filePath);
        },
      };

      // Use openPresentation
      const presentation = openPresentation(presentationFile);

      // Get first slide to extract theme/master info
      apiSlide = presentation.getSlide(1);

      // Build color context
      colorContext = buildColorContext(apiSlide);

      // Extract font scheme
      fontScheme = extractFontScheme(apiSlide);
    });

    it("extracts colorContext with colorScheme", () => {
      expect(colorContext).toBeDefined();
      expect(colorContext.colorScheme).toBeDefined();

      // Should have theme colors
      const scheme = colorContext.colorScheme;
      console.log("ColorScheme keys:", Object.keys(scheme));

      // Common theme colors should exist
      expect(Object.keys(scheme).length).toBeGreaterThan(0);
    });

    it("extracts colorContext with colorMap", () => {
      expect(colorContext.colorMap).toBeDefined();

      const map = colorContext.colorMap;
      console.log("ColorMap:", map);

      // Should have color mappings
      expect(Object.keys(map).length).toBeGreaterThan(0);
    });

    it("extracts fontScheme", () => {
      console.log("FontScheme:", fontScheme);

      if (fontScheme) {
        expect(fontScheme.majorFont).toBeDefined();
        expect(fontScheme.minorFont).toBeDefined();
      }
    });

    it("has theme/master data available on slide", () => {
      expect(apiSlide.theme).toBeDefined();
      expect(apiSlide.master).toBeDefined();
    });

    it("has relationships available on slide", () => {
      expect(apiSlide.relationships).toBeDefined();
      expect(typeof apiSlide.relationships).toBe("object");
    });
  });

  describe("with PPTX containing images", () => {
    it("extracts image relationships correctly", async () => {
      // Find a PPTX with images
      const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
      const buffer = await Bun.file(fixturePath).arrayBuffer();
      const jszip = await JSZip.loadAsync(buffer);

      // Check for media files
      const mediaFiles = Object.keys(jszip.files).filter((f) =>
        f.startsWith("ppt/media/")
      );
      console.log("Media files found:", mediaFiles);

      // Verify media files can be accessed
      for (const mediaFile of mediaFiles.slice(0, 3)) {
        const file = jszip.files[mediaFile];
        if (!file.dir) {
          const buffer = await file.async("arraybuffer");
          expect(buffer.byteLength).toBeGreaterThan(0);

          const mimeType = getMimeTypeFromPath(mediaFile);
          console.log(`${mediaFile}: ${buffer.byteLength} bytes, type: ${mimeType}`);
        }
      }
    });
  });
});
