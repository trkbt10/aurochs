/**
 * @file Test for SVG rendering with embedded fonts
 * @vitest-environment jsdom
 *
 * Tests that embedded fonts from PDF are included in SVG output
 * via <style> element with @font-face declarations.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { render } from "@testing-library/react";
import { importPdf } from "./pdf-importer";
import { SlideRendererSvg } from "../../pptx/render/react/SlideRenderer";

// Mock getComputedTextLength for JSDOM
beforeAll(() => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  svg.appendChild(text);
  document.body.appendChild(svg);
  const SVGTextElementProto = Object.getPrototypeOf(text);
  if (!SVGTextElementProto.getComputedTextLength) {
    SVGTextElementProto.getComputedTextLength = function () {
      return (this.textContent?.length ?? 0) * 8;
    };
  }
  document.body.removeChild(svg);
});

describe("SVG rendering with embedded fonts", () => {
  it("should include @font-face CSS in SVG when embeddedFontCss is provided", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    // Verify embedded font CSS is present
    expect(document.embeddedFontCss).toBeDefined();
    expect(document.embeddedFontCss).toContain("@font-face");

    const slide = document.slides[0]?.slide;
    expect(slide).toBeDefined();

    // Render to SVG with embedded font CSS
    const { container } = render(
      <SlideRendererSvg
        slide={slide!}
        slideSize={{ width: document.slideWidth, height: document.slideHeight }}
        colorContext={document.colorContext}
        resources={document.resources}
        embeddedFontCss={document.embeddedFontCss}
      />
    );

    // Check for <style> element in SVG
    const styleElements = container.querySelectorAll("style");
    console.log("\n=== SVG Font Debug ===\n");
    console.log("Style elements found:", styleElements.length);

    // Extract @font-face font-family names
    const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g;
    const fontFaceFamilies: string[] = [];
    styleElements.forEach((style) => {
      const content = style.textContent ?? "";
      let match;
      while ((match = fontFaceRegex.exec(content)) !== null) {
        fontFaceFamilies.push(match[1]);
      }
    });
    console.log("\n@font-face font-families:", fontFaceFamilies);

    // Extract font-family from text elements
    const textElements = container.querySelectorAll("text, tspan");
    const textFontFamilies = new Set<string>();
    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      if (fontFamily) {
        textFontFamilies.add(fontFamily);
      }
    });
    console.log("Text element font-families:", Array.from(textFontFamilies));

    // Check for text content
    console.log("\nText content samples:");
    textElements.forEach((el, i) => {
      if (i < 5 && el.textContent) {
        const fontFamily = el.getAttribute("font-family");
        console.log(`  "${el.textContent.slice(0, 20)}" → font-family: ${fontFamily}`);
      }
    });

    // Find style element with @font-face
    let fontFaceStyleFound = false;
    styleElements.forEach((style) => {
      if (style.textContent?.includes("@font-face")) {
        fontFaceStyleFound = true;
        // Show first @font-face rule structure
        const firstFontFace = style.textContent.match(/@font-face\s*\{[^}]+\}/);
        if (firstFontFace) {
          console.log("\nFirst @font-face rule:");
          console.log(firstFontFace[0].replace(/data:[^)]+/, "data:...BASE64..."));
        }
      }
    });

    // Check font data magic bytes and OpenType table structure
    console.log("\nFont data validation:");
    for (const font of document.embeddedFonts ?? []) {
      const data = font.data;
      const magic = Array.from(data.slice(0, 4))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const magicStr = String.fromCharCode(...data.slice(0, 4));
      console.log(`  ${font.fontFamily}: magic=${magic} (${magicStr}), size=${data.length}, format=${font.format}`);

      // Parse OpenType table directory
      if (magicStr === "OTTO" || magicStr === "\x00\x01\x00\x00") {
        const numTables = (data[4] << 8) | data[5];
        console.log(`    Tables (${numTables}):`);
        const tables: string[] = [];
        for (let i = 0; i < Math.min(numTables, 20); i++) {
          const offset = 12 + i * 16;
          const tag = String.fromCharCode(...data.slice(offset, offset + 4));
          tables.push(tag);
        }
        console.log(`      ${tables.join(", ")}`);
        // Check for critical tables
        const hasCmap = tables.includes("cmap");
        const hasHead = tables.includes("head");
        const hasCFF = tables.includes("CFF ");
        console.log(`    Critical: cmap=${hasCmap}, head=${hasHead}, CFF=${hasCFF}`);
      }
    }

    expect(fontFaceStyleFound).toBe(true);
  });

  it("should render correctly without embedded fonts", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    const slide = document.slides[0]?.slide;
    expect(slide).toBeDefined();

    // Render without embedded font CSS
    const { container } = render(
      <SlideRendererSvg
        slide={slide!}
        slideSize={{ width: document.slideWidth, height: document.slideHeight }}
        colorContext={document.colorContext}
        resources={document.resources}
      />
    );

    // Should still render text elements
    const textElements = container.querySelectorAll("text, tspan");
    expect(textElements.length).toBeGreaterThan(0);
  });
});
