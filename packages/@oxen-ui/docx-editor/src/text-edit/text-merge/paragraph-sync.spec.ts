/**
 * @file paragraph-sync.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { syncParagraphsWithPlainText, paragraphsToPlainText } from "./paragraph-sync";

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

// =============================================================================
// Tests: syncParagraphsWithPlainText
// =============================================================================

describe("syncParagraphsWithPlainText", () => {
  it("syncs single paragraph", () => {
    const paragraphs = [createParagraphWithRuns([{ text: "Hello" }])];
    const result = syncParagraphsWithPlainText(paragraphs, "World");

    expect(result).toHaveLength(1);
    expect(getTextFromParagraph(result[0])).toBe("World");
  });

  it("syncs multiple paragraphs", () => {
    const paragraphs = [
      createParagraphWithRuns([{ text: "Line 1" }]),
      createParagraphWithRuns([{ text: "Line 2" }]),
    ];
    const result = syncParagraphsWithPlainText(paragraphs, "New 1\nNew 2");

    expect(result).toHaveLength(2);
    expect(getTextFromParagraph(result[0])).toBe("New 1");
    expect(getTextFromParagraph(result[1])).toBe("New 2");
  });

  it("creates new paragraphs when text has more lines", () => {
    const paragraphs = [createParagraphWithRuns([{ text: "Original" }])];
    const result = syncParagraphsWithPlainText(paragraphs, "Line 1\nLine 2\nLine 3");

    expect(result).toHaveLength(3);
    expect(getTextFromParagraph(result[0])).toBe("Line 1");
    expect(getTextFromParagraph(result[1])).toBe("Line 2");
    expect(getTextFromParagraph(result[2])).toBe("Line 3");
  });

  it("removes paragraphs when text has fewer lines", () => {
    const paragraphs = [
      createParagraphWithRuns([{ text: "Line 1" }]),
      createParagraphWithRuns([{ text: "Line 2" }]),
      createParagraphWithRuns([{ text: "Line 3" }]),
    ];
    const result = syncParagraphsWithPlainText(paragraphs, "Single line");

    expect(result).toHaveLength(1);
    expect(getTextFromParagraph(result[0])).toBe("Single line");
  });

  it("preserves paragraph properties", () => {
    const paragraphs: DocxParagraph[] = [
      {
        type: "paragraph",
        properties: { jc: "center" },
        content: [{ type: "run", content: [{ type: "text", value: "Old" }] }],
      },
    ];
    const result = syncParagraphsWithPlainText(paragraphs, "New");

    expect(result[0].properties?.jc).toBe("center");
  });

  it("preserves formatting in existing paragraphs", () => {
    const paragraphs = [
      createParagraphWithRuns([
        { text: "Bold", properties: { b: true } },
        { text: "Normal" },
      ]),
    ];
    const result = syncParagraphsWithPlainText(paragraphs, "BoldNormal!");

    expect(getTextFromParagraph(result[0])).toBe("BoldNormal!");
  });

  it("handles empty original paragraphs", () => {
    const result = syncParagraphsWithPlainText([], "Line 1\nLine 2");

    expect(result).toHaveLength(2);
    expect(getTextFromParagraph(result[0])).toBe("Line 1");
    expect(getTextFromParagraph(result[1])).toBe("Line 2");
  });

  it("handles empty text", () => {
    const paragraphs = [createParagraphWithRuns([{ text: "Content" }])];
    const result = syncParagraphsWithPlainText(paragraphs, "");

    expect(result).toHaveLength(1);
    expect(result[0].content).toHaveLength(0);
  });

  it("uses template paragraph for new lines", () => {
    const paragraphs: DocxParagraph[] = [
      {
        type: "paragraph",
        properties: { jc: "right" },
        content: [{ type: "run", properties: { b: true }, content: [{ type: "text", value: "Template" }] }],
      },
    ];
    const result = syncParagraphsWithPlainText(paragraphs, "Line 1\nLine 2");

    // Second paragraph should use template from first
    expect(result[1].properties?.jc).toBe("right");
  });
});

// =============================================================================
// Tests: paragraphsToPlainText
// =============================================================================

describe("paragraphsToPlainText", () => {
  it("converts single paragraph", () => {
    const paragraphs = [createParagraphWithRuns([{ text: "Hello World" }])];
    expect(paragraphsToPlainText(paragraphs)).toBe("Hello World");
  });

  it("joins multiple paragraphs with newlines", () => {
    const paragraphs = [
      createParagraphWithRuns([{ text: "Line 1" }]),
      createParagraphWithRuns([{ text: "Line 2" }]),
      createParagraphWithRuns([{ text: "Line 3" }]),
    ];
    expect(paragraphsToPlainText(paragraphs)).toBe("Line 1\nLine 2\nLine 3");
  });

  it("handles empty paragraphs", () => {
    const paragraphs = [
      createParagraphWithRuns([{ text: "Before" }]),
      { type: "paragraph" as const, content: [] },
      createParagraphWithRuns([{ text: "After" }]),
    ];
    expect(paragraphsToPlainText(paragraphs)).toBe("Before\n\nAfter");
  });

  it("handles empty array", () => {
    expect(paragraphsToPlainText([])).toBe("");
  });
});
