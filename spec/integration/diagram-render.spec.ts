/**
 * @file Integration tests for diagram (SmartArt) rendering
 *
 * Tests actual PPTX file diagram rendering.
 * Uses customGeo.pptx which contains a diagram on slide 7.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 * @see MS-ODRAWXML Section 2.4 - Diagram Drawing Elements
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "../../src/pptx";
import { openPresentation } from "../../src/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "../../src/pptx/render/svg";

// customGeo.pptx has a diagram on slide 7
const CUSTOM_GEO_PATH = "fixtures/poi-test-data/test-data/slideshow/customGeo.pptx";

describe("Diagram rendering - customGeo.pptx", () => {
  let presentationFile: PresentationFile;

  beforeAll(async () => {
    const fullPath = path.resolve(CUSTOM_GEO_PATH);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    ({ presentationFile } = await loadPptxFile(fullPath));
  });

  describe("Slide 7 - Diagram content", () => {
    /**
     * Slide 7 contains a SmartArt diagram with:
     * - "Ohio's New Learning Standards for English Language Arts" header
     * - 4 colored boxes: Reading Strand, Writing Strand, Speaking and Listening Strand, Language Strand
     *
     * The diagram is stored in ppt/diagrams/drawing1.xml and referenced via
     * relationship type "diagramDrawing".
     */

    it("should render diagram shapes (not placeholder)", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // Should NOT contain placeholder text
      expect(svg).not.toContain("[Diagram]");
    });

    it("should render actual SVG path elements from diagram", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // Should contain path elements (shapes from diagram)
      const pathMatches = svg.match(/<path/g) ?? [];
      expect(pathMatches.length).toBeGreaterThan(0);
    });

    it("should render text content from diagram", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // Should contain text elements
      expect(svg).toContain("<text");

      // Should contain text from the diagram
      // "Ohio's New Learning Standards for English Language Arts"
      expect(svg).toContain("Ohio");
    });

    it("should render multiple diagram shapes with fill colors", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // The diagram has multiple colored shapes:
      // Blue: #4F81BD, Purple: #8064A2, Red: #C0504D, Orange: #F79646, Green: #9BBB59
      // At least one of these colors should be present
      const hasBlue = svg.includes("#4F81BD") || svg.includes("#4f81bd");
      const hasPurple = svg.includes("#8064A2") || svg.includes("#8064a2");
      const hasRed = svg.includes("#C0504D") || svg.includes("#c0504d");
      const hasOrange = svg.includes("#F79646") || svg.includes("#f79646");
      const hasGreen = svg.includes("#9BBB59") || svg.includes("#9bbb59");

      expect(hasBlue || hasPurple || hasRed || hasOrange || hasGreen).toBe(true);
    });

    it("should render diagram without throwing", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);

      // Should not throw when rendering
      expect(() => renderSlideToSvg(slide).svg).not.toThrow();
    });

    it("should have diagram frame positioned correctly", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // Should have transform with translate for diagram frame position
      expect(svg).toContain("translate(");
    });

    it("should render roundRect shapes (from diagram roundedRect preset)", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // roundRect shapes have Q (quadratic bezier) commands for corners
      expect(svg).toContain(" Q ");
    });

    it("should render multiple text elements for multi-line text", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      const svg = renderSlideToSvg(slide).svg;

      // The diagram has multi-line text, should have multiple text elements
      const textMatches = svg.match(/<text/g) ?? [];
      expect(textMatches.length).toBeGreaterThan(5);
    });
  });

  describe("Slide comparison (diagram vs non-diagram)", () => {
    it("should render slide 1 differently from slide 7", () => {
      const presentation = openPresentation(presentationFile);

      const slide1 = presentation.getSlide(1);
      const slide7 = presentation.getSlide(7);

      const { svg: svg1 } = renderSlideToSvg(slide1);
      const { svg: svg7 } = renderSlideToSvg(slide7);

      // Slide 1 and slide 7 should have different content
      expect(svg1).not.toBe(svg7);

      // Slide 7 should have "Ohio" text (from diagram)
      expect(svg7).toContain("Ohio");
    });
  });
});

describe("Diagram rendering - other PPTX files", () => {
  /**
   * Test diagram handling across different PPTX files
   * to ensure graceful fallback when diagrams are not present
   */

  it("should handle PPTX without diagrams gracefully", async () => {
    const filePath = "fixtures/poi-test-data/test-data/slideshow/present1.pptx";
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      console.log("Skipping test: present1.pptx not found");
      return;
    }

    const { presentationFile } = await loadPptxFile(fullPath);
    const presentation = openPresentation(presentationFile);

    // Should render all slides without throwing errors
    const slideCount = presentation.count;
    for (let i = 1; i <= slideCount; i++) {
      const slide = presentation.getSlide(i);
      const svg = renderSlideToSvg(slide).svg;
      expect(svg).toContain("<svg");
    }
  });
});
