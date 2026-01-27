/**
 * @file character-mapping.ts unit tests
 */

import { describe, it, expect } from "vitest";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRunProperties } from "@oxen/docx/domain/run";
import { halfPoints, docxRelId } from "@oxen/docx/domain/types";
import {
  buildCharacterPropertiesMap,
  findCommonPrefixSuffix,
  createRunsFromPropertiesMap,
} from "./character-mapping";

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
// Tests: buildCharacterPropertiesMap
// =============================================================================

describe("buildCharacterPropertiesMap", () => {
  it("builds map for single run", () => {
    const boldProps: DocxRunProperties = { b: true };
    const paragraph = createParagraphWithRuns([{ text: "Hello", properties: boldProps }]);
    const map = buildCharacterPropertiesMap(paragraph);

    expect(map).toHaveLength(5);
    expect(map[0]).toBe(boldProps);
    expect(map[4]).toBe(boldProps);
  });

  it("builds map for multiple runs", () => {
    const boldProps: DocxRunProperties = { b: true };
    const italicProps: DocxRunProperties = { i: true };
    const paragraph = createParagraphWithRuns([
      { text: "AB", properties: boldProps },
      { text: "CD", properties: italicProps },
    ]);
    const map = buildCharacterPropertiesMap(paragraph);

    expect(map).toHaveLength(4);
    expect(map[0]).toBe(boldProps);
    expect(map[1]).toBe(boldProps);
    expect(map[2]).toBe(italicProps);
    expect(map[3]).toBe(italicProps);
  });

  it("handles runs without properties", () => {
    const paragraph = createParagraphWithRuns([{ text: "ABC" }]);
    const map = buildCharacterPropertiesMap(paragraph);

    expect(map).toHaveLength(3);
    expect(map[0]).toBeUndefined();
  });

  it("handles hyperlinks", () => {
    const linkProps: DocxRunProperties = { color: { val: "0000FF" } };
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        {
          type: "hyperlink",
          rId: docxRelId("rId1"),
          content: [
            { type: "run", properties: linkProps, content: [{ type: "text", value: "Link" }] },
          ],
        },
      ],
    };
    const map = buildCharacterPropertiesMap(paragraph);

    expect(map).toHaveLength(4);
    expect(map[0]).toBe(linkProps);
  });

  it("handles empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    const map = buildCharacterPropertiesMap(paragraph);

    expect(map).toHaveLength(0);
  });
});

// =============================================================================
// Tests: findCommonPrefixSuffix
// =============================================================================

describe("findCommonPrefixSuffix", () => {
  it("finds full match when identical", () => {
    const result = findCommonPrefixSuffix("Hello", "Hello");
    expect(result.prefixLen).toBe(5);
    expect(result.suffixLen).toBe(0);
  });

  it("finds common prefix", () => {
    const result = findCommonPrefixSuffix("Hello World", "Hello Earth");
    expect(result.prefixLen).toBe(6); // "Hello "
    expect(result.suffixLen).toBe(0);
  });

  it("finds common suffix", () => {
    const result = findCommonPrefixSuffix("Hello World", "Goodbye World");
    expect(result.prefixLen).toBe(0);
    expect(result.suffixLen).toBe(6); // " World"
  });

  it("finds both prefix and suffix", () => {
    const result = findCommonPrefixSuffix("Hello World!", "Hello Earth!");
    expect(result.prefixLen).toBe(6); // "Hello "
    expect(result.suffixLen).toBe(1); // "!"
  });

  it("handles insertion at middle", () => {
    const result = findCommonPrefixSuffix("abcd", "abXcd");
    expect(result.prefixLen).toBe(2); // "ab"
    expect(result.suffixLen).toBe(2); // "cd"
  });

  it("handles deletion at middle", () => {
    const result = findCommonPrefixSuffix("abXcd", "abcd");
    expect(result.prefixLen).toBe(2); // "ab"
    expect(result.suffixLen).toBe(2); // "cd"
  });

  it("handles completely different strings", () => {
    const result = findCommonPrefixSuffix("ABC", "XYZ");
    expect(result.prefixLen).toBe(0);
    expect(result.suffixLen).toBe(0);
  });

  it("handles empty strings", () => {
    expect(findCommonPrefixSuffix("", "")).toEqual({ prefixLen: 0, suffixLen: 0 });
    expect(findCommonPrefixSuffix("ABC", "")).toEqual({ prefixLen: 0, suffixLen: 0 });
    expect(findCommonPrefixSuffix("", "ABC")).toEqual({ prefixLen: 0, suffixLen: 0 });
  });

  it("does not overlap prefix and suffix", () => {
    const result = findCommonPrefixSuffix("AA", "A");
    // "AA" vs "A" - prefix is "A", no suffix (would overlap)
    expect(result.prefixLen + result.suffixLen).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// Tests: createRunsFromPropertiesMap
// =============================================================================

describe("createRunsFromPropertiesMap", () => {
  it("creates single run for uniform properties", () => {
    const boldProps: DocxRunProperties = { b: true };
    const map = [boldProps, boldProps, boldProps];
    const runs = createRunsFromPropertiesMap("ABC", map, undefined);

    expect(runs).toHaveLength(1);
    expect(runs[0].properties).toBe(boldProps);
    expect(runs[0].content[0].type).toBe("text");
    if (runs[0].content[0].type === "text") {
      expect(runs[0].content[0].value).toBe("ABC");
    }
  });

  it("creates multiple runs for different properties", () => {
    const boldProps: DocxRunProperties = { b: true };
    const italicProps: DocxRunProperties = { i: true };
    const map = [boldProps, boldProps, italicProps, italicProps];
    const runs = createRunsFromPropertiesMap("ABCD", map, undefined);

    expect(runs).toHaveLength(2);
    expect(runs[0].properties).toBe(boldProps);
    expect(runs[1].properties).toBe(italicProps);

    if (runs[0].content[0].type === "text" && runs[1].content[0].type === "text") {
      expect(runs[0].content[0].value).toBe("AB");
      expect(runs[1].content[0].value).toBe("CD");
    }
  });

  it("uses default properties for undefined map entries", () => {
    const defaultProps: DocxRunProperties = { sz: halfPoints(24) };
    const map: (DocxRunProperties | undefined)[] = [undefined, undefined];
    const runs = createRunsFromPropertiesMap("AB", map, defaultProps);

    expect(runs).toHaveLength(1);
    expect(runs[0].properties).toBe(defaultProps);
  });

  it("handles empty text", () => {
    const runs = createRunsFromPropertiesMap("", [], undefined);
    expect(runs).toHaveLength(0);
  });

  it("handles alternating properties", () => {
    const boldProps: DocxRunProperties = { b: true };
    const italicProps: DocxRunProperties = { i: true };
    const map = [boldProps, italicProps, boldProps];
    const runs = createRunsFromPropertiesMap("ABC", map, undefined);

    expect(runs).toHaveLength(3);
  });

  it("handles map shorter than text (uses default)", () => {
    const boldProps: DocxRunProperties = { b: true };
    const defaultProps: DocxRunProperties = { i: true };
    const map = [boldProps];
    const runs = createRunsFromPropertiesMap("ABC", map, defaultProps);

    expect(runs).toHaveLength(2);
    expect(runs[0].properties).toBe(boldProps);
    expect(runs[1].properties).toBe(defaultProps);
  });
});
