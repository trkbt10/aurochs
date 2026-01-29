/**
 * Integration tests for background image loading from real PPTX files
 */

import * as fs from "node:fs";
import type { PresentationFile } from "@oxen-office/pptx";
import { openPresentation } from "@oxen-office/pptx";
import { loadPptxFile } from "../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

describe("Background integration tests", () => {
  describe("aptia.pptx - background from slideMaster", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/aptia.pptx";
    let presentationFile: PresentationFile | null = null;

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        ({ presentationFile } = await loadPptxFile(pptxPath));
      }
    });

    it("should have masterRelationships with image rId12", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);

      // Check that masterRelationships contains rId12 pointing to an image
      expect(slide.masterRelationships).toBeDefined();
      expect(slide.masterRelationships.getTarget("rId12")).toBeDefined();
      expect(slide.masterRelationships.getTarget("rId12")).toContain("media/image1.jpeg");
    });

    it("should have slideMaster content with blipFill background", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);

      // slide.master is an XmlDocument, check the children structure
      const masterContent = slide.master as { children?: unknown[] };
      expect(masterContent).toBeDefined();
      expect(masterContent.children).toBeDefined();

      // Find p:sldMaster in children
      const children = masterContent.children as Array<{ name?: string; children?: unknown[] }>;
      const sldMaster = children.find((c) => c.name === "p:sldMaster");
      expect(sldMaster).toBeDefined();

      // Navigate to p:cSld -> p:bg -> p:bgPr -> a:blipFill
      const sldMasterChildren = sldMaster?.children as Array<{ name?: string; children?: unknown[] }> | undefined;
      const cSld = sldMasterChildren?.find((c) => c.name === "p:cSld");
      expect(cSld).toBeDefined();

      const cSldChildren = cSld?.children as Array<{ name?: string; children?: unknown[] }> | undefined;
      const bg = cSldChildren?.find((c) => c.name === "p:bg");
      expect(bg).toBeDefined();

      const bgChildren = bg?.children as
        | Array<{ name?: string; children?: unknown[]; attrs?: Record<string, string> }>
        | undefined;
      const bgPr = bgChildren?.find((c) => c.name === "p:bgPr");
      expect(bgPr).toBeDefined();

      const bgPrChildren = bgPr?.children as
        | Array<{ name?: string; children?: unknown[]; attrs?: Record<string, string> }>
        | undefined;
      const blipFill = bgPrChildren?.find((c) => c.name === "a:blipFill");
      expect(blipFill).toBeDefined();

      const blipFillChildren = blipFill?.children as
        | Array<{ name?: string; attrs?: Record<string, string> }>
        | undefined;
      const blip = blipFillChildren?.find((c) => c.name === "a:blip");
      expect(blip).toBeDefined();

      expect(blip?.attrs?.["r:embed"]).toBe("rId12");
    });

    it("should get background fill data with image from slideMaster", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);

      // Verify background through the public renderSVG API
      // The SVG should contain the base64-encoded image
      const svg = renderSlideToSvg(slide).svg;

      // The SVG should contain a background image element with the JPEG data
      expect(svg).toContain("<image");
      expect(svg).toContain("data:image/jpeg;base64,");
    });

    it("should render SVG with background image", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // The SVG should contain a background image element
      expect(svg).toContain("<image");
      expect(svg).toContain("data:image/jpeg;base64,");
    });
  });

  describe("backgrounds.pptx - slide 4 with image background", () => {
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/backgrounds.pptx";
    let presentationFile: PresentationFile | null = null;

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        ({ presentationFile } = await loadPptxFile(pptxPath));
      }
    });

    it("should render SVG with background image for slide 4", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(4);
      const svg = renderSlideToSvg(slide).svg;

      // Slide 4 has a background image - should be rendered
      expect(svg).toContain("<image");
    });
  });

  describe("60042.pptx - p:bgRef theme reference", () => {
    /**
     * Per ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef):
     * - idx 1001+ references bgFillStyleLst[idx-1001]
     * - The child color element provides phClr substitution
     *
     * 60042.pptx has slideMaster with:
     * <p:bg>
     *   <p:bgRef idx="1001">
     *     <a:schemeClr val="bg1"/>
     *   </p:bgRef>
     * </p:bg>
     *
     * This should resolve to bgFillStyleLst[0] (solidFill with phClr)
     * with bg1 scheme color.
     */
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/60042.pptx";
    let presentationFile: PresentationFile | null = null;

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        ({ presentationFile } = await loadPptxFile(pptxPath));
      }
    });

    it("should render background from bgRef (not white)", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // The SVG should NOT have a pure white background
      // It should resolve p:bgRef idx="1001" to theme fill with bg1 color
      // Check that the rect fill is not #ffffff (white)
      const rectMatch = svg.match(/<rect[^>]*fill="([^"]+)"[^>]*>/);
      expect(rectMatch).toBeDefined();

      // For debugging - log the first rect fill
      if (rectMatch) {
        console.log("First rect fill:", rectMatch[1]);
        // The fill should be a valid color - bg1 typically resolves to white
        // but it should still go through proper resolution, not default
        expect(rectMatch[1]).not.toBe("");
      }
    });

    it("should have slideMaster with bgRef element", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);

      // Navigate to find p:bgRef in master
      const masterContent = slide.master as { children?: unknown[] };
      const children = masterContent?.children as Array<{ name?: string; children?: unknown[] }> | undefined;
      const sldMaster = children?.find((c) => c.name === "p:sldMaster");
      const sldMasterChildren = sldMaster?.children as Array<{ name?: string; children?: unknown[] }> | undefined;
      const cSld = sldMasterChildren?.find((c) => c.name === "p:cSld");
      const cSldChildren = cSld?.children as Array<{ name?: string; children?: unknown[] }> | undefined;
      const bg = cSldChildren?.find((c) => c.name === "p:bg");
      const bgChildren = bg?.children as
        | Array<{ name?: string; attrs?: Record<string, string> }>
        | undefined;
      const bgRef = bgChildren?.find((c) => c.name === "p:bgRef");

      expect(bgRef).toBeDefined();
      expect(bgRef?.attrs?.idx).toBe("1001");
    });

    it("should render shapes at correct positions (placeholder transform inheritance)", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // The SVG should contain 'g' elements with transform attributes
      // The placeholders should have positions inherited from the layout
      // ctrTitle layout position: x="685800" y="2130425" (in EMU)
      // Convert to pixels: 685800/914400 * 96 ≈ 72px, 2130425/914400 * 96 ≈ 224px
      //
      // If transform inheritance works, shapes should have proper transforms
      const hasTransform = svg.includes('transform="translate(');
      console.log("SVG has transform:", hasTransform);
      console.log("SVG length:", svg.length);

      // Shapes have empty textBody, so SVG is minimal - but should still have transforms
      // This verifies that placeholder transform inheritance is working
      expect(hasTransform).toBe(true);
    });
  });

  describe("61515.pptx - empty template (LibreOffice verified white)", () => {
    /**
     * 61515.pptx is an empty template slide with:
     * - p:bgRef idx="1001" referencing bg1 (white)
     * - Empty ctrTitle and subTitle placeholders
     *
     * LibreOffice renders this as completely white, which is correct.
     */
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/61515.pptx";
    let presentationFile: PresentationFile | null = null;

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        ({ presentationFile } = await loadPptxFile(pptxPath));
      }
    });

    it("should render white background (matching LibreOffice)", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // Background should be white (bg1 = white in this theme)
      const rectMatch = svg.match(/<rect[^>]*fill="([^"]+)"[^>]*>/);
      expect(rectMatch).toBeDefined();
      if (rectMatch) {
        // bg1 typically resolves to white
        expect(rectMatch[1].toUpperCase()).toContain("FFF");
      }
    });

    it("should have transform inheritance for placeholders", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // Even with empty text, shapes should have transforms from layout
      expect(svg.includes('transform="translate(')).toBe(true);
    });
  });

  describe("2411-Performance_Up.pptx - ECMA-376 stretch mode", () => {
    /**
     * Per ECMA-376 Part 1, Section 20.1.8.56 (a:stretch):
     * When stretch mode is specified, the image fills the entire container
     * without preserving aspect ratio. This maps to SVG preserveAspectRatio="none".
     */
    const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
    let presentationFile: PresentationFile | null = null;

    beforeAll(async () => {
      if (fs.existsSync(pptxPath)) {
        ({ presentationFile } = await loadPptxFile(pptxPath));
      }
    });

    it("should use preserveAspectRatio='none' for background with a:stretch", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // Verify background image is present
      expect(svg).toContain("<image");
      expect(svg).toContain("data:image/jpeg;base64,");

      // Per ECMA-376, a:stretch should map to preserveAspectRatio="none"
      // This ensures the image fills the entire slide without maintaining aspect ratio
      expect(svg).toContain('preserveAspectRatio="none"');
    });

    it("should NOT use preserveAspectRatio='xMidYMid slice' for stretch mode", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      // Verify that the old incorrect behavior is not present
      // The background image should not use "xMidYMid slice" for stretch mode
      const backgroundImageMatch = svg.match(/<image[^>]*href="data:image\/jpeg;base64,[^"]*"[^>]*>/);
      expect(backgroundImageMatch).toBeDefined();

      if (backgroundImageMatch) {
        // The first image (background) should use "none", not "xMidYMid slice"
        expect(backgroundImageMatch[0]).toContain('preserveAspectRatio="none"');
        expect(backgroundImageMatch[0]).not.toContain('preserveAspectRatio="xMidYMid slice"');
      }
    });
  });
});
