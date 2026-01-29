/**
 * @file Presentation converter tests
 *
 * Verifies that theme colors, fonts, and resources are correctly extracted
 * from PPTX files for the editor.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";

// Import directly from src instead of using @lib alias
import { openPresentation } from "@oxen-office/pptx";
import { parseColorScheme, parseFontScheme, parseColorMap } from "@oxen-office/pptx/parser/drawing-ml/index";
import { getByPath } from "@oxen/xml";
import { getMimeTypeFromPath } from "@oxen-office/pptx/opc/utils";
import type { ColorContext, ColorScheme, ColorMap } from "@oxen-office/ooxml/domain/color-context";
import type { FontScheme } from "@oxen-office/ooxml/domain/font-scheme";

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
  return parseColorScheme(apiSlide.theme as import("@oxen/xml").XmlDocument);
}

function extractColorMap(apiSlide: { master?: unknown }): ColorMap {
  if (!apiSlide.master) {
    return {};
  }
  const clrMapElement = getByPath(apiSlide.master as import("@oxen/xml").XmlElement, ["p:sldMaster", "p:clrMap"]);
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
  return parseFontScheme(apiSlide.theme as import("@oxen/xml").XmlDocument);
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
      const { presentationFile } = await loadPptxFile(fixturePath);

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
      const { zipPackage } = await loadPptxFile(fixturePath);
      const filePaths = zipPackage.listFiles();

      // Check for media files
      const mediaFiles = filePaths.filter((f: string) =>
        f.startsWith("ppt/media/")
      );
      console.log("Media files found:", mediaFiles);

      // Verify media files can be accessed
      for (const mediaFile of mediaFiles.slice(0, 3)) {
        const buffer = zipPackage.readBinary(mediaFile);
        expect(buffer?.byteLength ?? 0).toBeGreaterThan(0);

        const mimeType = getMimeTypeFromPath(mediaFile);
        console.log(`${mediaFile}: ${buffer?.byteLength ?? 0} bytes, type: ${mimeType}`);
      }
    });
  });
});
