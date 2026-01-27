/**
 * @file Integration tests for mc:AlternateContent handling with real PPTX files
 *
 * Tests that mc:AlternateContent is properly handled across the parser pipeline.
 *
 * @see ECMA-376 Part 3, Section 10.2.1
 */

import * as fs from "node:fs";
import { openPresentation } from "../src/pptx";
import { loadPptxFile } from "../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "../src/pptx/render/svg";

describe("mc:AlternateContent Integration", () => {
  describe("2411-Performance_Up.pptx slide 5 (p:blipFill in mc:AlternateContent)", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    let svg: string = "";

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        const { presentationFile } = await loadPptxFile(pptxPath);
        const presentation = openPresentation(presentationFile);
        const slide = presentation.getSlide(5);
        svg = renderSlideToSvg(slide).svg;
      }
    });

    it("renders images from mc:Fallback blipFill", () => {
      // Should contain image elements from the mc:Fallback path
      expect(svg).toContain("<image");
      // Should have embedded image data
      expect(svg).toContain("data:image");
    });
  });

  describe("bug64693.pptx (p:oleObj in mc:AlternateContent)", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/bug64693.pptx";
    let svg: string = "";

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        const { presentationFile } = await loadPptxFile(pptxPath);
        const presentation = openPresentation(presentationFile);
        const slide = presentation.getSlide(1);
        svg = renderSlideToSvg(slide).svg;
      }
    });

    it("parses OLE objects with mc:AlternateContent without throwing", () => {
      // Should produce valid SVG
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });

  describe("bug54570.pptx (p:oleObj in mc:AlternateContent)", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/bug54570.pptx";
    let svg: string = "";

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        const { presentationFile } = await loadPptxFile(pptxPath);
        const presentation = openPresentation(presentationFile);
        const slide = presentation.getSlide(1);
        svg = renderSlideToSvg(slide).svg;
      }
    });

    it("parses OLE objects with mc:AlternateContent without throwing", () => {
      // Should produce valid SVG
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });
});
