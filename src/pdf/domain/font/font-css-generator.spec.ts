/**
 * @file Test for font CSS generator
 *
 * Tests generation of @font-face CSS from embedded font data.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { PDFDocument } from "pdf-lib";
import { extractEmbeddedFonts } from "./font-extractor";
import {
  fontToDataUrl,
  generateFontFaceCss,
  generateFontFaceStyle,
} from "./font-css-generator";

describe("fontToDataUrl", () => {
  it("should convert font data to base64 data URL", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(buffer);
    const fonts = extractEmbeddedFonts(pdfDoc);

    expect(fonts.length).toBeGreaterThan(0);

    const font = fonts[0]!;
    const dataUrl = fontToDataUrl(font);

    expect(dataUrl).toMatch(/^data:font\/otf;base64,/);
    // Base64 encoded data should be present
    expect(dataUrl.length).toBeGreaterThan(100);
  });
});

describe("generateFontFaceCss", () => {
  it("should generate valid @font-face CSS", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(buffer);
    const fonts = extractEmbeddedFonts(pdfDoc);

    const font = fonts[0]!;
    const css = generateFontFaceCss(font);

    console.log("Generated CSS:\n", css);

    // Check CSS structure
    expect(css).toContain("@font-face");
    expect(css).toContain("font-family:");
    expect(css).toContain("src:");
    expect(css).toContain("data:font/otf;base64,");
    expect(css).toContain(`"${font.fontFamily}"`);
  });

  it("should generate CSS for all embedded fonts", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(buffer);
    const fonts = extractEmbeddedFonts(pdfDoc);

    // Generate CSS for all fonts
    const allCss = fonts.map((f) => generateFontFaceCss(f)).join("\n");

    console.log("All fonts CSS:\n", allCss.slice(0, 500) + "...");

    // Font names preserved from BaseFont (with hyphens)
    expect(allCss).toContain("Hiragino-Sans");
    expect(allCss).toContain("PingFang-SC");
  });
});

describe("generateFontFaceStyle", () => {
  it("should generate SVG <style> element content", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(buffer);
    const fonts = extractEmbeddedFonts(pdfDoc);

    const styleContent = generateFontFaceStyle(fonts);

    console.log("Style element content (first 500 chars):\n", styleContent.slice(0, 500));

    // Should contain all fonts (names preserved from BaseFont with hyphens)
    expect(styleContent).toContain("Hiragino-Sans");
    expect(styleContent).toContain("PingFang-SC");
    expect(styleContent).toContain("@font-face");
  });
});
