/**
 * @file Visual regression tests for themes.pptx
 *
 * Individual visual regression tests for each slide of themes.pptx.
 * These tests compare rendered SVG output against baseline snapshots.
 *
 * Test methodology:
 * - Uses LibreOffice-generated PNGs as baseline
 * - Compares rendered SVG converted to PNG against baseline
 * - Threshold: 15% pixel difference allowed
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import { openPresentation } from "@aurochs-office/pptx";
import { compareSvgToSnapshot } from "../visual-regression/compare";
import { createPresentationFile, THEMES_PPTX_PATH } from "./test-utils";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";

const DIFF_THRESHOLD = 0.15; // 15% allowed difference

describe("Theme Visual Regression - themes.pptx", () => {
  /**
   * Slide 1: Office theme with rectangle
   * Theme1: accent1=#4F81BD, lt1=#FFFFFF
   */
  it("slide 1 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 1,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 2: Office theme again (solid fill from layout)
   * Theme1: lt2=#EEECE1 background
   */
  it("slide 2 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(2);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 2,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 3: Radial gradient fill on slide layout
   * Theme1: bg2=#EEECE1 with radial gradient (phClr)
   */
  it("slide 3 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(3);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 3,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 4: Theme 3 (Metro) with rectangle
   * Theme3: accent1=#94C600 (green)
   */
  it("slide 4 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(4);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 4,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 5: Theme 3 with picture
   * Theme3: accent1=#94C600
   */
  it("slide 5 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(5);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 5,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 6: Theme 3 radial gradient
   * Theme3: bg2 with radial gradient
   */
  it("slide 6 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(6);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 6,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 7: Theme 3 content
   * Theme3: accent1=#94C600
   */
  it("slide 7 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(7);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 7,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 8: Theme 5 (Trek) title slide
   * Theme5: dk2=#4E3B30 (brown), accent1=#FFD320 (gold)
   */
  it("slide 8 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(8);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 8,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 9: Theme 5 with picture
   * Theme5: dk2=#4E3B30
   */
  it("slide 9 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(9);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 9,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });

  /**
   * Slide 10: Theme 7 (Flow) with linear gradient
   * Theme7: dk2=#7DAFC3 (blue-gray), inverted colorMap (bg2->dk2)
   */
  it("slide 10 visual matches baseline", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(10);

    const result = compareSvgToSnapshot({
      svg: renderSlideToSvg(slide).svg,
      snapshotName: "themes",
      slideNumber: 10,
      options: { maxDiffPercent: DIFF_THRESHOLD },
    });

    expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
  });
});
