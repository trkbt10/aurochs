/**
 * @file run-properties.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRunProperties } from "@oxen/docx/domain/run";
import { halfPoints, docxRelId } from "@oxen/docx/domain/types";
import {
  areRunPropertiesEqual,
  getBaseRunProperties,
  getRunPropertiesAtPosition,
} from "./run-properties";

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

// =============================================================================
// Tests: areRunPropertiesEqual
// =============================================================================

describe("areRunPropertiesEqual", () => {
  it("returns true for identical references", () => {
    const props: DocxRunProperties = { b: true };
    expect(areRunPropertiesEqual(props, props)).toBe(true);
  });

  it("returns true for both undefined", () => {
    expect(areRunPropertiesEqual(undefined, undefined)).toBe(true);
  });

  it("returns false when one is undefined", () => {
    expect(areRunPropertiesEqual({ b: true }, undefined)).toBe(false);
    expect(areRunPropertiesEqual(undefined, { b: true })).toBe(false);
  });

  it("compares bold property", () => {
    expect(areRunPropertiesEqual({ b: true }, { b: true })).toBe(true);
    expect(areRunPropertiesEqual({ b: true }, { b: false })).toBe(false);
    expect(areRunPropertiesEqual({ b: true }, {})).toBe(false);
  });

  it("compares italic property", () => {
    expect(areRunPropertiesEqual({ i: true }, { i: true })).toBe(true);
    expect(areRunPropertiesEqual({ i: true }, { i: false })).toBe(false);
  });

  it("compares underline property", () => {
    expect(areRunPropertiesEqual({ u: { val: "single" } }, { u: { val: "single" } })).toBe(true);
    expect(areRunPropertiesEqual({ u: { val: "single" } }, { u: { val: "double" } })).toBe(false);
  });

  it("compares strike property", () => {
    expect(areRunPropertiesEqual({ strike: true }, { strike: true })).toBe(true);
    expect(areRunPropertiesEqual({ strike: true }, { strike: false })).toBe(false);
  });

  it("compares font size property", () => {
    expect(areRunPropertiesEqual({ sz: halfPoints(24) }, { sz: halfPoints(24) })).toBe(true);
    expect(areRunPropertiesEqual({ sz: halfPoints(24) }, { sz: halfPoints(28) })).toBe(false);
  });

  it("compares font family property", () => {
    expect(
      areRunPropertiesEqual({ rFonts: { ascii: "Arial" } }, { rFonts: { ascii: "Arial" } }),
    ).toBe(true);
    expect(
      areRunPropertiesEqual({ rFonts: { ascii: "Arial" } }, { rFonts: { ascii: "Times" } }),
    ).toBe(false);
  });

  it("compares color property", () => {
    expect(areRunPropertiesEqual({ color: { val: "FF0000" } }, { color: { val: "FF0000" } })).toBe(
      true,
    );
    expect(areRunPropertiesEqual({ color: { val: "FF0000" } }, { color: { val: "0000FF" } })).toBe(
      false,
    );
  });

  it("compares vertAlign property", () => {
    expect(areRunPropertiesEqual({ vertAlign: "superscript" }, { vertAlign: "superscript" })).toBe(
      true,
    );
    expect(areRunPropertiesEqual({ vertAlign: "superscript" }, { vertAlign: "subscript" })).toBe(
      false,
    );
  });

  it("compares caps property", () => {
    expect(areRunPropertiesEqual({ caps: true }, { caps: true })).toBe(true);
    expect(areRunPropertiesEqual({ caps: true }, { caps: false })).toBe(false);
  });

  it("compares highlight property", () => {
    expect(areRunPropertiesEqual({ highlight: "yellow" }, { highlight: "yellow" })).toBe(true);
    expect(areRunPropertiesEqual({ highlight: "yellow" }, { highlight: "cyan" })).toBe(false);
  });

  it("compares multiple properties together", () => {
    const propsA: DocxRunProperties = { b: true, i: true, sz: halfPoints(24) };
    const propsB: DocxRunProperties = { b: true, i: true, sz: halfPoints(24) };
    const propsC: DocxRunProperties = { b: true, i: false, sz: halfPoints(24) };

    expect(areRunPropertiesEqual(propsA, propsB)).toBe(true);
    expect(areRunPropertiesEqual(propsA, propsC)).toBe(false);
  });
});

// =============================================================================
// Tests: getBaseRunProperties
// =============================================================================

describe("getBaseRunProperties", () => {
  it("returns properties from first run", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Bold", properties: { b: true } },
      { text: "Normal" },
    ]);
    expect(getBaseRunProperties(paragraph)?.b).toBe(true);
  });

  it("skips runs without properties", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Normal" },
      { text: "Bold", properties: { b: true } },
    ]);
    expect(getBaseRunProperties(paragraph)?.b).toBe(true);
  });

  it("returns properties from hyperlink runs", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        {
          type: "hyperlink",
          rId: docxRelId("rId1"),
          content: [{ type: "run", properties: { i: true }, content: [{ type: "text", value: "Link" }] }],
        },
      ],
    };
    expect(getBaseRunProperties(paragraph)?.i).toBe(true);
  });

  it("returns paragraph rPr as fallback", () => {
    const sz = halfPoints(28);
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { rPr: { sz } },
      content: [],
    };
    expect(getBaseRunProperties(paragraph)?.sz).toBe(sz);
  });

  it("returns undefined for empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    expect(getBaseRunProperties(paragraph)).toBeUndefined();
  });
});

// =============================================================================
// Tests: getRunPropertiesAtPosition
// =============================================================================

describe("getRunPropertiesAtPosition", () => {
  it("returns properties at start of first run", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Bold", properties: { b: true } },
      { text: "Italic", properties: { i: true } },
    ]);
    expect(getRunPropertiesAtPosition(paragraph, 0)?.b).toBe(true);
  });

  it("returns properties at middle of first run", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Bold", properties: { b: true } },
      { text: "Italic", properties: { i: true } },
    ]);
    expect(getRunPropertiesAtPosition(paragraph, 2)?.b).toBe(true);
  });

  it("returns properties of second run", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Bold", properties: { b: true } },
      { text: "Italic", properties: { i: true } },
    ]);
    // "Bold" = 4 chars, position 5 is inside "Italic"
    expect(getRunPropertiesAtPosition(paragraph, 5)?.i).toBe(true);
  });

  it("returns properties in middle of second run", () => {
    const paragraph = createParagraphWithRuns([
      { text: "Bold", properties: { b: true } },
      { text: "Italic", properties: { i: true } },
    ]);
    expect(getRunPropertiesAtPosition(paragraph, 6)?.i).toBe(true);
  });

  it("returns last run properties past end", () => {
    const paragraph = createParagraphWithRuns([
      { text: "First", properties: { b: true } },
      { text: "Last", properties: { i: true } },
    ]);
    expect(getRunPropertiesAtPosition(paragraph, 100)?.i).toBe(true);
  });

  it("returns undefined for empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    expect(getRunPropertiesAtPosition(paragraph, 0)).toBeUndefined();
  });

  it("returns paragraph rPr for empty runs", () => {
    const sz = halfPoints(28);
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { rPr: { sz } },
      content: [],
    };
    expect(getRunPropertiesAtPosition(paragraph, 0)?.sz).toBe(sz);
  });
});
