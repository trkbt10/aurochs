/**
 * @file formatting.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { halfPoints } from "@oxen/docx/domain/types";
import { applyFormatToRange, toggleFormatOnRange, removeFormatFromRange } from "./formatting";

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

function getRuns(paragraph: DocxParagraph): DocxRun[] {
  return paragraph.content.filter((c): c is DocxRun => c.type === "run");
}

// =============================================================================
// Tests: applyFormatToRange
// =============================================================================

describe("applyFormatToRange", () => {
  it("applies bold to middle of text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = applyFormatToRange(paragraph, 6, 11, { b: true });

    expect(getTextFromParagraph(result)).toBe("Hello World");
    const runs = getRuns(result);
    expect(runs).toHaveLength(2);
    expect(runs[0].properties?.b).toBeUndefined();
    expect(runs[1].properties?.b).toBe(true);
  });

  it("applies format to entire text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = applyFormatToRange(paragraph, 0, 5, { i: true });

    const runs = getRuns(result);
    expect(runs).toHaveLength(1);
    expect(runs[0].properties?.i).toBe(true);
  });

  it("applies format to start of text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = applyFormatToRange(paragraph, 0, 5, { b: true });

    const runs = getRuns(result);
    expect(runs).toHaveLength(2);
    expect(runs[0].properties?.b).toBe(true);
    expect(runs[1].properties?.b).toBeUndefined();
  });

  it("applies format to end of text", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello World" }]);
    const result = applyFormatToRange(paragraph, 6, 11, { i: true });

    const runs = getRuns(result);
    expect(runs).toHaveLength(2);
    expect(runs[0].properties?.i).toBeUndefined();
    expect(runs[1].properties?.i).toBe(true);
  });

  it("handles empty selection", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = applyFormatToRange(paragraph, 2, 2, { b: true });

    expect(getTextFromParagraph(result)).toBe("Hello");
  });

  it("merges with existing properties", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello", properties: { b: true } }]);
    const result = applyFormatToRange(paragraph, 0, 5, { i: true });

    const runs = getRuns(result);
    expect(runs[0].properties?.b).toBe(true);
    expect(runs[0].properties?.i).toBe(true);
  });

  it("creates three runs for middle selection", () => {
    const paragraph = createParagraphWithRuns([{ text: "ABCDE" }]);
    const result = applyFormatToRange(paragraph, 1, 4, { b: true });

    expect(getTextFromParagraph(result)).toBe("ABCDE");
    const runs = getRuns(result);
    expect(runs).toHaveLength(3);
    expect(runs[0].properties?.b).toBeUndefined(); // "A"
    expect(runs[1].properties?.b).toBe(true); // "BCD"
    expect(runs[2].properties?.b).toBeUndefined(); // "E"
  });
});

// =============================================================================
// Tests: toggleFormatOnRange
// =============================================================================

describe("toggleFormatOnRange", () => {
  it("adds bold when not present", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = toggleFormatOnRange(paragraph, 0, 5, "b");

    const runs = getRuns(result);
    expect(runs[0].properties?.b).toBe(true);
  });

  it("removes bold when present", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello", properties: { b: true } }]);
    const result = toggleFormatOnRange(paragraph, 0, 5, "b");

    const runs = getRuns(result);
    expect(runs[0].properties?.b).toBeUndefined();
  });

  it("toggles italic", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = toggleFormatOnRange(paragraph, 0, 5, "i");

    const runs = getRuns(result);
    expect(runs[0].properties?.i).toBe(true);
  });

  it("toggles strike", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello", properties: { strike: true } }]);
    const result = toggleFormatOnRange(paragraph, 0, 5, "strike");

    const runs = getRuns(result);
    expect(runs[0].properties?.strike).toBeUndefined();
  });

  it("toggles caps", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = toggleFormatOnRange(paragraph, 0, 5, "caps");

    const runs = getRuns(result);
    expect(runs[0].properties?.caps).toBe(true);
  });

  it("toggles smallCaps", () => {
    const paragraph = createParagraphWithRuns([{ text: "Hello" }]);
    const result = toggleFormatOnRange(paragraph, 0, 5, "smallCaps");

    const runs = getRuns(result);
    expect(runs[0].properties?.smallCaps).toBe(true);
  });
});

// =============================================================================
// Tests: removeFormatFromRange
// =============================================================================

describe("removeFormatFromRange", () => {
  it("removes all formatting from range", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Hello", properties: { b: true, i: true, sz: halfPoints(24) } },
    ]);
    const result = removeFormatFromRange(paragraph, 0, 5);

    const runs = getRuns(result);
    expect(runs[0].properties).toBeUndefined();
  });

  it("preserves formatting outside range", () => {
    const paragraph = createParagraphWithRuns([
      { text: "ABCDE", properties: { b: true } },
    ]);
    const result = removeFormatFromRange(paragraph, 2, 3); // Remove from "C"

    expect(getTextFromParagraph(result)).toBe("ABCDE");
    const runs = getRuns(result);
    expect(runs).toHaveLength(3);
    expect(runs[0].properties?.b).toBe(true); // "AB"
    expect(runs[1].properties).toBeUndefined(); // "C"
    expect(runs[2].properties?.b).toBe(true); // "DE"
  });

  it("handles removing format from start", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Hello", properties: { i: true } },
    ]);
    const result = removeFormatFromRange(paragraph, 0, 2);

    const runs = getRuns(result);
    expect(runs).toHaveLength(2);
    expect(runs[0].properties).toBeUndefined(); // "He"
    expect(runs[1].properties?.i).toBe(true); // "llo"
  });

  it("handles removing format from end", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Hello", properties: { i: true } },
    ]);
    const result = removeFormatFromRange(paragraph, 3, 5);

    const runs = getRuns(result);
    expect(runs).toHaveLength(2);
    expect(runs[0].properties?.i).toBe(true); // "Hel"
    expect(runs[1].properties).toBeUndefined(); // "lo"
  });
});
