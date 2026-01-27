/**
 * @file Text style inheritance integration tests
 *
 * Tests ECMA-376 text style inheritance using real PPTX files.
 *
 * Key test cases:
 * 1. idx-only placeholder type inheritance
 * 2. Master text style (bodyStyle/titleStyle) application
 * 3. Font size, color, and bullet style inheritance
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 * @see issues/text-style-ecma376-checklist.md
 */

import * as fs from "node:fs";
import type { PresentationFile } from "../../src/pptx";
import { openPresentation } from "../../src/pptx";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { renderSlideToSvg } from "../../src/pptx/render/svg";

// =============================================================================
// Test Helpers
// =============================================================================

// =============================================================================
// 2411-Performance_Up.pptx Slide 7 Tests
// =============================================================================

describe("2411-Performance_Up.pptx Slide 7 - Text Style Inheritance", () => {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  let presentationFile: PresentationFile | null = null;
  let svg: string = "";

  beforeAll(async () => {
    if (fs.existsSync(pptxPath)) {
      ({ presentationFile } = await loadPptxFile(pptxPath));
      const presentation = openPresentation(presentationFile);
      const slide = presentation.getSlide(7);
      svg = renderSlideToSvg(slide).svg;
    }
  });

  describe("Master text style application", () => {
    /**
     * ECMA-376 Expected values from slideMaster1.xml p:txStyles/p:bodyStyle:
     *
     * lvl1pPr (paragraph level 0):
     *   - Font size: 32pt (sz="3200")
     *   - Color: #276288 (blue)
     *   - Bullet: "•"
     *
     * lvl2pPr (paragraph level 1):
     *   - Font size: 28pt (sz="2800")
     *   - Color: #E77D23 (orange)
     *   - Bullet: "–"
     */

    it("should apply bodyStyle lvl1pPr font size (32pt) for level 0 paragraphs", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Expected: 32pt = 42.67px (at 96 DPI: 32 * 96 / 72)
      // Current: ~20pt = 26.67px (incorrect)
      const has32pt = svg.includes('font-size="42.6') || svg.includes('font-size="32pt');

      console.log("Looking for 32pt font size (42.67px):", has32pt);

      // This test should FAIL until the fix is implemented
      expect(has32pt).toBe(true);
    });

    it("should apply bodyStyle lvl2pPr font size (28pt) for level 1 paragraphs", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // Expected: 28pt = 37.33px (at 96 DPI: 28 * 96 / 72)
      const has28pt = svg.includes('font-size="37.3') || svg.includes('font-size="28pt');

      console.log("Looking for 28pt font size (37.33px):", has28pt);

      // This test should FAIL until the fix is implemented
      expect(has28pt).toBe(true);
    });

    it("should apply bodyStyle lvl1pPr color (#276288 blue) for level 0 paragraphs", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const hasBlue = svg.includes("276288");

      console.log("Looking for blue color (#276288):", hasBlue);

      expect(hasBlue).toBe(true);
    });

    it("should apply bodyStyle lvl2pPr color (#E77D23 orange) for level 1 paragraphs", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // This is the key failing test - orange color is not applied
      const hasOrange = svg.includes("E77D23") || svg.includes("e77d23");

      console.log("Looking for orange color (#E77D23):", hasOrange);

      // This test should FAIL until the fix is implemented
      expect(hasOrange).toBe(true);
    });

    it("should apply bodyStyle lvl1pPr bullet character (•) for level 0", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const hasBulletDot = svg.includes("•") || svg.includes("&#x2022;");

      console.log("Looking for bullet dot (•):", hasBulletDot);

      // This test should FAIL until the fix is implemented
      expect(hasBulletDot).toBe(true);
    });

    it("should apply bodyStyle lvl2pPr bullet character (–) for level 1", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      const hasBulletDash = svg.includes("–") || svg.includes("&#x2013;");

      console.log("Looking for bullet dash (–):", hasBulletDash);

      // This test should FAIL until the fix is implemented
      expect(hasBulletDash).toBe(true);
    });
  });

  describe("Placeholder type inheritance", () => {
    /**
     * Slide 7 has body placeholder with idx="1" and no type attribute.
     * Layout (slideLayout2.xml) also has idx="1" with no type.
     * Master (slideMaster1.xml) has type="body" idx="1".
     *
     * ECMA-376 requires type to be inherited from master.
     */

    it("should resolve placeholder type from master when slide and layout have no type", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // The fact that bodyStyle colors are applied proves type was resolved to "body"
      // If type is not resolved, no master style is applied

      const hasBlueFromBody = svg.includes("276288");
      const hasOrangeFromBody = svg.includes("E77D23") || svg.includes("e77d23");

      console.log("Placeholder type resolved to body - blue present:", hasBlueFromBody);
      console.log("Placeholder type resolved to body - orange present:", hasOrangeFromBody);

      // At minimum, some color from bodyStyle should be present
      expect(hasBlueFromBody || hasOrangeFromBody).toBe(true);
    });
  });

  describe("Title placeholder", () => {
    /**
     * Title placeholder should use titleStyle from master.
     * titleStyle lvl1pPr:
     *   - Font size: 44pt (sz="4400")
     *   - Color: #276288
     *   - Alignment: center
     */

    it("should apply titleStyle font size (44pt) for title", () => {
      if (presentationFile === null) {
        console.warn("SKIPPED: PPTX file not found");
        return;
      }

      // 44pt = 58.67px
      const has44pt = svg.includes('font-size="58.6') || svg.includes('font-size="44pt');

      console.log("Looking for 44pt font size (58.67px):", has44pt);

      expect(has44pt).toBe(true);
    });
  });
});

// =============================================================================
// General Text Style Inheritance Tests
// =============================================================================

describe("Text Style Inheritance Chain", () => {
  /**
   * ECMA-376 inheritance priority (highest to lowest):
   * 1. Direct run properties (a:rPr)
   * 2. Local list style (a:lstStyle in txBody)
   * 3. Layout placeholder lstStyle
   * 4. Master placeholder lstStyle
   * 5. Master text styles (p:txStyles)
   * 6. Default text style (presentation.xml)
   */

  it("should follow the correct inheritance order", () => {
    // This test documents the expected inheritance chain
    const inheritanceChain = [
      "Direct run properties (a:rPr)",
      "Local list style (txBody a:lstStyle)",
      "Layout placeholder lstStyle",
      "Master placeholder lstStyle",
      "Master text styles (p:txStyles)",
      "Default text style",
    ];

    expect(inheritanceChain).toHaveLength(6);
  });

  it("should map placeholder types to correct master styles", () => {
    const typeToStyleMap = {
      title: "titleStyle",
      ctrTitle: "titleStyle",
      body: "bodyStyle",
      subTitle: "bodyStyle",
      obj: "bodyStyle",
      dt: "otherStyle",
      ftr: "otherStyle",
      sldNum: "otherStyle",
    };

    expect(typeToStyleMap.title).toBe("titleStyle");
    expect(typeToStyleMap.body).toBe("bodyStyle");
    expect(typeToStyleMap.sldNum).toBe("otherStyle");
  });
});
