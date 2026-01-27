/**
 * @file cursor-utils.ts unit tests
 *
 * Tests for cursor position calculation utilities.
 * Focuses on DocxParagraph-based functions (offsetToCursorPosition, cursorPositionToOffset).
 *
 * Coordinate mapping functions (cursorPositionToCoordinates, coordinatesToCursorPosition,
 * selectionToRects) require PagedLayoutResult from the layout engine and should be
 * tested through integration tests with the full layout pipeline.
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import {
  offsetToCursorPosition,
  cursorPositionToOffset,
} from "./cursor-utils";

// =============================================================================
// Test Fixtures
// =============================================================================

function createParagraph(text: string): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createEmptyParagraph(): DocxParagraph {
  return {
    type: "paragraph",
    content: [],
  };
}

function createMultiRunParagraph(texts: string[]): DocxParagraph {
  return {
    type: "paragraph",
    content: texts.map((text) => ({
      type: "run" as const,
      content: [{ type: "text" as const, value: text }],
    })),
  };
}

// =============================================================================
// Tests: offsetToCursorPosition
// =============================================================================

describe("offsetToCursorPosition", () => {
  describe("single paragraph", () => {
    it("returns position at start of paragraph", () => {
      const paragraphs = [createParagraph("Hello")];
      const position = offsetToCursorPosition(paragraphs, 0);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 0 });
    });

    it("returns position within paragraph", () => {
      const paragraphs = [createParagraph("Hello")];
      const position = offsetToCursorPosition(paragraphs, 3);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 3 });
    });

    it("returns position at end of paragraph", () => {
      const paragraphs = [createParagraph("Hello")];
      const position = offsetToCursorPosition(paragraphs, 5);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 5 });
    });

    it("clamps offset past end of paragraph", () => {
      const paragraphs = [createParagraph("Hi")];
      const position = offsetToCursorPosition(paragraphs, 100);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 2 });
    });
  });

  describe("multiple paragraphs", () => {
    it("returns position at start of second paragraph", () => {
      const paragraphs = [createParagraph("Hello"), createParagraph("World")];
      // "Hello" = 5 chars + 1 newline = offset 6 is start of "World"
      const position = offsetToCursorPosition(paragraphs, 6);
      expect(position).toEqual({ paragraphIndex: 1, charOffset: 0 });
    });

    it("returns position within second paragraph", () => {
      const paragraphs = [createParagraph("Hello"), createParagraph("World")];
      // offset 8 = "Hello\nWo" -> World[2]
      const position = offsetToCursorPosition(paragraphs, 8);
      expect(position).toEqual({ paragraphIndex: 1, charOffset: 2 });
    });

    it("handles three paragraphs", () => {
      const paragraphs = [
        createParagraph("AB"),
        createParagraph("CD"),
        createParagraph("EF"),
      ];
      // "AB\nCD\nEF" - offset 6 = start of third paragraph
      const position = offsetToCursorPosition(paragraphs, 6);
      expect(position).toEqual({ paragraphIndex: 2, charOffset: 0 });
    });

    it("handles position at newline boundary", () => {
      const paragraphs = [createParagraph("Hello"), createParagraph("World")];
      // offset 5 = end of "Hello"
      const position = offsetToCursorPosition(paragraphs, 5);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 5 });
    });
  });

  describe("edge cases", () => {
    it("handles empty paragraphs array", () => {
      const paragraphs: readonly DocxParagraph[] = [];
      const position = offsetToCursorPosition(paragraphs, 0);
      expect(position).toEqual({ paragraphIndex: -1, charOffset: 0 });
    });

    it("handles empty paragraph", () => {
      const paragraphs = [createEmptyParagraph()];
      const position = offsetToCursorPosition(paragraphs, 0);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 0 });
    });

    it("handles paragraph with multiple runs", () => {
      const paragraphs = [createMultiRunParagraph(["Hel", "lo"])];
      const position = offsetToCursorPosition(paragraphs, 4);
      expect(position).toEqual({ paragraphIndex: 0, charOffset: 4 });
    });
  });
});

// =============================================================================
// Tests: cursorPositionToOffset
// =============================================================================

describe("cursorPositionToOffset", () => {
  describe("single paragraph", () => {
    it("converts first paragraph start to offset 0", () => {
      const paragraphs = [createParagraph("Hello")];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 0, charOffset: 0 });
      expect(offset).toBe(0);
    });

    it("converts position within paragraph", () => {
      const paragraphs = [createParagraph("Hello")];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 0, charOffset: 3 });
      expect(offset).toBe(3);
    });

    it("converts end of paragraph", () => {
      const paragraphs = [createParagraph("Hello")];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 0, charOffset: 5 });
      expect(offset).toBe(5);
    });
  });

  describe("multiple paragraphs", () => {
    it("converts second paragraph start", () => {
      const paragraphs = [createParagraph("Hello"), createParagraph("World")];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 1, charOffset: 0 });
      expect(offset).toBe(6); // "Hello" (5) + newline (1)
    });

    it("converts position within second paragraph", () => {
      const paragraphs = [createParagraph("Hello"), createParagraph("World")];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 1, charOffset: 2 });
      expect(offset).toBe(8);
    });

    it("converts third paragraph start", () => {
      const paragraphs = [
        createParagraph("AB"),
        createParagraph("CD"),
        createParagraph("EF"),
      ];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 2, charOffset: 0 });
      expect(offset).toBe(6); // "AB\nCD\n" = 6
    });
  });

  describe("roundtrip", () => {
    it("roundtrips with offsetToCursorPosition for all positions", () => {
      const paragraphs = [createParagraph("Hello"), createParagraph("World")];
      // Total: "Hello\nWorld" = 11 chars
      const testOffsets = [0, 1, 3, 5, 6, 8, 10, 11];
      for (const offset of testOffsets) {
        const position = offsetToCursorPosition(paragraphs, offset);
        const resultOffset = cursorPositionToOffset(paragraphs, position);
        expect(resultOffset).toBe(offset);
      }
    });

    it("roundtrips with three paragraphs", () => {
      const paragraphs = [
        createParagraph("AB"),
        createParagraph("CD"),
        createParagraph("EF"),
      ];
      // "AB\nCD\nEF" = 8 chars
      const testOffsets = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (const offset of testOffsets) {
        const position = offsetToCursorPosition(paragraphs, offset);
        const resultOffset = cursorPositionToOffset(paragraphs, position);
        expect(resultOffset).toBe(offset);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty paragraphs array", () => {
      const paragraphs: readonly DocxParagraph[] = [];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 0, charOffset: 0 });
      expect(offset).toBe(0);
    });

    it("handles paragraph index out of range", () => {
      const paragraphs = [createParagraph("Hello")];
      const offset = cursorPositionToOffset(paragraphs, { paragraphIndex: 5, charOffset: 0 });
      // Should return offset after all paragraphs
      expect(offset).toBe(6); // "Hello" (5) + newline (1)
    });
  });
});
