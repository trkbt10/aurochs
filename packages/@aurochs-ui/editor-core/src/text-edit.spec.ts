/**
 * @file Unit tests for text-edit.ts
 */

import {
  isSameCursorPosition,
  isCursorBefore,
  normalizeTextSelection,
  isSelectionCollapsed,
  createInitialCompositionState,
  createInactiveTextEditState,
  isTextEditActive,
  offsetToCursorPosition,
  cursorPositionToOffset,
  getPlainText,
  cursorPositionToCoordinates,
  coordinatesToCursorPosition,
  selectionToRects,
  getLineTextLength,
  getXPositionInLine,
  DEFAULT_CURSOR_CONTEXT,
  type TextBodyLike,
  type LayoutResultLike,
  type TextSelection,
} from "./text-edit";

// =============================================================================
// Test Fixtures
// =============================================================================

const simpleTextBody: TextBodyLike = {
  paragraphs: [
    { runs: [{ type: "text", text: "Hello" }] },
    { runs: [{ type: "text", text: "World" }] },
  ],
};

const multiRunTextBody: TextBodyLike = {
  paragraphs: [
    { runs: [{ type: "text", text: "Hello " }, { type: "text", text: "World" }] },
  ],
};

const textBodyWithBreak: TextBodyLike = {
  paragraphs: [
    { runs: [{ type: "text", text: "Line1" }, { type: "break", text: "\n" }, { type: "text", text: "Line2" }] },
  ],
};

// Simple layout with one paragraph, one line, two spans
const simpleLayout: LayoutResultLike = {
  paragraphs: [
    {
      lines: [
        {
          spans: [
            { text: "Hello", width: 50, dx: 0, fontSize: 12, fontFamily: "Arial" },
            { text: " World", width: 60, dx: 0, fontSize: 12, fontFamily: "Arial" },
          ],
          x: 10,
          y: 20,
          height: 16,
        },
      ],
    },
  ],
};

// Two-paragraph layout
const twoParagraphLayout: LayoutResultLike = {
  paragraphs: [
    {
      lines: [
        {
          spans: [{ text: "Hello", width: 50, dx: 0, fontSize: 12, fontFamily: "Arial" }],
          x: 10,
          y: 20,
          height: 16,
        },
      ],
    },
    {
      lines: [
        {
          spans: [{ text: "World", width: 50, dx: 0, fontSize: 12, fontFamily: "Arial" }],
          x: 10,
          y: 40,
          height: 16,
        },
      ],
    },
  ],
};

// =============================================================================
// Cursor Position Tests
// =============================================================================

describe("isSameCursorPosition", () => {
  it("returns true for same position", () => {
    expect(isSameCursorPosition({ paragraphIndex: 0, charOffset: 5 }, { paragraphIndex: 0, charOffset: 5 })).toBe(true);
  });

  it("returns false for different positions", () => {
    expect(isSameCursorPosition({ paragraphIndex: 0, charOffset: 5 }, { paragraphIndex: 1, charOffset: 5 })).toBe(false);
    expect(isSameCursorPosition({ paragraphIndex: 0, charOffset: 5 }, { paragraphIndex: 0, charOffset: 3 })).toBe(false);
  });
});

describe("isCursorBefore", () => {
  it("compares by paragraph first", () => {
    expect(isCursorBefore({ paragraphIndex: 0, charOffset: 5 }, { paragraphIndex: 1, charOffset: 0 })).toBe(true);
    expect(isCursorBefore({ paragraphIndex: 1, charOffset: 0 }, { paragraphIndex: 0, charOffset: 5 })).toBe(false);
  });

  it("compares by charOffset within same paragraph", () => {
    expect(isCursorBefore({ paragraphIndex: 0, charOffset: 3 }, { paragraphIndex: 0, charOffset: 5 })).toBe(true);
    expect(isCursorBefore({ paragraphIndex: 0, charOffset: 5 }, { paragraphIndex: 0, charOffset: 3 })).toBe(false);
  });
});

describe("normalizeTextSelection", () => {
  it("keeps already-normalized selection", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 0 }, end: { paragraphIndex: 0, charOffset: 5 } };
    const result = normalizeTextSelection(sel);
    expect(result.start).toBe(sel.start);
    expect(result.end).toBe(sel.end);
  });

  it("swaps reversed selection", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 5 }, end: { paragraphIndex: 0, charOffset: 0 } };
    const result = normalizeTextSelection(sel);
    expect(result.start.charOffset).toBe(0);
    expect(result.end.charOffset).toBe(5);
  });
});

describe("isSelectionCollapsed", () => {
  it("returns true for collapsed selection", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 3 }, end: { paragraphIndex: 0, charOffset: 3 } };
    expect(isSelectionCollapsed(sel)).toBe(true);
  });

  it("returns false for non-collapsed selection", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 0 }, end: { paragraphIndex: 0, charOffset: 5 } };
    expect(isSelectionCollapsed(sel)).toBe(false);
  });
});

// =============================================================================
// Text Edit State Tests
// =============================================================================

describe("createInitialCompositionState", () => {
  it("creates non-composing state", () => {
    const state = createInitialCompositionState();
    expect(state.isComposing).toBe(false);
    expect(state.text).toBe("");
    expect(state.startOffset).toBe(0);
  });
});

describe("createInactiveTextEditState / isTextEditActive", () => {
  it("creates inactive state", () => {
    const state = createInactiveTextEditState();
    expect(state.type).toBe("inactive");
    expect(isTextEditActive(state)).toBe(false);
  });

  it("detects active state", () => {
    const state = { type: "active" as const, shapeId: "s1", bounds: { x: 0, y: 0, width: 100, height: 50, rotation: 0 }, initialTextBody: {} };
    expect(isTextEditActive(state)).toBe(true);
  });
});

// =============================================================================
// Text Position Mapping Tests
// =============================================================================

describe("offsetToCursorPosition", () => {
  it("maps offset within first paragraph", () => {
    const pos = offsetToCursorPosition(simpleTextBody, 3);
    expect(pos).toEqual({ paragraphIndex: 0, charOffset: 3 });
  });

  it("maps offset to second paragraph", () => {
    // "Hello" (5 chars) + newline (1) = offset 6 is start of second paragraph
    const pos = offsetToCursorPosition(simpleTextBody, 6);
    expect(pos).toEqual({ paragraphIndex: 1, charOffset: 0 });
  });

  it("maps offset within second paragraph", () => {
    const pos = offsetToCursorPosition(simpleTextBody, 8);
    expect(pos).toEqual({ paragraphIndex: 1, charOffset: 2 });
  });

  it("handles end of text", () => {
    const pos = offsetToCursorPosition(simpleTextBody, 11);
    expect(pos).toEqual({ paragraphIndex: 1, charOffset: 5 });
  });
});

describe("cursorPositionToOffset", () => {
  it("converts first paragraph position", () => {
    expect(cursorPositionToOffset(simpleTextBody, { paragraphIndex: 0, charOffset: 3 })).toBe(3);
  });

  it("converts second paragraph position", () => {
    expect(cursorPositionToOffset(simpleTextBody, { paragraphIndex: 1, charOffset: 2 })).toBe(8);
  });

  it("round-trips with offsetToCursorPosition", () => {
    for (let offset = 0; offset <= 11; offset++) {
      const pos = offsetToCursorPosition(simpleTextBody, offset);
      const back = cursorPositionToOffset(simpleTextBody, pos);
      expect(back).toBe(offset);
    }
  });
});

describe("getPlainText", () => {
  it("joins paragraphs with newlines", () => {
    expect(getPlainText(simpleTextBody)).toBe("Hello\nWorld");
  });

  it("concatenates runs within paragraph", () => {
    expect(getPlainText(multiRunTextBody)).toBe("Hello World");
  });

  it("handles break runs", () => {
    expect(getPlainText(textBodyWithBreak)).toBe("Line1\nLine2");
  });
});

// =============================================================================
// Layout Geometry Tests
// =============================================================================

describe("getLineTextLength", () => {
  it("sums span text lengths", () => {
    const line = simpleLayout.paragraphs[0].lines[0];
    expect(getLineTextLength(line)).toBe(11); // "Hello" + " World"
  });
});

describe("getXPositionInLine", () => {
  it("returns line x at offset 0", () => {
    const line = simpleLayout.paragraphs[0].lines[0];
    expect(getXPositionInLine(line, 0, DEFAULT_CURSOR_CONTEXT)).toBe(10);
  });

  it("returns proportional position within span", () => {
    const line = simpleLayout.paragraphs[0].lines[0];
    // "Hello" has width 50, each char ~10px. Offset 3 = 10 + 30 = 40
    const x = getXPositionInLine(line, 3, DEFAULT_CURSOR_CONTEXT);
    expect(x).toBeCloseTo(40, 0);
  });

  it("returns position past first span", () => {
    const line = simpleLayout.paragraphs[0].lines[0];
    // Past "Hello" (50px), into " World" span
    const x = getXPositionInLine(line, 6, DEFAULT_CURSOR_CONTEXT);
    // 10 + 50 + (1/6 * 60) = 70
    expect(x).toBeCloseTo(70, 0);
  });
});

// =============================================================================
// Visual Coordinate Mapping Tests
// =============================================================================

describe("cursorPositionToCoordinates", () => {
  it("returns coordinates for position in first paragraph", () => {
    const coords = cursorPositionToCoordinates({ paragraphIndex: 0, charOffset: 0 }, simpleLayout, DEFAULT_CURSOR_CONTEXT);
    expect(coords).toBeDefined();
    expect(coords!.x).toBe(10); // line.x
  });

  it("returns coordinates for second paragraph", () => {
    const coords = cursorPositionToCoordinates({ paragraphIndex: 1, charOffset: 0 }, twoParagraphLayout, DEFAULT_CURSOR_CONTEXT);
    expect(coords).toBeDefined();
    expect(coords!.x).toBe(10);
  });

  it("returns undefined-like fallback for empty layout", () => {
    const coords = cursorPositionToCoordinates({ paragraphIndex: 0, charOffset: 0 }, { paragraphs: [] }, DEFAULT_CURSOR_CONTEXT);
    expect(coords).toBeDefined();
    expect(coords!.x).toBe(0);
  });
});

describe("coordinatesToCursorPosition", () => {
  it("maps coordinates to nearest line", () => {
    const pos = coordinatesToCursorPosition({ layoutResult: simpleLayout, x: 10, y: 20, ctx: DEFAULT_CURSOR_CONTEXT });
    expect(pos.paragraphIndex).toBe(0);
  });

  it("returns start for empty layout", () => {
    const pos = coordinatesToCursorPosition({ layoutResult: { paragraphs: [] }, x: 0, y: 0, ctx: DEFAULT_CURSOR_CONTEXT });
    expect(pos).toEqual({ paragraphIndex: 0, charOffset: 0 });
  });

  it("maps to second paragraph when y is closer", () => {
    const pos = coordinatesToCursorPosition({ layoutResult: twoParagraphLayout, x: 10, y: 40, ctx: DEFAULT_CURSOR_CONTEXT });
    expect(pos.paragraphIndex).toBe(1);
  });
});

// =============================================================================
// Selection Rectangles Tests
// =============================================================================

describe("selectionToRects", () => {
  it("returns empty for empty layout", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 0 }, end: { paragraphIndex: 0, charOffset: 5 } };
    const rects = selectionToRects(sel, { paragraphs: [] }, DEFAULT_CURSOR_CONTEXT);
    expect(rects.length).toBe(0);
  });

  it("returns single rect for single-line selection", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 0 }, end: { paragraphIndex: 0, charOffset: 5 } };
    const rects = selectionToRects(sel, simpleLayout, DEFAULT_CURSOR_CONTEXT);
    expect(rects.length).toBe(1);
    expect(rects[0].width).toBeGreaterThan(0);
  });

  it("returns multiple rects for cross-paragraph selection", () => {
    const sel: TextSelection = { start: { paragraphIndex: 0, charOffset: 0 }, end: { paragraphIndex: 1, charOffset: 5 } };
    const rects = selectionToRects(sel, twoParagraphLayout, DEFAULT_CURSOR_CONTEXT);
    expect(rects.length).toBe(2);
  });
});
