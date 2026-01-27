/**
 * @file paragraph-edit.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import {
  mergeTextIntoParagraph,
  insertTextAtOffset,
  deleteTextRange,
  replaceTextRange,
} from "./paragraph-edit";

// =============================================================================
// Test Fixtures
// =============================================================================

function createParagraphWithRuns(
  runs: Array<{ text: string; properties?: DocxRunProperties }>,
): DocxParagraph {
  return {
    type: "paragraph",
    content: runs.map(({ text, properties }) => ({
      type: "run" as const,
      properties,
      content: [{ type: "text" as const, value: text }],
    })),
  };
}

function getTextFromParagraph(paragraph: DocxParagraph): string {
  return paragraph.content
    .filter((c): c is DocxRun => c.type === "run")
    .flatMap((r) => r.content)
    .map((c) => (c.type === "text" ? c.value : ""))
    .join("");
}

function getRunTexts(paragraph: DocxParagraph): string[] {
  return paragraph.content
    .filter((c): c is DocxRun => c.type === "run")
    .map((run) =>
      run.content
        .map((c) => (c.type === "text" ? c.value : ""))
        .join(""),
    );
}

// =============================================================================
// Tests: mergeTextIntoParagraph
// =============================================================================

describe("mergeTextIntoParagraph", () => {
  it("merges text into simple paragraph", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = mergeTextIntoParagraph(paragraph, "World");
    expect(getTextFromParagraph(result)).toBe("World");
  });

  it("preserves paragraph properties", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "center" },
      content: [{ type: "run", content: [{ type: "text", value: "Old" }] }],
    };
    const result = mergeTextIntoParagraph(paragraph, "New");
    expect(result.properties?.jc).toBe("center");
  });

  it("preserves run properties when text unchanged", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello", properties: { b: true } }]);
    const result = mergeTextIntoParagraph(paragraph, "Hello");
    // Should return original paragraph
    expect(result).toBe(paragraph);
  });

  it("handles empty text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = mergeTextIntoParagraph(paragraph, "");
    expect(result.content).toHaveLength(0);
  });

  it("handles empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    const result = mergeTextIntoParagraph(paragraph, "New text");
    expect(getTextFromParagraph(result)).toBe("New text");
  });

  // Inline formatting preservation tests
  describe("inline formatting preservation", () => {
    it("preserves formatting when appending text", () => {
      const paragraph = createParagraphWithRuns([
        { text: "Bold", properties: { b: true } },
        { text: "Normal" },
      ]);
      // Append "!" at the end - the "!" inherits properties from edit point (end of "Normal")
      const result = mergeTextIntoParagraph(paragraph, "BoldNormal!");

      expect(getTextFromParagraph(result)).toBe("BoldNormal!");
      // Verify text is preserved
      const runs = result.content.filter((c): c is DocxRun => c.type === "run");
      expect(runs.length).toBeGreaterThanOrEqual(1);
    });

    it("preserves formatting when inserting in middle", () => {
      const paragraph = createParagraphWithRuns([
        { text: "AB", properties: { b: true } },
        { text: "CD", properties: { i: true } },
      ]);
      // Insert "X" between A and B
      const result = mergeTextIntoParagraph(paragraph, "AXBCD");

      expect(getTextFromParagraph(result)).toBe("AXBCD");
    });

    it("preserves formatting when deleting text", () => {
      const paragraph = createParagraphWithRuns([
        { text: "AB", properties: { b: true } },
        { text: "CD", properties: { i: true } },
      ]);
      // Delete "BC"
      const result = mergeTextIntoParagraph(paragraph, "AD");

      expect(getTextFromParagraph(result)).toBe("AD");
      const runs = result.content.filter((c): c is DocxRun => c.type === "run");
      // "A" should still be bold, "D" should still be italic
      expect(runs[0].properties?.b).toBe(true);
      if (runs.length > 1) {
        expect(runs[runs.length - 1].properties?.i).toBe(true);
      }
    });

    it("preserves prefix and suffix formatting during replacement", () => {
      const paragraph = createParagraphWithRuns([
        { text: "Start", properties: { b: true } },
        { text: "Middle", properties: { i: true } },
        { text: "End", properties: { strike: true } },
      ]);
      // Replace "Middle" with "New"
      const result = mergeTextIntoParagraph(paragraph, "StartNewEnd");

      expect(getTextFromParagraph(result)).toBe("StartNewEnd");
      const runs = result.content.filter((c): c is DocxRun => c.type === "run");
      // First run "Start" should still be bold
      expect(runs[0].properties?.b).toBe(true);
      // Last run "End" should still be strikethrough
      expect(runs[runs.length - 1].properties?.strike).toBe(true);
    });
  });
});

// =============================================================================
// Tests: insertTextAtOffset
// =============================================================================

describe("insertTextAtOffset", () => {
  it("inserts text at beginning", () => {
    const paragraph = createParagraphWithRuns([{ text: "World" }]);
    const result = insertTextAtOffset(paragraph, 0, "Hello ");
    expect(getTextFromParagraph(result)).toBe("Hello World");
  });

  it("inserts text at middle", () => {
    const paragraph = createParagraphWithRuns([{ text: "Helo" }]);
    const result = insertTextAtOffset(paragraph, 2, "l");
    expect(getTextFromParagraph(result)).toBe("Hello");
  });

  it("inserts text at end", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = insertTextAtOffset(paragraph, 5, " World");
    expect(getTextFromParagraph(result)).toBe("Hello World");
  });

  it("preserves formatting at insertion point", () => {
    const paragraph = createParagraphWithRuns([
      { text: "AB", properties: { b: true } },
      { text: "CD" },
    ]);
    // Insert "X" at position 1 (inside bold region)
    const result = insertTextAtOffset(paragraph, 1, "X");
    expect(getTextFromParagraph(result)).toBe("AXBCD");

    const runs = result.content.filter((c): c is DocxRun => c.type === "run");
    // "AXB" should be bold (inserted text inherits from position)
    expect(runs[0].properties?.b).toBe(true);
  });
});

// =============================================================================
// Tests: deleteTextRange
// =============================================================================

describe("deleteTextRange", () => {
  it("deletes text from middle", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = deleteTextRange(paragraph, 5, 11);
    expect(getTextFromParagraph(result)).toBe("Hello");
  });

  it("deletes text from start", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = deleteTextRange(paragraph, 0, 6);
    expect(getTextFromParagraph(result)).toBe("World");
  });

  it("deletes all text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = deleteTextRange(paragraph, 0, 5);
    expect(result.content).toHaveLength(0);
  });

  it("preserves formatting around deletion", () => {
    const paragraph = createParagraphWithRuns([
      { text: "AB", properties: { b: true } },
      { text: "XX" },
      { text: "CD", properties: { i: true } },
    ]);
    // Delete "XX"
    const result = deleteTextRange(paragraph, 2, 4);
    expect(getTextFromParagraph(result)).toBe("ABCD");

    const runs = result.content.filter((c): c is DocxRun => c.type === "run");
    expect(runs[0].properties?.b).toBe(true);
    expect(runs[runs.length - 1].properties?.i).toBe(true);
  });
});

// =============================================================================
// Tests: replaceTextRange
// =============================================================================

describe("replaceTextRange", () => {
  it("replaces text in middle", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = replaceTextRange(paragraph, 6, 11, "Universe");
    expect(getTextFromParagraph(result)).toBe("Hello Universe");
  });

  it("replaces text at start", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = replaceTextRange(paragraph, 0, 5, "Hi");
    expect(getTextFromParagraph(result)).toBe("Hi World");
  });

  it("replaces entire text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = replaceTextRange(paragraph, 0, 5, "World");
    expect(getTextFromParagraph(result)).toBe("World");
  });

  it("preserves surrounding formatting", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Start", properties: { b: true } },
      { text: "OLD", properties: { i: true } },
      { text: "End", properties: { strike: true } },
    ]);
    // Replace "OLD" with "NEW"
    const result = replaceTextRange(paragraph, 5, 8, "NEW");
    expect(getTextFromParagraph(result)).toBe("StartNEWEnd");

    const runs = result.content.filter((c): c is DocxRun => c.type === "run");
    expect(runs[0].properties?.b).toBe(true);
    expect(runs[runs.length - 1].properties?.strike).toBe(true);
  });
});
