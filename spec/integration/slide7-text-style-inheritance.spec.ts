/**
 * @file Slide 7 Text Style Inheritance Tests - ECMA-376 Compliance
 *
 * Tests text style inheritance from master slide txStyles for 2411-Performance_Up.pptx Slide 7.
 * Validates font size, color, and bullet style inheritance per ECMA-376 specification.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr - Run Properties)
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet and Numbering)
 * @see ECMA-376 Part 1, Section 21.1.2.4.4-5 (a:buClr/a:buClrTx)
 */

import * as fs from "node:fs";
import { openPresentation } from "@oxen-office/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

// =============================================================================
// Test Setup
// =============================================================================

// =============================================================================
// ECMA-376 Expected Values
// =============================================================================

/**
 * Expected values from slideMaster1.xml > p:txStyles > p:titleStyle
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 */
const TITLE_STYLE = {
  fontSize: 44, // sz="4400" / 100
  color: "#276288", // a:srgbClr val="276288"
} as const;

/**
 * Expected values from slideMaster1.xml > p:txStyles > p:bodyStyle
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 */
const BODY_STYLE = {
  lvl1: {
    fontSize: 32, // sz="3200" / 100
    color: "#276288", // a:srgbClr val="276288"
    bulletChar: "•", // a:buChar char="•"
    marginLeft: 342900, // marL="342900" EMU
    indent: -342900, // indent="-342900" EMU
    spaceBefore: 20, // a:spcPct val="20000" = 20%
  },
  lvl2: {
    fontSize: 28, // sz="2800" / 100
    color: "#E77D23", // a:srgbClr val="E77D23"
    bulletChar: "–", // a:buChar char="–"
    marginLeft: 742950, // marL="742950" EMU
    indent: -285750, // indent="-285750" EMU
    spaceBefore: 20, // a:spcPct val="20000" = 20%
  },
} as const;

/**
 * Points to pixels conversion at 96 DPI (1pt = 96/72 px).
 */
function ptToPx(pt: number): number {
  return pt * (96 / 72);
}

// =============================================================================
// Tests
// =============================================================================

describe("2411-Performance_Up.pptx Slide 7 - Text Style Inheritance (ECMA-376)", () => {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  let svg: string = "";

  beforeAll(async () => {
    if (!fs.existsSync(pptxPath)) {
      console.warn(`Skipping test: ${pptxPath} not found`);
      return;
    }

    const { presentationFile } = await loadPptxFile(pptxPath);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(7);
    svg = renderSlideToSvg(slide).svg;
  });

  describe("Title Style Inheritance (p:titleStyle)", () => {
    /**
     * Per ECMA-376 Part 1, Section 21.1.2.3.9:
     * Font size should be inherited from master txStyles > titleStyle > lvl1pPr > defRPr@sz
     */
    it("should apply title font size (44pt) from master titleStyle", () => {
      // Title text: "No Silver Bullet"
      // SVG uses font-size="XXpx" attribute format
      const titleMatch = svg.match(/font-size="([\d.]+)px"[^>]*>No Silver Bullet/);
      expect(titleMatch).not.toBeNull();

      if (titleMatch) {
        const fontSize = parseFloat(titleMatch[1]);
        const expectedPx = ptToPx(TITLE_STYLE.fontSize);
        // Allow 1px tolerance for floating point
        expect(Math.abs(fontSize - expectedPx)).toBeLessThan(1);
      }
    });

    /**
     * Per ECMA-376 Part 1, Section 20.1.8.54:
     * Text color should be inherited from master txStyles > titleStyle > lvl1pPr > defRPr > solidFill
     */
    it("should apply title color (#276288) from master titleStyle", () => {
      // Look for title text with fill color
      const titleColorMatch = svg.match(/fill="#([0-9A-Fa-f]{6})"[^>]*>No Silver Bullet/);
      expect(titleColorMatch).not.toBeNull();

      if (titleColorMatch) {
        expect(`#${titleColorMatch[1]}`).toBe(TITLE_STYLE.color);
      }
    });
  });

  describe("Body Style Level 1 Inheritance (p:bodyStyle > lvl1pPr)", () => {
    /**
     * Per ECMA-376 Part 1, Section 21.1.2.3.9:
     * Font size for level 0 paragraphs should be 32pt from master bodyStyle > lvl1pPr
     */
    it("should apply lvl1 font size (32pt) from master bodyStyle", () => {
      // Level 0 text: "Every site is different"
      // SVG structure: <text ... font-size="XXpx" ...>Text</text>
      const level0Match = svg.match(/<text[^>]*font-size="([\d.]+)px"[^>]*>Every site is different<\/text>/);
      expect(level0Match).not.toBeNull();

      if (level0Match) {
        const fontSize = parseFloat(level0Match[1]);
        const expectedPx = ptToPx(BODY_STYLE.lvl1.fontSize);
        expect(Math.abs(fontSize - expectedPx)).toBeLessThan(1);
      }
    });

    /**
     * Per ECMA-376 Part 1, Section 20.1.8.54:
     * Text color for level 0 should be #276288 from master bodyStyle > lvl1pPr > defRPr > solidFill
     */
    it("should apply lvl1 text color (#276288) from master bodyStyle", () => {
      const level0ColorMatch = svg.match(/<text[^>]*fill="#([0-9A-Fa-f]{6})"[^>]*>Every site is different<\/text>/);
      expect(level0ColorMatch).not.toBeNull();

      if (level0ColorMatch) {
        expect(`#${level0ColorMatch[1]}`).toBe(BODY_STYLE.lvl1.color);
      }
    });

    /**
     * Per ECMA-376 Part 1, Section 21.1.2.4.1:
     * Bullet character should be "•" from master bodyStyle > lvl1pPr > buChar
     */
    it("should apply lvl1 bullet character (•) from master bodyStyle", () => {
      // Look for bullet character in its own text element
      const bulletMatch = svg.match(/<text[^>]*>•<\/text>/);
      expect(bulletMatch).not.toBeNull();
    });

    /**
     * Per ECMA-376 Part 1, Section 21.1.2.4.4-5:
     * When a:buClr is not specified and a:buClrTx is not present,
     * bullet color should follow text color (implicit buClrTx behavior).
     *
     * This is a KNOWN ISSUE: Current implementation uses #000000 instead.
     */
    it("should apply lvl1 bullet color (#276288) following text color per ECMA-376 21.1.2.4.4", () => {
      // Find bullet "•" elements and check their fill color
      // Per ECMA-376: No buClr means follow text color
      const bulletMatches = svg.matchAll(/fill="#([0-9A-Fa-f]{6})"[^>]*>•</g);

      for (const match of bulletMatches) {
        const bulletColor = `#${match[1]}`;
        // ECMA-376: Bullet color should follow text color when buClr is not specified
        expect(bulletColor).toBe(BODY_STYLE.lvl1.color);
      }
    });
  });

  describe("Body Style Level 2 Inheritance (p:bodyStyle > lvl2pPr)", () => {
    /**
     * Per ECMA-376 Part 1, Section 21.1.2.3.9:
     * Font size for level 1 paragraphs should be 28pt from master bodyStyle > lvl2pPr
     */
    it("should apply lvl2 font size (28pt) from master bodyStyle", () => {
      // Level 1 text: "Dynamic Content"
      const level1Match = svg.match(/<text[^>]*font-size="([\d.]+)px"[^>]*>Dynamic Content<\/text>/);
      expect(level1Match).not.toBeNull();

      if (level1Match) {
        const fontSize = parseFloat(level1Match[1]);
        const expectedPx = ptToPx(BODY_STYLE.lvl2.fontSize);
        expect(Math.abs(fontSize - expectedPx)).toBeLessThan(1);
      }
    });

    /**
     * Per ECMA-376 Part 1, Section 20.1.8.54:
     * Text color for level 1 should be #E77D23 from master bodyStyle > lvl2pPr > defRPr > solidFill
     */
    it("should apply lvl2 text color (#E77D23) from master bodyStyle", () => {
      const level1ColorMatch = svg.match(/<text[^>]*fill="#([0-9A-Fa-f]{6})"[^>]*>Dynamic Content<\/text>/);
      expect(level1ColorMatch).not.toBeNull();

      if (level1ColorMatch) {
        expect(`#${level1ColorMatch[1]}`).toBe(BODY_STYLE.lvl2.color);
      }
    });

    /**
     * Per ECMA-376 Part 1, Section 21.1.2.4.1:
     * Bullet character should be "–" from master bodyStyle > lvl2pPr > buChar
     */
    it("should apply lvl2 bullet character (–) from master bodyStyle", () => {
      // Look for bullet character "–" (en dash) in its own text element
      const bulletMatch = svg.match(/<text[^>]*>–<\/text>/);
      expect(bulletMatch).not.toBeNull();
    });

    /**
     * Per ECMA-376 Part 1, Section 21.1.2.4.4-5:
     * Bullet color should follow text color #E77D23.
     *
     * This is a KNOWN ISSUE: Current implementation uses #000000 instead.
     */
    it("should apply lvl2 bullet color (#E77D23) following text color per ECMA-376 21.1.2.4.4", () => {
      // Find bullet "–" elements and check their fill color
      const bulletMatches = svg.matchAll(/fill="#([0-9A-Fa-f]{6})"[^>]*>–</g);

      for (const match of bulletMatches) {
        const bulletColor = `#${match[1]}`;
        // ECMA-376: Bullet color should follow text color when buClr is not specified
        expect(bulletColor).toBe(BODY_STYLE.lvl2.color);
      }
    });
  });

  describe("Paragraph Spacing (a:spcBef) - ECMA-376 21.1.2.2.18", () => {
    /**
     * Per ECMA-376 Part 1, Section 21.1.2.2.18:
     * Space before paragraph is specified as percentage of line height.
     * Master bodyStyle specifies spcPct val="20000" = 20%
     */
    it("should have appropriate vertical spacing between paragraphs", () => {
      // Extract y positions of text elements
      const yMatches = svg.matchAll(/<text[^>]*y="([\d.]+)"[^>]*>/g);
      const yPositions: number[] = [];

      for (const match of yMatches) {
        yPositions.push(parseFloat(match[1]));
      }

      // There should be multiple text elements with increasing y positions
      expect(yPositions.length).toBeGreaterThan(0);

      // Verify y positions are generally increasing (some may be at same y for bullets)
      const uniqueY = [...new Set(yPositions)].sort((a, b) => a - b);
      expect(uniqueY.length).toBeGreaterThan(1);
    });
  });

  describe("Margin and Indent (marL/indent) - ECMA-376 21.1.2.2.7", () => {
    /**
     * Per ECMA-376 Part 1, Section 21.1.2.2.7:
     * - marL: Left margin from text box edge
     * - indent: First line indent (negative = hanging indent)
     *
     * For hanging indent: bullet at marL + indent, text at marL + indent + bulletWidth
     *
     * Expected values from master bodyStyle:
     * - lvl1: marL=342900 EMU (35.99px), indent=-342900 EMU
     * - lvl2: marL=742950 EMU (77.86px), indent=-285750 EMU
     *
     * This is a KNOWN ISSUE: Current implementation doesn't properly inherit
     * marL from master txStyles, resulting in both levels at same x position.
     */
    it("should have bullets at appropriate x positions for hanging indent", () => {
      // Level 0 bullets (•) should be at ~36px (marL + indent = 0 for hanging indent)
      // Level 1 bullets (–) should be at ~48px (larger marL)

      const lvl0BulletMatch = svg.match(/<text[^>]*x="([\d.]+)"[^>]*>•<\/text>/);
      const lvl1BulletMatch = svg.match(/<text[^>]*x="([\d.]+)"[^>]*>–<\/text>/);

      expect(lvl0BulletMatch).not.toBeNull();
      expect(lvl1BulletMatch).not.toBeNull();

      if (lvl0BulletMatch && lvl1BulletMatch) {
        const lvl0X = parseFloat(lvl0BulletMatch[1]);
        const lvl1X = parseFloat(lvl1BulletMatch[1]);

        // Expected: lvl1 bullets should be more indented than lvl0
        // Per ECMA-376 Part 1, Section 21.1.2.2.7:
        // lvl2 has larger marL (742950 EMU) than lvl1 (342900 EMU)
        expect(lvl1X).toBeGreaterThan(lvl0X);
      }
    });
  });
});
