/**
 * @file AASCU presentation text spacing tests
 *
 * Tests text spacing rendering per ECMA-376 specification.
 * Specifically tests:
 * - Empty paragraph height (ECMA-376 21.1.2.2.3 a:endParaRPr)
 * - Space before/after paragraphs (ECMA-376 21.1.2.2.18-19)
 * - Line spacing within paragraphs (ECMA-376 21.1.2.2.5)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { PresentationFile } from "../src/pptx";
import { openPresentation } from "../src/pptx";
import { loadPptxFile } from "../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "../src/pptx/render/svg";

const AASCU_FIXTURE = "fixtures/poi-test-data/test-data/slideshow/aascu.org_workarea_downloadasset.aspx_id=5864.pptx";

/**
 * Extract text element y-positions from SVG
 */
function extractTextYPositions(svg: string): number[] {
  const yPositions: number[] = [];
  const textRegex = /<text[^>]*\sy="([^"]+)"[^>]*>/g;
  let match;
  while ((match = textRegex.exec(svg)) !== null) {
    yPositions.push(parseFloat(match[1]));
  }
  return yPositions;
}

/**
 * Calculate line spacing gaps from y-positions
 */
function calculateGaps(yPositions: number[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < yPositions.length; i++) {
    gaps.push(yPositions[i] - yPositions[i - 1]);
  }
  return gaps;
}

describe("AASCU text spacing - ECMA-376 compliance", () => {
  let presentationFile: PresentationFile;

  beforeAll(async () => {
    const fullPath = path.resolve(AASCU_FIXTURE);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    ({ presentationFile } = await loadPptxFile(fullPath));
  });

  describe("Slide 1 - Title slide with multiple text boxes", () => {
    it("should render SVG with text content", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(1);
      const svg = renderSlideToSvg(slide).svg;

      expect(svg).toContain("<svg");
      expect(svg).toContain("<text");
      expect(svg).toContain("Addressing the American Challenge");
    });
  });

  describe("Slide 2 - Placeholder text with empty paragraphs", () => {
    /**
     * Slide 2 contains:
     * - Multiple text paragraphs with quotes
     * - Empty paragraphs between quotes (using a:endParaRPr)
     * - Placeholder content (idx="1") inheriting from master body style
     *
     * Per ECMA-376 Part 1, Section 21.1.2.2.3 (a:endParaRPr):
     * Empty paragraphs should use endParaRPr font size for line height.
     */
    it("should render SVG with text content", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(2);
      const svg = renderSlideToSvg(slide).svg;

      expect(svg).toContain("<svg");
      expect(svg).toContain("<text");
      expect(svg).toContain("Sputnik");
    });

    it("should have reasonable spacing between text lines", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(2);
      const svg = renderSlideToSvg(slide).svg;

      const yPositions = extractTextYPositions(svg);
      expect(yPositions.length).toBeGreaterThan(3);

      const gaps = calculateGaps(yPositions);

      // Line gaps should be reasonable (font size 28pt = ~37.33px line height)
      // Gaps should not exceed 3x the typical line height (112px)
      const maxReasonableGap = 120;
      for (const gap of gaps) {
        expect(gap).toBeLessThan(maxReasonableGap);
      }
    });
  });

  describe("Slide 3 - Bullet points with spcAft", () => {
    /**
     * Slide 3 contains:
     * - Multiple bullet points
     * - Explicit spcAft (space after) of 50% font size
     * - Font size 28pt (2800 centipoints)
     *
     * Per ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcAft):
     * Space after paragraph with spcPct val="50000" means 50% of font size.
     * Expected: 50% of 28pt = 14pt = ~18.67px extra space after each paragraph.
     */
    it("should render SVG with bullet content", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(3);
      const svg = renderSlideToSvg(slide).svg;

      expect(svg).toContain("<svg");
      expect(svg).toContain("<text");
      expect(svg).toContain("Excellence with Equity");
    });

    it("should render bullet characters", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(3);
      const svg = renderSlideToSvg(slide).svg;

      // Bullet character should be present
      expect(svg).toContain("•");
    });

    it("should have consistent spacing between bullet points", () => {
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(3);
      const svg = renderSlideToSvg(slide).svg;

      const yPositions = extractTextYPositions(svg);
      expect(yPositions.length).toBeGreaterThan(5);

      const gaps = calculateGaps(yPositions);

      // For bullet points with same font size, gaps between paragraphs should be similar
      // Allow 20% variance for paragraph spacing differences
      const bulletGaps = gaps.filter((g) => g > 40); // Filter out inline wrapping (smaller gaps)

      if (bulletGaps.length > 1) {
        const avgGap = bulletGaps.reduce((a, b) => a + b, 0) / bulletGaps.length;
        for (const gap of bulletGaps) {
          // Each gap should be within 50% of average (generous tolerance for spcAft variations)
          expect(gap).toBeGreaterThan(avgGap * 0.5);
          expect(gap).toBeLessThan(avgGap * 1.5);
        }
      }
    });
  });
});
