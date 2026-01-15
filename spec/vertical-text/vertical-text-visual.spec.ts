/**
 * @file Visual regression tests for vertical text (縦書き) rendering.
 *
 * Tests compare rendered SVG output against LibreOffice baseline snapshots
 * for vertical text layouts.
 *
 * Test methodology:
 * - Uses LibreOffice-generated PNGs as baseline
 * - Compares rendered SVG converted to PNG against baseline
 * - Higher threshold (15%) initially expected due to renderer limitations
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.39 (ST_TextVerticalType)
 */

import { compareSlideToSnapshot, printCompareResult } from "../../scripts/lib/visual-compare";

const BASE_DIR = "fixtures/vertical-text";
const DIFF_THRESHOLD = 15; // 15% allowed difference

describe("Vertical Text Visual Regression", () => {
  describe("Basic Vertical Text (vert)", () => {
    /**
     * Basic English vertical text
     * vert="vert" - 90 degree clockwise rotation
     */
    it("renders basic English vertical text", async () => {
      const result = await compareSlideToSnapshot(
        `${BASE_DIR}/vert-basic-english.pptx`,
        "vert-basic-english",
        1,
        { maxDiffPercent: DIFF_THRESHOLD },
      );
      printCompareResult(result, "vert-basic-english", 1);
      expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
    });

    /**
     * Basic Japanese vertical text
     * vert="vert" - Standard vertical layout for Japanese
     */
    it("renders basic Japanese vertical text", async () => {
      const result = await compareSlideToSnapshot(
        `${BASE_DIR}/vert-basic-japanese.pptx`,
        "vert-basic-japanese",
        1,
        { maxDiffPercent: DIFF_THRESHOLD },
      );
      printCompareResult(result, "vert-basic-japanese", 1);
      expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
    });
  });

  describe("East Asian Vertical Text (eaVert)", () => {
    /**
     * Japanese with East Asian vertical mode
     * vert="eaVert" - CJK-specific vertical layout
     */
    it("renders Japanese with eaVert", async () => {
      const result = await compareSlideToSnapshot(
        `${BASE_DIR}/vert-eavert-japanese.pptx`,
        "vert-eavert-japanese",
        1,
        { maxDiffPercent: DIFF_THRESHOLD },
      );
      printCompareResult(result, "vert-eavert-japanese", 1);
      expect(result.diffPercent).toBeLessThanOrEqual(DIFF_THRESHOLD);
    });
  });
});
