/**
 * @file Test for font extractor module
 *
 * Tests extraction of embedded fonts from PDF files.
 * Embedded fonts are stored in FontDescriptor's FontFile/FontFile2/FontFile3 streams.
 *
 * @see ISO 32000-1:2008 Section 9.9 (Embedded Font Programs)
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadNativePdfDocument } from "../../native";
import { extractEmbeddedFonts, type EmbeddedFont } from "./font-extractor";

describe("extractEmbeddedFonts", () => {
  it("should extract OpenType fonts from CJK PDF", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = loadNativePdfDocument(buffer, { encryption: "ignore" });

    const fonts = extractEmbeddedFonts(pdfDoc);

    expect(fonts.length).toBe(2);

    // Check Hiragino Sans
    const hiragino = fonts.find((f) => f.baseFontName.includes("Hiragino"));
    expect(hiragino).toBeDefined();
    expect(hiragino?.format).toBe("opentype");
    expect(hiragino?.data.length).toBeGreaterThan(0);

    // Check PingFang SC
    const pingfang = fonts.find((f) => f.baseFontName.includes("PingFang"));
    expect(pingfang).toBeDefined();
    expect(pingfang?.format).toBe("opentype");
    expect(pingfang?.data.length).toBeGreaterThan(0);
  });

  it("should return empty array for PDF without embedded fonts", async () => {
    const pdfBytes = fs.readFileSync(path.resolve("spec/fixtures/pdf/simple-rect.pdf"));
    const loadedDoc = loadNativePdfDocument(pdfBytes, { encryption: "reject" });
    const fonts = extractEmbeddedFonts(loadedDoc);
    expect(fonts.length).toBe(0);
  });

  it("should extract font family name without subset prefix", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = loadNativePdfDocument(buffer, { encryption: "ignore" });

    const fonts = extractEmbeddedFonts(pdfDoc);

    // Font family should not have subset prefix
    for (const font of fonts) {
      expect(font.fontFamily).not.toMatch(/^[A-Z]{6}\+/);
      console.log(`Font: ${font.baseFontName} -> Family: ${font.fontFamily}`);
    }
  });

  it("should detect font format correctly", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = loadNativePdfDocument(buffer, { encryption: "ignore" });

    const fonts = extractEmbeddedFonts(pdfDoc);

    for (const font of fonts) {
      // These should be OpenType (CFF)
      expect(font.format).toBe("opentype");
      console.log(`Font: ${font.fontFamily}, Format: ${font.format}, Size: ${font.data.length} bytes`);
    }
  });
});
