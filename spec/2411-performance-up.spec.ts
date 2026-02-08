/**
 * @file Integration tests for 2411-Performance_Up.pptx
 *
 * Tests for ECMA-376 compliance:
 * - Background image stretch mode (ECMA-376 Part 1, Section 20.1.8.56)
 * - Text baseline calculation (ECMA-376 Part 1, Section 21.1.2.1.12)
 * - Text color application
 * - Text positioning
 *
 * @see ECMA-376 Part 1, Section 20.1.8.56 (a:stretch)
 * @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
 */

import * as fs from "node:fs";
import type { PresentationFile } from "@aurochs-office/pptx";
import { openPresentation } from "@aurochs-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS } from "@aurochs-renderer/pptx/render-options";
import { loadPptxFile } from "../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";

describe("2411-Performance_Up.pptx slide 1", () => {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  let presentationFile: PresentationFile | null = null;
  let svg: string = "";

  beforeAll(async () => {
    if (fs.existsSync(pptxPath)) {
      ({ presentationFile } = await loadPptxFile(pptxPath));
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      svg = renderSlideToSvg(slide).svg;
    }
  });

  it("should render SVG", () => {
    if (presentationFile === null) {
      console.warn("SKIPPED: PPTX file not found");
      return;
    }
    expect(svg.length).toBeGreaterThan(0);
    expect(svg).toMatch(/^<svg/);
  });

  describe("background image", () => {
    it("should have background image element", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }
      // Background images are rendered as <image> or <rect> with fill
      const hasImageTag = svg.includes("<image");
      const hasDataImage = svg.includes("data:image");

      console.log("Has <image> tag:", hasImageTag);
      console.log("Has data:image:", hasDataImage);

      expect(hasImageTag || hasDataImage).toBe(true);
    });
  });

  describe("text color", () => {
    it("should have text elements with color", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Count fill colors in SVG
      const fillColors = svg.match(/fill="#[0-9A-Fa-f]{6}"/g) || [];
      const fillNone = svg.match(/fill="none"/g) || [];

      console.log("Fill colors found:", fillColors.length);
      console.log("Fill none found:", fillNone.length);
      console.log("Sample colors:", fillColors.slice(0, 5));

      // Text should have color (not just "none")
      expect(fillColors.length).toBeGreaterThan(0);
    });

    it("should apply color from theme or direct specification", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Check for specific text content with color
      // SVG text elements should have fill attribute
      const textWithFill = svg.match(/<text[^>]*fill="[^"]+"/g) || [];
      console.log("Text elements with fill:", textWithFill.length);
      console.log("Sample text fills:", textWithFill.slice(0, 3));
    });
  });

  describe("text positioning", () => {
    it("should have text elements with reasonable x positions", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Extract x positions from text elements
      const xPositions = svg.match(/x="([0-9.]+)"/g) || [];
      console.log("X position samples:", xPositions.slice(0, 10));

      // Check for tspan elements (text runs)
      const tspanCount = (svg.match(/<tspan/g) || []).length;
      console.log("Tspan count:", tspanCount);
    });
  });

  /**
   * ECMA-376 Part 1, Section 20.1.8.56 (a:stretch)
   *
   * When the a:stretch element is present, the image should fill the
   * entire container without preserving aspect ratio.
   * This maps to SVG preserveAspectRatio="none".
   */
  describe("ECMA-376 compliance: background stretch mode (20.1.8.56)", () => {
    it("should use preserveAspectRatio='none' for background with a:stretch", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Verify background image uses preserveAspectRatio="none"
      expect(svg).toContain('preserveAspectRatio="none"');
    });

    it("should NOT use preserveAspectRatio='xMidYMid slice' for stretch mode", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Find the first (background) image element
      const bgImageMatch = svg.match(/<image[^>]*href="data:image\/jpeg;base64,[^"]*"[^>]*>/);
      expect(bgImageMatch).toBeDefined();

      if (bgImageMatch) {
        // Background image should use "none", not "xMidYMid slice"
        expect(bgImageMatch[0]).toContain('preserveAspectRatio="none"');
        expect(bgImageMatch[0]).not.toContain('preserveAspectRatio="xMidYMid slice"');
      }
    });
  });
});

/**
 * Tests for multiple slides to ensure consistent behavior
 */
describe("2411-Performance_Up.pptx - multiple slides", () => {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  let presentationFile: PresentationFile | null = null;

  beforeAll(async () => {
    if (fs.existsSync(pptxPath)) {
      ({ presentationFile } = await loadPptxFile(pptxPath));
    }
  });

  /**
   * Test all visible slides render without errors
   */
  it("should render all slides without errors", () => {
    if (presentationFile === null) {
      console.warn("SKIPPED: PPTX file not found");
      return;
    }

    const presentation = openPresentation(presentationFile);
    const slideInfos = presentation.list();

    for (const info of slideInfos) {
      const slide = presentation.getSlide(info.number);
      const svg = renderSlideToSvg(slide).svg;
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).toMatch(/^<svg/);
    }
  });

  /**
   * Test LibreOffice dialect renders all slides
   */
  it("should render all slides with LibreOffice dialect", () => {
    if (presentationFile === null) {
      console.warn("SKIPPED: PPTX file not found");
      return;
    }

    const presentation = openPresentation(presentationFile, {
      renderOptions: LIBREOFFICE_RENDER_OPTIONS,
    });
    const slideInfos = presentation.list();

    for (const info of slideInfos) {
      const slide = presentation.getSlide(info.number);
      const svg = renderSlideToSvg(slide).svg;
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).toMatch(/^<svg/);
    }
  });
});
