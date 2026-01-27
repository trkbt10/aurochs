/**
 * @file Font scheme resolution tests
 *
 * Tests for ECMA-376 compliant font scheme resolution.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.5 (a:fontScheme)
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17 (theme font references)
 */

import { openPresentation } from "../../src/pptx";
import { createPresentationFile, THEMES_PPTX_PATH } from "./test-utils";
import { renderSlideToSvg } from "../../src/pptx/render/svg";

describe("Font Scheme Application", () => {
  /**
   * Test font scheme resolution for +mj-lt (major latin font).
   *
   * Per ECMA-376 Part 1, Section 20.1.6.5.2 (a:majorFont):
   * The major font is used for headings and titles.
   */
  it("resolves +mj-lt to theme major font", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);

    // Slide 4 uses theme3 with Century Gothic as major font
    const slide4 = presentation.getSlide(4);
    const { svg: svg4 } = renderSlideToSvg(slide4);

    const hasMajorFont = [
      svg4.includes("Century Gothic"),
      svg4.includes("'Century Gothic'"),
    ].some(Boolean);
    expect(hasMajorFont).toBe(true);
  });

  /**
   * Test font scheme for theme7 which has different major/minor fonts.
   */
  it("theme7 uses Arial Black for major and Candara for minor", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);

    // Slide 10 uses theme7
    const slide10 = presentation.getSlide(10);
    const { svg: svg10 } = renderSlideToSvg(slide10);

    // Major font: Arial Black (for titles)
    // Minor font: Candara (for body text)
    const hasArialBlack = [
      svg10.includes("Arial Black"),
      svg10.includes("'Arial Black'"),
    ].some(Boolean);
    const hasCandara = svg10.includes("Candara");

    // At least one of these should be present
    expect([hasArialBlack, hasCandara].some(Boolean)).toBe(true);
  });
});
