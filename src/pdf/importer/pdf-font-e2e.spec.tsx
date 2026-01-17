/**
 * @file End-to-end test: PDF import → PPTX → SVG font rendering
 * @vitest-environment jsdom
 *
 * Tests the complete flow from PDF import to SVG rendering
 * to verify font-family is correctly propagated.
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

describe("PDF import to SVG font rendering (E2E)", () => {
  it("CJK PDF → importPdf → SlideRendererSvg preserves font-family", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);

    // Step 1: Import PDF
    const result = await importPdf(data);
    expect(result.pageCount).toBeGreaterThan(0);

    const { document } = result;
    const slide = document.slides[0]?.slide;
    expect(slide).toBeDefined();

    console.log("=== E2E: PDF → PPTX → SVG Font Flow ===\n");

    // Step 2: Check SpShape font properties
    console.log("1. Shapes in imported slide:");
    for (const shape of slide!.shapes) {
      if (shape.type === "sp" && shape.textBody) {
        for (const para of shape.textBody.paragraphs) {
          for (const run of para.runs) {
            if (run.type === "text") {
              const text = run.text.slice(0, 20);
              const ff = run.properties?.fontFamily;
              const ffEa = run.properties?.fontFamilyEastAsian;
              console.log(`   text: "${text}", fontFamily: ${ff}, fontFamilyEastAsian: ${ffEa}`);
            }
          }
        }
      }
    }

    // Step 3: Render to SVG
    const { container } = render(
      <SlideRendererSvg
        slide={slide!}
        slideSize={{ width: document.slideWidth, height: document.slideHeight }}
        colorContext={document.colorContext}
        resources={document.resources}
      />
    );

    // Step 4: Check SVG font-family attributes
    console.log("\n2. SVG text elements:");
    const textElements = container.querySelectorAll("text, tspan");
    const fontFamilies = new Set<string>();

    textElements.forEach((el) => {
      const fontFamily = el.getAttribute("font-family");
      const textContent = el.textContent?.slice(0, 20);
      if (fontFamily && textContent?.trim()) {
        fontFamilies.add(fontFamily);
        console.log(`   text: "${textContent}", font-family: "${fontFamily}"`);
      }
    });

    // Verify font-family is set
    expect(fontFamilies.size).toBeGreaterThan(0);

    // Check that at least one font-family contains "Hiragino"
    // Font names are preserved as-is (may have hyphens like "Hiragino-Sans")
    const hasHiragino = Array.from(fontFamilies).some((ff) =>
      ff.includes("Hiragino")
    );
    console.log("\n3. Font families found:", Array.from(fontFamilies));
    console.log("   Contains 'Hiragino':", hasHiragino);

    expect(hasHiragino).toBe(true);
  });
});
