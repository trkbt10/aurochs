/**
 * @file useSheetTabDragDrop tests
 */

/**
 * Calculate the final position after moving a tab.
 * Uses cursor position to determine which gap to insert into.
 * Gaps are numbered: 0 (before first tab), 1 (between tab 0 and 1), etc.
 * If the target gap is adjacent to the dragging tab, it's a no-op.
 */
function calculateFinalPosition({ draggingIndex, targetTabIndex, clientX, rectLeft, rectWidth }: {
  readonly draggingIndex: number;
  readonly targetTabIndex: number;
  readonly clientX: number;
  readonly rectLeft: number;
  readonly rectWidth: number;
}): { position: number; gapIndex: number } | undefined {
  if (draggingIndex === targetTabIndex) {
    return undefined;
  }

  const midX = rectLeft + rectWidth / 2;
  const insertBefore = clientX < midX;
  const targetGapIndex = insertBefore ? targetTabIndex : targetTabIndex + 1;

  // If targeting the gap immediately before or after the dragging tab, no-op
  if (targetGapIndex === draggingIndex || targetGapIndex === draggingIndex + 1) {
    return undefined;
  }

  const position = targetGapIndex > draggingIndex ? targetGapIndex - 1 : targetGapIndex;

  return { position, gapIndex: targetGapIndex };
}

describe("useSheetTabDragDrop", () => {
  describe("calculateFinalPosition", () => {
    // Tabs: [0] [1] [2]
    // Gaps:  0   1   2   3
    // Rect for each tab: left=0, width=100 (midX=50), left=100, width=100 (midX=150), etc.

    describe("adjacent tabs - dragging tab 0 to tab 1", () => {
      const draggingIndex = 0;
      const targetTabIndex = 1;

      it("left side of tab 1 -> no-op (gap 1 is adjacent to tab 0)", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 125, rectLeft: 100, rectWidth: 100 });
        expect(result).toBeUndefined();
      });

      it("right side of tab 1 -> move to position 1", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 175, rectLeft: 100, rectWidth: 100 });
        expect(result).toEqual({ position: 1, gapIndex: 2 });
      });
    });

    describe("adjacent tabs - dragging tab 1 to tab 0", () => {
      const draggingIndex = 1;
      const targetTabIndex = 0;

      it("left side of tab 0 -> move to position 0", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 25, rectLeft: 0, rectWidth: 100 });
        expect(result).toEqual({ position: 0, gapIndex: 0 });
      });

      it("right side of tab 0 -> no-op (gap 1 is adjacent to tab 1)", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 75, rectLeft: 0, rectWidth: 100 });
        expect(result).toBeUndefined();
      });
    });

    describe("adjacent tabs - dragging tab 1 to tab 2", () => {
      const draggingIndex = 1;
      const targetTabIndex = 2;

      it("left side of tab 2 -> no-op (gap 2 is adjacent to tab 1)", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 225, rectLeft: 200, rectWidth: 100 });
        expect(result).toBeUndefined();
      });

      it("right side of tab 2 -> move to position 2", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 275, rectLeft: 200, rectWidth: 100 });
        expect(result).toEqual({ position: 2, gapIndex: 3 });
      });
    });

    describe("adjacent tabs - dragging tab 2 to tab 1", () => {
      const draggingIndex = 2;
      const targetTabIndex = 1;

      it("left side of tab 1 -> move to position 1", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 125, rectLeft: 100, rectWidth: 100 });
        expect(result).toEqual({ position: 1, gapIndex: 1 });
      });

      it("right side of tab 1 -> no-op (gap 2 is adjacent to tab 2)", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 175, rectLeft: 100, rectWidth: 100 });
        expect(result).toBeUndefined();
      });
    });

    describe("non-adjacent - dragging tab 0 to tab 2", () => {
      const draggingIndex = 0;
      const targetTabIndex = 2;

      it("left side of tab 2 -> insert before, position 1", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 225, rectLeft: 200, rectWidth: 100 });
        expect(result).toEqual({ position: 1, gapIndex: 2 });
      });

      it("right side of tab 2 -> insert after, position 2", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 275, rectLeft: 200, rectWidth: 100 });
        expect(result).toEqual({ position: 2, gapIndex: 3 });
      });
    });

    describe("non-adjacent - dragging tab 2 to tab 0", () => {
      const draggingIndex = 2;
      const targetTabIndex = 0;

      it("left side of tab 0 -> insert before, position 0", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 25, rectLeft: 0, rectWidth: 100 });
        expect(result).toEqual({ position: 0, gapIndex: 0 });
      });

      it("right side of tab 0 -> insert after, position 1", () => {
        const result = calculateFinalPosition({ draggingIndex, targetTabIndex, clientX: 75, rectLeft: 0, rectWidth: 100 });
        expect(result).toEqual({ position: 1, gapIndex: 1 });
      });
    });

    describe("self drop", () => {
      it("dragging over self returns undefined", () => {
        const result = calculateFinalPosition({ draggingIndex: 1, targetTabIndex: 1, clientX: 125, rectLeft: 100, rectWidth: 100 });
        expect(result).toBeUndefined();
      });
    });
  });
});
