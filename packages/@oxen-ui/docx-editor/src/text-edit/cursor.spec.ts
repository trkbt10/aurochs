/**
 * @file cursor.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxDocument, DocxBlockContent } from "@oxen/docx/domain/document";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import {
  offsetToDocxCursorPosition,
  docxCursorPositionToOffset,
  getPlainTextFromParagraph,
  getPlainTextFromDocument,
  isSamePosition,
  isBefore,
  normalizeSelection,
  getWordRange,
  getLineRange,
  isSelectionCollapsed,
  createCollapsedSelection,
  getSelectionLength,
} from "./cursor";

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

function createDocument(...texts: string[]): DocxDocument {
  return {
    body: {
      content: texts.map(createParagraph),
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("cursor", () => {
  describe("offsetToDocxCursorPosition", () => {
    it("returns position at start of first paragraph", () => {
      const content = [createParagraph("Hello")];
      const position = offsetToDocxCursorPosition(content, 0);
      expect(position).toEqual({ elementIndex: 0, charOffset: 0 });
    });

    it("returns position within first paragraph", () => {
      const content = [createParagraph("Hello")];
      const position = offsetToDocxCursorPosition(content, 3);
      expect(position).toEqual({ elementIndex: 0, charOffset: 3 });
    });

    it("returns position at end of first paragraph", () => {
      const content = [createParagraph("Hello")];
      const position = offsetToDocxCursorPosition(content, 5);
      expect(position).toEqual({ elementIndex: 0, charOffset: 5 });
    });

    it("returns position at start of second paragraph", () => {
      const content = [createParagraph("Hello"), createParagraph("World")];
      // "Hello" = 5 chars + 1 newline = offset 6 is start of "World"
      const position = offsetToDocxCursorPosition(content, 6);
      expect(position).toEqual({ elementIndex: 1, charOffset: 0 });
    });

    it("returns position within second paragraph", () => {
      const content = [createParagraph("Hello"), createParagraph("World")];
      // offset 8 = "Hello\nWo" -> World[2] = 'r'
      const position = offsetToDocxCursorPosition(content, 8);
      expect(position).toEqual({ elementIndex: 1, charOffset: 2 });
    });

    it("handles empty content array", () => {
      const content: DocxBlockContent[] = [];
      const position = offsetToDocxCursorPosition(content, 0);
      expect(position).toEqual({ elementIndex: 0, charOffset: 0 });
    });

    it("clamps offset past end of document", () => {
      const content = [createParagraph("Hi")];
      const position = offsetToDocxCursorPosition(content, 100);
      expect(position).toEqual({ elementIndex: 0, charOffset: 2 });
    });
  });

  describe("docxCursorPositionToOffset", () => {
    it("converts first paragraph start to offset 0", () => {
      const content = [createParagraph("Hello")];
      const offset = docxCursorPositionToOffset(content, { elementIndex: 0, charOffset: 0 });
      expect(offset).toBe(0);
    });

    it("converts position within first paragraph", () => {
      const content = [createParagraph("Hello")];
      const offset = docxCursorPositionToOffset(content, { elementIndex: 0, charOffset: 3 });
      expect(offset).toBe(3);
    });

    it("converts second paragraph start", () => {
      const content = [createParagraph("Hello"), createParagraph("World")];
      const offset = docxCursorPositionToOffset(content, { elementIndex: 1, charOffset: 0 });
      expect(offset).toBe(6); // "Hello" (5) + newline (1)
    });

    it("roundtrips with offsetToDocxCursorPosition", () => {
      const content = [createParagraph("Hello"), createParagraph("World")];
      for (let i = 0; i <= 11; i++) {
        const position = offsetToDocxCursorPosition(content, i);
        const offset = docxCursorPositionToOffset(content, position);
        expect(offset).toBe(i);
      }
    });
  });

  describe("getPlainTextFromParagraph", () => {
    it("extracts text from simple paragraph", () => {
      const paragraph = createParagraph("Hello");
      expect(getPlainTextFromParagraph(paragraph)).toBe("Hello");
    });

    it("handles paragraph with multiple runs", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [
          { type: "run", content: [{ type: "text", value: "Hello" }] },
          { type: "run", content: [{ type: "text", value: " " }] },
          { type: "run", content: [{ type: "text", value: "World" }] },
        ],
      };
      expect(getPlainTextFromParagraph(paragraph)).toBe("Hello World");
    });

    it("handles tab characters", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [
          { type: "run", content: [{ type: "text", value: "A" }, { type: "tab" }, { type: "text", value: "B" }] },
        ],
      };
      expect(getPlainTextFromParagraph(paragraph)).toBe("A\tB");
    });

    it("handles line breaks", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [
          { type: "run", content: [{ type: "text", value: "A" }, { type: "break" }, { type: "text", value: "B" }] },
        ],
      };
      expect(getPlainTextFromParagraph(paragraph)).toBe("A\nB");
    });

    it("handles empty paragraph", () => {
      const paragraph: DocxParagraph = {
        type: "paragraph",
        content: [],
      };
      expect(getPlainTextFromParagraph(paragraph)).toBe("");
    });
  });

  describe("getPlainTextFromDocument", () => {
    it("extracts text from document with single paragraph", () => {
      const document = createDocument("Hello");
      expect(getPlainTextFromDocument(document)).toBe("Hello");
    });

    it("joins paragraphs with newlines", () => {
      const document = createDocument("Hello", "World");
      expect(getPlainTextFromDocument(document)).toBe("Hello\nWorld");
    });

    it("handles empty document", () => {
      const document: DocxDocument = { body: { content: [] } };
      expect(getPlainTextFromDocument(document)).toBe("");
    });
  });

  describe("isSamePosition", () => {
    it("returns true for equal positions", () => {
      const a = { elementIndex: 1, charOffset: 5 };
      const b = { elementIndex: 1, charOffset: 5 };
      expect(isSamePosition(a, b)).toBe(true);
    });

    it("returns false for different element indices", () => {
      const a = { elementIndex: 0, charOffset: 5 };
      const b = { elementIndex: 1, charOffset: 5 };
      expect(isSamePosition(a, b)).toBe(false);
    });

    it("returns false for different char offsets", () => {
      const a = { elementIndex: 1, charOffset: 3 };
      const b = { elementIndex: 1, charOffset: 5 };
      expect(isSamePosition(a, b)).toBe(false);
    });
  });

  describe("isBefore", () => {
    it("returns true when first element index is smaller", () => {
      const a = { elementIndex: 0, charOffset: 10 };
      const b = { elementIndex: 1, charOffset: 0 };
      expect(isBefore(a, b)).toBe(true);
    });

    it("returns false when first element index is larger", () => {
      const a = { elementIndex: 2, charOffset: 0 };
      const b = { elementIndex: 1, charOffset: 10 };
      expect(isBefore(a, b)).toBe(false);
    });

    it("compares char offset when element indices are equal", () => {
      const a = { elementIndex: 1, charOffset: 3 };
      const b = { elementIndex: 1, charOffset: 5 };
      expect(isBefore(a, b)).toBe(true);
    });

    it("returns false for equal positions", () => {
      const a = { elementIndex: 1, charOffset: 5 };
      const b = { elementIndex: 1, charOffset: 5 };
      expect(isBefore(a, b)).toBe(false);
    });
  });

  describe("normalizeSelection", () => {
    it("keeps selection unchanged when start is before end", () => {
      const selection = {
        start: { elementIndex: 0, charOffset: 0 },
        end: { elementIndex: 0, charOffset: 5 },
      };
      expect(normalizeSelection(selection)).toEqual(selection);
    });

    it("swaps start and end when end is before start", () => {
      const selection = {
        start: { elementIndex: 0, charOffset: 5 },
        end: { elementIndex: 0, charOffset: 0 },
      };
      const normalized = normalizeSelection(selection);
      expect(normalized.start).toEqual({ elementIndex: 0, charOffset: 0 });
      expect(normalized.end).toEqual({ elementIndex: 0, charOffset: 5 });
    });
  });

  describe("getWordRange", () => {
    it("selects word around cursor", () => {
      const text = "Hello World";
      expect(getWordRange(text, 2)).toEqual({ start: 0, end: 5 }); // "Hello"
    });

    it("selects second word", () => {
      const text = "Hello World";
      expect(getWordRange(text, 7)).toEqual({ start: 6, end: 11 }); // "World"
    });

    it("handles cursor at word boundary", () => {
      const text = "Hello World";
      // At position 5 (after "Hello"), should select "Hello" looking left
      const range = getWordRange(text, 5);
      expect(range).toEqual({ start: 0, end: 5 });
    });

    it("handles empty string", () => {
      expect(getWordRange("", 0)).toEqual({ start: 0, end: 0 });
    });

    it("handles single word", () => {
      const text = "Hello";
      expect(getWordRange(text, 2)).toEqual({ start: 0, end: 5 });
    });

    it("handles cursor on whitespace", () => {
      const text = "Hello   World";
      // At position 6 (in whitespace), should select the whitespace
      const range = getWordRange(text, 6);
      expect(range.start).toBe(5);
      expect(range.end).toBe(8);
    });
  });

  describe("getLineRange", () => {
    it("selects entire single line", () => {
      const text = "Hello World";
      expect(getLineRange(text, 5)).toEqual({ start: 0, end: 11 });
    });

    it("selects first line in multi-line text", () => {
      const text = "Hello\nWorld";
      expect(getLineRange(text, 2)).toEqual({ start: 0, end: 5 });
    });

    it("selects second line in multi-line text", () => {
      const text = "Hello\nWorld";
      expect(getLineRange(text, 7)).toEqual({ start: 6, end: 11 });
    });

    it("handles empty string", () => {
      expect(getLineRange("", 0)).toEqual({ start: 0, end: 0 });
    });

    it("handles cursor at newline", () => {
      const text = "Hello\nWorld";
      // At position 5 (the newline), should select first line
      expect(getLineRange(text, 5)).toEqual({ start: 0, end: 5 });
    });
  });

  describe("isSelectionCollapsed", () => {
    it("returns true for collapsed selection", () => {
      const selection = {
        start: { elementIndex: 0, charOffset: 5 },
        end: { elementIndex: 0, charOffset: 5 },
      };
      expect(isSelectionCollapsed(selection)).toBe(true);
    });

    it("returns false for range selection", () => {
      const selection = {
        start: { elementIndex: 0, charOffset: 0 },
        end: { elementIndex: 0, charOffset: 5 },
      };
      expect(isSelectionCollapsed(selection)).toBe(false);
    });
  });

  describe("createCollapsedSelection", () => {
    it("creates selection with same start and end", () => {
      const position = { elementIndex: 1, charOffset: 3 };
      const selection = createCollapsedSelection(position);
      expect(selection.start).toEqual(position);
      expect(selection.end).toEqual(position);
    });
  });

  describe("getSelectionLength", () => {
    it("returns 0 for collapsed selection", () => {
      const content = [createParagraph("Hello")];
      const selection = {
        start: { elementIndex: 0, charOffset: 2 },
        end: { elementIndex: 0, charOffset: 2 },
      };
      expect(getSelectionLength(content, selection)).toBe(0);
    });

    it("returns correct length for single paragraph selection", () => {
      const content = [createParagraph("Hello")];
      const selection = {
        start: { elementIndex: 0, charOffset: 1 },
        end: { elementIndex: 0, charOffset: 4 },
      };
      expect(getSelectionLength(content, selection)).toBe(3);
    });

    it("returns correct length for cross-paragraph selection", () => {
      const content = [createParagraph("Hello"), createParagraph("World")];
      const selection = {
        start: { elementIndex: 0, charOffset: 3 },
        end: { elementIndex: 1, charOffset: 2 },
      };
      // "lo\nWo" = 5 characters
      expect(getSelectionLength(content, selection)).toBe(5);
    });

    it("handles reversed selection", () => {
      const content = [createParagraph("Hello")];
      const selection = {
        start: { elementIndex: 0, charOffset: 4 },
        end: { elementIndex: 0, charOffset: 1 },
      };
      expect(getSelectionLength(content, selection)).toBe(3);
    });
  });
});
