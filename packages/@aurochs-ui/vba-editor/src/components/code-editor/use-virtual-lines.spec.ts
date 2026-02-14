/**
 * @file Virtual Lines Tests
 *
 * Tests the virtual scroll calculation logic used by useVirtualLines.
 * Since the hook is a thin wrapper around state calculations, we test the logic directly.
 */

// =============================================================================
// Virtual Lines Calculation Logic (extracted for testing)
// =============================================================================

type VirtualLinesCalc = {
  visibleRange: { start: number; end: number };
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  totalHeight: number;
};

type VirtualLinesOptions = {
  lineCount: number;
  scrollTop: number;
  viewportHeight: number;
  lineHeight: number;
  overscan: number;
};

function calculateVirtualLines(options: VirtualLinesOptions): VirtualLinesCalc {
  const { lineCount, scrollTop, viewportHeight, lineHeight, overscan } = options;
  const totalHeight = lineCount * lineHeight;

  // Calculate visible range with overscan
  const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - overscan);
  const endLine = Math.min(
    lineCount,
    Math.ceil((scrollTop + viewportHeight) / lineHeight) + overscan
  );

  // Calculate spacer heights
  const topSpacerHeight = startLine * lineHeight;
  const bottomSpacerHeight = (lineCount - endLine) * lineHeight;

  return {
    visibleRange: { start: startLine, end: endLine },
    topSpacerHeight,
    bottomSpacerHeight,
    totalHeight,
  };
}

// =============================================================================
// Tests
// =============================================================================

const LINE_HEIGHT = 21;
const OVERSCAN = 5;
const VIEWPORT_HEIGHT = 400; // ~19 lines visible

/** Helper to create options with defaults */
function opts(overrides: Partial<VirtualLinesOptions> = {}): VirtualLinesOptions {
  return {
    lineCount: 100,
    scrollTop: 0,
    viewportHeight: VIEWPORT_HEIGHT,
    lineHeight: LINE_HEIGHT,
    overscan: OVERSCAN,
    ...overrides,
  };
}

describe("calculateVirtualLines", () => {
  describe("initial state", () => {
    test("calculates total height correctly", () => {
      const result = calculateVirtualLines(opts());
      expect(result.totalHeight).toBe(100 * LINE_HEIGHT);
    });

    test("visible range starts at 0", () => {
      const result = calculateVirtualLines(opts());
      expect(result.visibleRange.start).toBe(0);
    });

    test("visible range includes viewport + overscan", () => {
      const result = calculateVirtualLines(opts());
      // ceil(400/21) + 5 = 20 + 5 = 25
      const expectedEnd = Math.min(100, Math.ceil(VIEWPORT_HEIGHT / LINE_HEIGHT) + OVERSCAN);
      expect(result.visibleRange.end).toBe(expectedEnd);
    });

    test("top spacer is 0 at top", () => {
      const result = calculateVirtualLines(opts());
      expect(result.topSpacerHeight).toBe(0);
    });
  });

  describe("scroll position", () => {
    test("scrolling updates visible range", () => {
      // Scroll 20 lines down
      const scrollTop = 20 * LINE_HEIGHT;
      const result = calculateVirtualLines(opts({ scrollTop }));

      // Start should be around line 15 (20 - 5 overscan)
      expect(result.visibleRange.start).toBe(15);
    });

    test("top spacer increases when scrolling down", () => {
      const scrollTop = 20 * LINE_HEIGHT;
      const result = calculateVirtualLines(opts({ scrollTop }));

      // Top spacer = startLine * lineHeight = 15 * 21 = 315
      expect(result.topSpacerHeight).toBe(15 * LINE_HEIGHT);
    });

    test("bottom spacer decreases when scrolling down", () => {
      const scrollTop = 20 * LINE_HEIGHT;
      const result = calculateVirtualLines(opts({ scrollTop }));

      // Bottom spacer = (lineCount - endLine) * lineHeight
      const expectedEnd = Math.min(100, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / LINE_HEIGHT) + OVERSCAN);
      const expectedBottom = (100 - expectedEnd) * LINE_HEIGHT;
      expect(result.bottomSpacerHeight).toBe(expectedBottom);
    });
  });

  describe("edge cases", () => {
    test("handles 0 lines", () => {
      const result = calculateVirtualLines(opts({ lineCount: 0 }));

      expect(result.totalHeight).toBe(0);
      expect(result.visibleRange.start).toBe(0);
      expect(result.visibleRange.end).toBe(0);
      expect(result.topSpacerHeight).toBe(0);
      expect(result.bottomSpacerHeight).toBe(0);
    });

    test("handles 1 line", () => {
      const result = calculateVirtualLines(opts({ lineCount: 1 }));

      expect(result.totalHeight).toBe(LINE_HEIGHT);
      expect(result.visibleRange.start).toBe(0);
      expect(result.visibleRange.end).toBe(1);
    });

    test("handles 10000 lines efficiently", () => {
      const result = calculateVirtualLines(opts({ lineCount: 10000 }));

      expect(result.totalHeight).toBe(10000 * LINE_HEIGHT);
      // Should not render all 10000 lines
      const rangeSize = result.visibleRange.end - result.visibleRange.start;
      expect(rangeSize).toBeLessThan(100);
    });

    test("visible range does not exceed line count", () => {
      const result = calculateVirtualLines(opts({ lineCount: 10 }));
      expect(result.visibleRange.end).toBeLessThanOrEqual(10);
    });

    test("visible range does not go negative", () => {
      const result = calculateVirtualLines(opts());
      expect(result.visibleRange.start).toBeGreaterThanOrEqual(0);
    });

    test("handles scroll past content", () => {
      const scrollTop = 100 * LINE_HEIGHT; // Past all content
      const result = calculateVirtualLines(opts({ scrollTop }));

      // Should clamp to valid range
      expect(result.visibleRange.start).toBeGreaterThanOrEqual(0);
      expect(result.visibleRange.end).toBeLessThanOrEqual(100);
    });
  });

  describe("spacer consistency", () => {
    test("spacers + visible content equals total height", () => {
      const scrollTop = 30 * LINE_HEIGHT;
      const result = calculateVirtualLines(opts({ scrollTop }));

      const visibleContentHeight =
        (result.visibleRange.end - result.visibleRange.start) * LINE_HEIGHT;
      const totalFromParts =
        result.topSpacerHeight + visibleContentHeight + result.bottomSpacerHeight;

      expect(totalFromParts).toBe(result.totalHeight);
    });
  });

  describe("different viewport sizes", () => {
    test("small viewport shows fewer lines", () => {
      const smallViewport = 100; // ~5 lines
      const result = calculateVirtualLines(opts({ viewportHeight: smallViewport }));

      // ceil(100/21) + 5 = 5 + 5 = 10
      expect(result.visibleRange.end).toBeLessThan(15);
    });

    test("large viewport shows more lines", () => {
      const largeViewport = 800; // ~38 lines
      const result = calculateVirtualLines(opts({ viewportHeight: largeViewport }));

      // ceil(800/21) + 5 = 39 + 5 = 44
      expect(result.visibleRange.end).toBeGreaterThan(30);
    });

    test("zero viewport shows only overscan", () => {
      const result = calculateVirtualLines(opts({ viewportHeight: 0 }));

      // ceil(0/21) + 5 = 0 + 5 = 5
      expect(result.visibleRange.end).toBe(OVERSCAN);
    });
  });
});
