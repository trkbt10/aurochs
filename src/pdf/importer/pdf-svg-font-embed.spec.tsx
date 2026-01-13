/**
 * @file Test for SVG rendering with embedded fonts
 * @vitest-environment jsdom
 *
 * Tests that embedded fonts from PDF are included in SVG output
 * via <style> element with @font-face declarations.
 */
import { describe, it, expect, beforeAll } from "vitest";
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
    console.log("\nStyle elements found:", styleElements.length);

    // Find style element with @font-face
    let fontFaceStyleFound = false;
    styleElements.forEach((style) => {
      if (style.textContent?.includes("@font-face")) {
        fontFaceStyleFound = true;
        console.log("\n@font-face found in <style>:");
        console.log(style.textContent.slice(0, 300) + "...");
      }
    });

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
