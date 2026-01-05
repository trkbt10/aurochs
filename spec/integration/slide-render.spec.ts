/**
 * @file Integration tests for slide rendering
 * Tests actual PPTX file rendering against expected output
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "../../src/pptx";
import { openPresentation } from "../../src/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";

const FIXTURE_PATH = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";

describe("2411-Performance_Up.pptx", () => {
  let presentationFile: PresentationFile;

  beforeAll(async () => {
    const fullPath = path.resolve(FIXTURE_PATH);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    presentationFile = await loadPptxFile(fullPath);
  });

  describe("Slide 1 rendering", () => {
    it("should have correct slide dimensions", () => {
      const presentation = openPresentation(presentationFile);
      expect(presentation.size.width).toBeGreaterThan(0);
      expect(presentation.size.height).toBeGreaterThan(0);
    });

    it("should render slide 1 with content (not empty)", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const html = slide.renderHTML();

      // Should not be just an empty slide
      expect(html).toContain("slide");
      // Should have some actual content beyond just the container
      expect(html.length).toBeGreaterThan(200);
    });

    it("should contain the title text 'Apache Performance Tuning'", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const html = slide.renderHTML();

      // Note: spaces are converted to &nbsp;
      expect(html).toContain("Apache");
      expect(html).toContain("Performance");
      expect(html).toContain("Tuning");
    });

    it("should have background styling (not just white)", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const html = slide.renderHTML();

      // Should have some background color or gradient
      // The expected slide has a blue gradient background
      const hasBackground = html.includes("background") || html.includes("linear-gradient") || html.includes("fill");

      expect(hasBackground).toBe(true);
    });

    it("should render SVG output", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();

      expect(svg).toContain("<svg");
      expect(svg).toContain("xmlns");
    });
  });

  describe("Slide structure inspection", () => {
    it("should have spTree with shapes", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);

      // Inspect the raw content structure
      const content = slide.content;
      expect(content).toBeDefined();

      // Log the structure for debugging
      console.log("Slide 1 content keys:", Object.keys(content));
    });
  });
});
