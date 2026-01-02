/**
 * @file Tests for SVG shape rendering
 *
 * Unit tests for picture cropping and other shape rendering functions.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.55 (a:srcRect)
 */

/**
 * Re-implementation of calculateCroppedImageLayout for testing.
 *
 * This mirrors the logic in slide-shapes.ts to enable unit testing
 * without exposing internal functions.
 */
function calculateCroppedImageLayout(
  w: number,
  h: number,
  srcRect: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number; width: number; height: number } {
  const visibleWidthPct = 100 - srcRect.left - srcRect.right;
  const visibleHeightPct = 100 - srcRect.top - srcRect.bottom;

  const safeVisibleWidthPct = Math.max(visibleWidthPct, 0.001);
  const safeVisibleHeightPct = Math.max(visibleHeightPct, 0.001);

  const imageWidth = w * (100 / safeVisibleWidthPct);
  const imageHeight = h * (100 / safeVisibleHeightPct);

  const x = -imageWidth * (srcRect.left / 100);
  const y = -imageHeight * (srcRect.top / 100);

  return { x, y, width: imageWidth, height: imageHeight };
}

describe("calculateCroppedImageLayout - ECMA-376 20.1.8.55", () => {
  describe("basic cropping", () => {
    it("returns original dimensions when no cropping", () => {
      const result = calculateCroppedImageLayout(100, 100, {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      });

      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it("handles left crop correctly", () => {
      // Crop 20% from left - visible width is 80%
      // Image needs to be 100 / 0.8 = 125px wide
      // X position shifts left by 125 * 0.2 = 25px
      const result = calculateCroppedImageLayout(100, 100, {
        left: 20,
        top: 0,
        right: 0,
        bottom: 0,
      });

      expect(result.width).toBeCloseTo(125);
      expect(result.x).toBeCloseTo(-25);
      expect(result.height).toBe(100);
      expect(result.y).toBeCloseTo(0);
    });

    it("handles right crop correctly", () => {
      // Crop 20% from right - visible width is 80%
      const result = calculateCroppedImageLayout(100, 100, {
        left: 0,
        top: 0,
        right: 20,
        bottom: 0,
      });

      expect(result.width).toBeCloseTo(125);
      expect(result.x).toBeCloseTo(0); // No left shift needed
    });

    it("handles top crop correctly", () => {
      // Crop 30% from top - visible height is 70%
      const result = calculateCroppedImageLayout(100, 100, {
        left: 0,
        top: 30,
        right: 0,
        bottom: 0,
      });

      expect(result.height).toBeCloseTo(142.857, 2);
      expect(result.y).toBeCloseTo(-42.857, 2);
    });

    it("handles bottom crop correctly", () => {
      // Crop 30% from bottom - visible height is 70%
      const result = calculateCroppedImageLayout(100, 100, {
        left: 0,
        top: 0,
        right: 0,
        bottom: 30,
      });

      expect(result.height).toBeCloseTo(142.857, 2);
      expect(result.y).toBeCloseTo(0);
    });

    it("handles combined left and right crop", () => {
      // Crop 10% from left and 20% from right - visible width is 70%
      const result = calculateCroppedImageLayout(100, 100, {
        left: 10,
        top: 0,
        right: 20,
        bottom: 0,
      });

      expect(result.width).toBeCloseTo(142.857, 2);
      expect(result.x).toBeCloseTo(-14.286, 2);
    });
  });

  describe("real-world examples from 54542_cropped_bitmap.pptx", () => {
    it("handles Picture 7: t=52.941%, b=-17.647%", () => {
      // From XML: <a:srcRect t="52941" b="-17647"/>
      // t=52.941% (crop top), b=-17.647% (expand bottom)
      // Visible height = 100 - 52.941 - (-17.647) = 64.706%
      const result = calculateCroppedImageLayout(100, 100, {
        left: 0,
        top: 52.941,
        right: 0,
        bottom: -17.647,
      });

      // Image height = 100 / 0.64706 ≈ 154.55
      expect(result.height).toBeCloseTo(154.55, 1);
      // Y position = -154.55 * 0.52941 ≈ -81.82
      expect(result.y).toBeCloseTo(-81.82, 1);
    });

    it("handles Picture 9: all sides cropped", () => {
      // From XML: <a:srcRect l="2878" t="2522" r="21582" b="46217"/>
      // l=2.878%, t=2.522%, r=21.582%, b=46.217%
      const result = calculateCroppedImageLayout(100, 100, {
        left: 2.878,
        top: 2.522,
        right: 21.582,
        bottom: 46.217,
      });

      // Visible width = 100 - 2.878 - 21.582 = 75.54%
      // Visible height = 100 - 2.522 - 46.217 = 51.261%
      expect(result.width).toBeCloseTo(132.38, 1);
      expect(result.height).toBeCloseTo(195.08, 1);
    });
  });

  describe("negative values (expansion)", () => {
    it("handles negative left (expands left)", () => {
      // Expand left by 10% - visible width is 110%
      const result = calculateCroppedImageLayout(100, 100, {
        left: -10,
        top: 0,
        right: 0,
        bottom: 0,
      });

      // Image width = 100 / 1.1 ≈ 90.91
      expect(result.width).toBeCloseTo(90.91, 2);
      // X position = -90.91 * -0.1 = 9.09 (shift right)
      expect(result.x).toBeCloseTo(9.09, 2);
    });

    it("handles negative values on all sides (centered padding)", () => {
      // Expand 10% on all sides - visible area is 120%x120%
      const result = calculateCroppedImageLayout(100, 100, {
        left: -10,
        top: -10,
        right: -10,
        bottom: -10,
      });

      // Image dimensions = 100 / 1.2 ≈ 83.33
      expect(result.width).toBeCloseTo(83.33, 2);
      expect(result.height).toBeCloseTo(83.33, 2);
      // Position = -83.33 * -0.1 = 8.33 (centered)
      expect(result.x).toBeCloseTo(8.33, 2);
      expect(result.y).toBeCloseTo(8.33, 2);
    });
  });

  describe("edge cases", () => {
    it("handles 100% crop (shows nothing)", () => {
      // Crop 50% from each side - nothing visible
      const result = calculateCroppedImageLayout(100, 100, {
        left: 50,
        top: 50,
        right: 50,
        bottom: 50,
      });

      // Should handle gracefully without division by zero
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it("handles non-square containers", () => {
      // 200x100 container with 25% crop from each side
      const result = calculateCroppedImageLayout(200, 100, {
        left: 25,
        top: 25,
        right: 25,
        bottom: 25,
      });

      // Visible area is 50%x50%
      expect(result.width).toBe(400); // 200 / 0.5
      expect(result.height).toBe(200); // 100 / 0.5
      expect(result.x).toBe(-100); // -400 * 0.25
      expect(result.y).toBe(-50); // -200 * 0.25
    });
  });
});
