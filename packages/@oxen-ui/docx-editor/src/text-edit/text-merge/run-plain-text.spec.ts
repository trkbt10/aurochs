/**
 * @file run-plain-text.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun } from "@oxen/docx/domain/run";
import { docxRelId } from "@oxen/docx/domain/types";
import { getRunPlainText, getParagraphPlainText } from "./run-plain-text";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextRun(text: string): DocxRun {
  return {
    type: "run",
    content: [{ type: "text", value: text }],
  };
}

function createRunWithTab(): DocxRun {
  return {
    type: "run",
    content: [{ type: "tab" }],
  };
}

function createRunWithBreak(): DocxRun {
  return {
    type: "run",
    content: [{ type: "break", breakType: "textWrapping" }],
  };
}

function createRunWithSymbol(): DocxRun {
  return {
    type: "run",
    content: [{ type: "symbol", char: "F0A7", font: "Wingdings" }],
  };
}

// =============================================================================
// Tests: getRunPlainText
// =============================================================================

describe("getRunPlainText", () => {
  it("extracts text from simple text run", () => {
    const run = createTextRun("Hello World");
    expect(getRunPlainText(run)).toBe("Hello World");
  });

  it("converts tab to tab character", () => {
    const run = createRunWithTab();
    expect(getRunPlainText(run)).toBe("\t");
  });

  it("converts break to newline", () => {
    const run = createRunWithBreak();
    expect(getRunPlainText(run)).toBe("\n");
  });

  it("converts symbol to empty string", () => {
    const run = createRunWithSymbol();
    expect(getRunPlainText(run)).toBe("");
  });

  it("concatenates mixed content", () => {
    const run: DocxRun = {
      type: "run",
      content: [
        { type: "text", value: "Before" },
        { type: "tab" },
        { type: "text", value: "After" },
      ],
    };
    expect(getRunPlainText(run)).toBe("Before\tAfter");
  });

  it("handles empty run", () => {
    const run: DocxRun = { type: "run", content: [] };
    expect(getRunPlainText(run)).toBe("");
  });
});

// =============================================================================
// Tests: getParagraphPlainText
// =============================================================================

describe("getParagraphPlainText", () => {
  it("extracts text from single run", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [createTextRun("Hello")],
    };
    expect(getParagraphPlainText(paragraph)).toBe("Hello");
  });

  it("concatenates multiple runs", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [createTextRun("Hello"), createTextRun(" "), createTextRun("World")],
    };
    expect(getParagraphPlainText(paragraph)).toBe("Hello World");
  });

  it("handles hyperlinks", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        createTextRun("Click "),
        {
          type: "hyperlink",
          rId: docxRelId("rId1"),
          content: [createTextRun("here")],
        },
        createTextRun(" for more"),
      ],
    };
    expect(getParagraphPlainText(paragraph)).toBe("Click here for more");
  });

  it("handles empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    expect(getParagraphPlainText(paragraph)).toBe("");
  });

  it("ignores bookmark markers", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        createTextRun("Before"),
        { type: "bookmarkStart", id: 1, name: "test" },
        createTextRun("After"),
        { type: "bookmarkEnd", id: 1 },
      ],
    };
    expect(getParagraphPlainText(paragraph)).toBe("BeforeAfter");
  });
});
