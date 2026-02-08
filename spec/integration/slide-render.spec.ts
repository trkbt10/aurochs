/**
 * @file Integration tests for slide rendering
 * Tests actual PPTX file rendering against expected output
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "@aurochs-office/pptx";
import { openPresentation } from "@aurochs-office/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";

const FIXTURE_PATH = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";

describe("2411-Performance_Up.pptx", () => {
  let presentationFile: PresentationFile;

  beforeAll(async () => {
    const fullPath = path.resolve(FIXTURE_PATH);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    ({ presentationFile } = await loadPptxFile(fullPath));
  });

  describe("Slide 1 rendering", () => {
    it("should have correct slide dimensions", () => {
      const presentation = openPresentation(presentationFile);
      expect(presentation.size.width).toBeGreaterThan(0);
      expect(presentation.size.height).toBeGreaterThan(0);
    });

    it("should render SVG output", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      expect(svg).toContain("<svg");
      expect(svg).toContain("xmlns");
    });

    it("should contain the title text 'Apache Performance Tuning'", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      expect(svg).toContain("Apache");
      expect(svg).toContain("Performance");
      expect(svg).toContain("Tuning");
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
