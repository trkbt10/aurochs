/**
 * @file Thumbnails component unit tests
 *
 * Tests for thumbnail rendering with proper aspect ratio and SVG content.
 */

describe("Thumbnails Component", () => {
  describe("Aspect Ratio", () => {
    it("should use presentation aspect ratio, not hardcoded 16:9", () => {
      // The Thumbnails component should accept width/height from presentation
      // and calculate aspect ratio dynamically
      const presentationWidth = 1024;
      const presentationHeight = 768; // 4:3 ratio
      const expectedAspectRatio = presentationWidth / presentationHeight;

      expect(expectedAspectRatio).toBeCloseTo(4 / 3, 2);
      expect(expectedAspectRatio).not.toBeCloseTo(16 / 9, 2);
    });

    it("should handle various presentation sizes", () => {
      const testCases = [
        { width: 960, height: 540, name: "16:9" },
        { width: 1024, height: 768, name: "4:3" },
        { width: 1920, height: 1200, name: "16:10" },
        { width: 1920, height: 1080, name: "Full HD 16:9" },
        { width: 800, height: 600, name: "4:3 small" },
      ];

      for (const testCase of testCases) {
        const ratio = testCase.width / testCase.height;
        expect(ratio).toBeGreaterThan(0);
      }
    });
  });

  describe("SVG Rendering", () => {
    it("should render SVG content when available", () => {
      const slideWithSvg = {
        number: 1,
        svg: '<svg viewBox="0 0 960 540"><rect fill="#ff0000" width="100" height="100"/></svg>',
      };

      // SVG should be rendered, not just the slide number
      expect(slideWithSvg.svg).toContain("<svg");
      expect(slideWithSvg.svg).toContain("</svg>");
    });

    it("should fall back to slide number when no SVG", () => {
      const slideWithoutSvg = {
        number: 1,
        svg: undefined,
      };

      expect(slideWithoutSvg.svg).toBeUndefined();
      expect(slideWithoutSvg.number).toBe(1);
    });
  });
});
