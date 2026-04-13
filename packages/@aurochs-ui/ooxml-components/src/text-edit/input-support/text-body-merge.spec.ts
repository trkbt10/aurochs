/**
 * @file text-body-merge unit tests
 *
 * Tests for merging edited text into TextBody structures,
 * with focus on insertion-point style inheritance and styled paste.
 */

import type { TextBody, RunProperties } from "@aurochs-office/pptx/domain";
import { pt } from "@aurochs-office/drawing-ml/domain/units";
import {
  flattenTextBody,
  mergeTextIntoBody,
  extractDefaultRunProperties,
  type StyledCharEntry,
  type PendingStyledPaste,
} from "./text-body-merge";

// =============================================================================
// Test Fixtures
// =============================================================================

const EMPTY_BODY_PROPS: TextBody["bodyProperties"] = {};

const BOLD_PROPS: RunProperties = { bold: true, fontSize: pt(24) };
const ITALIC_PROPS: RunProperties = { italic: true, fontSize: pt(12) };
const UNDERLINE_PROPS: RunProperties = { underline: "sng", fontSize: pt(18) };

/**
 * Create a TextBody with multiple runs in a single paragraph.
 *
 * Example: createMultiRunBody([["Aurochs", BOLD_PROPS], [" Office", ITALIC_PROPS]])
 */
function createMultiRunBody(
  runs: readonly (readonly [string, RunProperties | undefined])[],
): TextBody {
  return {
    bodyProperties: EMPTY_BODY_PROPS,
    paragraphs: [
      {
        properties: {},
        runs: runs.map(([text, properties]) => ({
          type: "text" as const,
          text,
          properties,
        })),
      },
    ],
  };
}

/**
 * Create a TextBody with multiple paragraphs, each with a single run.
 */
function createMultiParagraphBody(
  paragraphs: readonly (readonly [string, RunProperties | undefined])[],
): TextBody {
  return {
    bodyProperties: EMPTY_BODY_PROPS,
    paragraphs: paragraphs.map(([text, properties]) => ({
      properties: {},
      runs: [{ type: "text" as const, text, properties }],
    })),
  };
}

/**
 * Collect all runs from a TextBody as [text, properties] pairs.
 * Useful for asserting the run structure after a merge.
 */
function collectRuns(body: TextBody): readonly (readonly [string, RunProperties | undefined])[] {
  return body.paragraphs.flatMap((p) =>
    p.runs
      .filter((r): r is { type: "text"; text: string; properties?: RunProperties } => r.type === "text")
      .map((r) => [r.text, r.properties] as const),
  );
}

/**
 * Get plain text from a TextBody (paragraphs joined by "\n").
 */
function getPlainText(body: TextBody): string {
  return body.paragraphs
    .map((p) =>
      p.runs
        .map((r) => {
          if (r.type === "break") {return "\n";}
          return r.type === "text" || r.type === "field" ? r.text : "";
        })
        .join(""),
    )
    .join("\n");
}

// =============================================================================
// Tests: flattenTextBody
// =============================================================================

describe("flattenTextBody", () => {
  it("flattens single-run paragraph into per-character entries", () => {
    const body = createMultiRunBody([["ABC", BOLD_PROPS]]);
    const entries = flattenTextBody(body);

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.char).join("")).toBe("ABC");
    for (const entry of entries) {
      expect(entry.kind).toBe("text");
      expect(entry.properties).toBe(BOLD_PROPS);
    }
  });

  it("flattens multi-run paragraph preserving per-character properties", () => {
    const body = createMultiRunBody([
      ["AB", BOLD_PROPS],
      ["CD", ITALIC_PROPS],
    ]);
    const entries = flattenTextBody(body);

    expect(entries).toHaveLength(4);
    expect(entries[0].properties).toBe(BOLD_PROPS);
    expect(entries[1].properties).toBe(BOLD_PROPS);
    expect(entries[2].properties).toBe(ITALIC_PROPS);
    expect(entries[3].properties).toBe(ITALIC_PROPS);
  });

  it("inserts paragraph separator between paragraphs", () => {
    const body = createMultiParagraphBody([
      ["AB", BOLD_PROPS],
      ["CD", ITALIC_PROPS],
    ]);
    const entries = flattenTextBody(body);

    // "AB" (2) + paragraph separator (1) + "CD" (2) = 5
    expect(entries).toHaveLength(5);
    expect(entries[2].kind).toBe("paragraph");
    expect(entries[2].char).toBe("\n");
  });

  it("handles field runs", () => {
    const body: TextBody = {
      bodyProperties: EMPTY_BODY_PROPS,
      paragraphs: [
        {
          properties: {},
          runs: [
            { type: "field", fieldType: "slidenum", id: "f1", text: "1", properties: BOLD_PROPS },
          ],
        },
      ],
    };
    const entries = flattenTextBody(body);

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("field");
    expect(entries[0].fieldType).toBe("slidenum");
    expect(entries[0].fieldId).toBe("f1");
    expect(entries[0].properties).toBe(BOLD_PROPS);
  });

  it("handles break runs", () => {
    const body: TextBody = {
      bodyProperties: EMPTY_BODY_PROPS,
      paragraphs: [
        {
          properties: {},
          runs: [
            { type: "text", text: "A", properties: BOLD_PROPS },
            { type: "break", properties: ITALIC_PROPS },
            { type: "text", text: "B", properties: BOLD_PROPS },
          ],
        },
      ],
    };
    const entries = flattenTextBody(body);

    expect(entries).toHaveLength(3);
    expect(entries[1].kind).toBe("break");
    expect(entries[1].char).toBe("\n");
    expect(entries[1].properties).toBe(ITALIC_PROPS);
  });
});

// =============================================================================
// Tests: extractDefaultRunProperties
// =============================================================================

describe("extractDefaultRunProperties", () => {
  it("returns first run properties", () => {
    const body = createMultiRunBody([
      ["A", BOLD_PROPS],
      ["B", ITALIC_PROPS],
    ]);
    expect(extractDefaultRunProperties(body)).toBe(BOLD_PROPS);
  });

  it("returns empty object for empty paragraphs", () => {
    const body: TextBody = {
      bodyProperties: EMPTY_BODY_PROPS,
      paragraphs: [],
    };
    expect(extractDefaultRunProperties(body)).toEqual({});
  });

  it("returns empty object when first run is not text", () => {
    const body: TextBody = {
      bodyProperties: EMPTY_BODY_PROPS,
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "break", properties: BOLD_PROPS }],
        },
      ],
    };
    expect(extractDefaultRunProperties(body)).toEqual({});
  });
});

// =============================================================================
// Tests: mergeTextIntoBody — insertion point style inheritance
// =============================================================================

describe("mergeTextIntoBody — insertion point style inheritance", () => {
  it("returns original body when text is unchanged", () => {
    const body = createMultiRunBody([["Hello", BOLD_PROPS]]);
    const result = mergeTextIntoBody(body, "Hello", BOLD_PROPS);
    expect(result).toBe(body);
  });

  it("inherits style from preceding character when inserting mid-text", () => {
    // "Aurochs" (bold) + "Office" (italic)
    // Inserting "X" after "Office" (between 'e' and end) → should inherit italic
    const body = createMultiRunBody([
      ["Aurochs", BOLD_PROPS],
      ["Office", ITALIC_PROPS],
    ]);

    // Insert "X" at position 13 (end of "Office") → "AurochsOfficeX"
    const result = mergeTextIntoBody(body, "AurochsOfficeX", BOLD_PROPS);
    const runs = collectRuns(result);

    // "Aurochs" → bold, "OfficeX" → italic (X inherits italic from preceding 'e')
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["Aurochs", BOLD_PROPS]);
    expect(runs[1][0]).toBe("OfficeX");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
  });

  it("inherits style from the run at cursor position, not first run", () => {
    // "Aurochs" (bold) + " Office Document Toolkit" (italic)
    // Insert "X" between "Office" and " Document" (at position 14)
    // The cursor is within the italic run, so inserted text should be italic
    const body = createMultiRunBody([
      ["Aurochs", BOLD_PROPS],
      [" Office Document Toolkit", ITALIC_PROPS],
    ]);

    // Original text: "Aurochs Office Document Toolkit" (31 chars)
    // New text: "Aurochs Office XDocument Toolkit" (32 chars)
    // Insert "X" at position 15 (after "Office ")
    const result = mergeTextIntoBody(body, "Aurochs Office XDocument Toolkit", BOLD_PROPS);
    const runs = collectRuns(result);

    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["Aurochs", BOLD_PROPS]);
    // "X" should inherit italic from the preceding space character
    expect(runs[1][0]).toBe(" Office XDocument Toolkit");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
  });

  it("falls back to defaultProps when inserting at the very beginning", () => {
    const body = createMultiRunBody([["Hello", ITALIC_PROPS]]);

    // Insert "X" at the beginning → "XHello"
    const result = mergeTextIntoBody(body, "XHello", BOLD_PROPS);
    const runs = collectRuns(result);

    // "X" has no preceding character → falls back to defaultProps (BOLD_PROPS)
    // "Hello" retains ITALIC_PROPS
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["X", BOLD_PROPS]);
    expect(runs[1]).toEqual(["Hello", ITALIC_PROPS]);
  });

  it("inherits style across paragraph boundary", () => {
    // Paragraph 1: "ABC" (bold)
    // Paragraph 2: "DEF" (italic)
    // Insert "X" at the beginning of paragraph 2 (after paragraph break)
    const body = createMultiParagraphBody([
      ["ABC", BOLD_PROPS],
      ["DEF", ITALIC_PROPS],
    ]);

    // Original text: "ABC\nDEF", new text: "ABC\nXDEF"
    const result = mergeTextIntoBody(body, "ABC\nXDEF", BOLD_PROPS);

    // Paragraph 2 should now have "XDEF"
    // "X" inserted after paragraph break — should inherit from nearest preceding
    // text/field character, which is "C" in paragraph 1 (BOLD_PROPS)
    const para2Runs = result.paragraphs[1].runs;
    expect(para2Runs).toHaveLength(2);
    const textRuns = para2Runs.filter((r) => r.type === "text") as Array<{
      type: "text";
      text: string;
      properties?: RunProperties;
    }>;
    expect(textRuns[0].text).toBe("X");
    expect(textRuns[0].properties).toEqual(BOLD_PROPS);
    expect(textRuns[1].text).toBe("DEF");
    expect(textRuns[1].properties).toEqual(ITALIC_PROPS);
  });

  it("preserves existing run boundaries when appending at end of first run", () => {
    const body = createMultiRunBody([
      ["AB", BOLD_PROPS],
      ["CD", ITALIC_PROPS],
    ]);

    // Insert "X" at position 2 (between "AB" and "CD") → "ABXCD"
    const result = mergeTextIntoBody(body, "ABXCD", BOLD_PROPS);
    const runs = collectRuns(result);

    // "X" is at position 2, preceding char is "B" (BOLD_PROPS)
    expect(runs).toHaveLength(2);
    expect(runs[0][0]).toBe("ABX");
    expect(runs[0][1]).toEqual(BOLD_PROPS);
    expect(runs[1][0]).toBe("CD");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
  });

  it("deleting text preserves styles of remaining characters", () => {
    const body = createMultiRunBody([
      ["AB", BOLD_PROPS],
      ["CD", ITALIC_PROPS],
    ]);

    // Delete "B" → "ACD"
    const result = mergeTextIntoBody(body, "ACD", BOLD_PROPS);
    const runs = collectRuns(result);

    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["A", BOLD_PROPS]);
    expect(runs[1]).toEqual(["CD", ITALIC_PROPS]);
  });
});

// =============================================================================
// Tests: mergeTextIntoBody with PendingStyledPaste
// =============================================================================

describe("mergeTextIntoBody — styled paste via PendingStyledPaste", () => {
  it("inserts styled entries preserving per-character properties", () => {
    const body = createMultiRunBody([["ABCD", BOLD_PROPS]]);

    // Simulate: native paste inserts "XY" at position 2 → "ABXYCD"
    // PendingStyledPaste carries italic style for "XY"
    const pending: PendingStyledPaste = {
      plainText: "XY",
      entries: [
        { char: "X", kind: "text", properties: ITALIC_PROPS },
        { char: "Y", kind: "text", properties: ITALIC_PROPS },
      ],
    };

    const result = mergeTextIntoBody(body, "ABXYCD", BOLD_PROPS, pending);
    const runs = collectRuns(result);

    expect(getPlainText(result)).toBe("ABXYCD");
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual(["AB", BOLD_PROPS]);
    expect(runs[1][0]).toBe("XY");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
    expect(runs[2]).toEqual(["CD", BOLD_PROPS]);
  });

  it("replaces selected range with styled entries", () => {
    const body = createMultiRunBody([["ABCDEF", BOLD_PROPS]]);

    // Simulate: "CD" was selected, native paste replaced with "XY" → "ABXYEF"
    const pending: PendingStyledPaste = {
      plainText: "XY",
      entries: [
        { char: "X", kind: "text", properties: ITALIC_PROPS },
        { char: "Y", kind: "text", properties: ITALIC_PROPS },
      ],
    };

    const result = mergeTextIntoBody(body, "ABXYEF", BOLD_PROPS, pending);
    const runs = collectRuns(result);

    expect(getPlainText(result)).toBe("ABXYEF");
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual(["AB", BOLD_PROPS]);
    expect(runs[1][0]).toBe("XY");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
    expect(runs[2]).toEqual(["EF", BOLD_PROPS]);
  });

  it("preserves mixed styles from pasted entries", () => {
    const body = createMultiRunBody([["AB", BOLD_PROPS]]);

    // Paste "XY" where X=italic, Y=underline → "ABXY"
    const pending: PendingStyledPaste = {
      plainText: "XY",
      entries: [
        { char: "X", kind: "text", properties: ITALIC_PROPS },
        { char: "Y", kind: "text", properties: UNDERLINE_PROPS },
      ],
    };

    const result = mergeTextIntoBody(body, "ABXY", BOLD_PROPS, pending);
    const runs = collectRuns(result);

    expect(getPlainText(result)).toBe("ABXY");
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual(["AB", BOLD_PROPS]);
    expect(runs[1]).toEqual(["X", ITALIC_PROPS]);
    expect(runs[2]).toEqual(["Y", UNDERLINE_PROPS]);
  });

  it("coalesces adjacent entries with identical properties (even new object instances)", () => {
    const body = createMultiRunBody([["AB", BOLD_PROPS]]);

    // Paste "XYZ" each with separate but equal properties (simulates JSON round-trip)
    const pending: PendingStyledPaste = {
      plainText: "XYZ",
      entries: [
        { char: "X", kind: "text", properties: { italic: true, fontSize: pt(12) } },
        { char: "Y", kind: "text", properties: { italic: true, fontSize: pt(12) } },
        { char: "Z", kind: "text", properties: { italic: true, fontSize: pt(12) } },
      ],
    };

    const result = mergeTextIntoBody(body, "ABXYZ", BOLD_PROPS, pending);
    const runs = collectRuns(result);

    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["AB", BOLD_PROPS]);
    expect(runs[1][0]).toBe("XYZ");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
  });

  it("falls back to insertion-point style when pending paste text does not match", () => {
    const body = createMultiRunBody([
      ["AB", BOLD_PROPS],
      ["CD", ITALIC_PROPS],
    ]);

    // Pending paste says "XY" but actual inserted text is "ZZ" — mismatch
    const pending: PendingStyledPaste = {
      plainText: "XY",
      entries: [
        { char: "X", kind: "text", properties: UNDERLINE_PROPS },
        { char: "Y", kind: "text", properties: UNDERLINE_PROPS },
      ],
    };

    // Insert "ZZ" at end (after "CD") → "ABCDZZ"
    const result = mergeTextIntoBody(body, "ABCDZZ", BOLD_PROPS, pending);
    const runs = collectRuns(result);

    // "ZZ" should inherit from preceding 'D' (ITALIC_PROPS), not UNDERLINE_PROPS
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["AB", BOLD_PROPS]);
    expect(runs[1][0]).toBe("CDZZ");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
  });
});

// =============================================================================
// Tests: plain text paste (browser fallback, no styled clipboard)
// =============================================================================

describe("mergeTextIntoBody — plain text paste (browser fallback)", () => {
  it("reported bug: copy 'Document' from second-paragraph run, paste at end — should inherit second paragraph style", () => {
    // Reproduce exact user scenario:
    // Paragraph 1: "Aurochs" (bold, 24pt)
    // Paragraph 2: "Office Document Toolkit" (italic, 12pt)
    // User selects "Document" in paragraph 2, copies, pastes at end
    const body = createMultiParagraphBody([
      ["Aurochs", BOLD_PROPS],
      ["Office Document Toolkit", ITALIC_PROPS],
    ]);

    // Original plain text: "Aurochs\nOffice Document Toolkit"
    // After paste at end: "Aurochs\nOffice Document ToolkitDocument"
    const result = mergeTextIntoBody(body, "Aurochs\nOffice Document ToolkitDocument", BOLD_PROPS);

    // The pasted "Document" should inherit ITALIC_PROPS (from preceding 't')
    // NOT BOLD_PROPS (from "Aurochs" in paragraph 1)
    const para2Runs = result.paragraphs[1].runs.filter(
      (r): r is { type: "text"; text: string; properties?: RunProperties } => r.type === "text",
    );

    const fullText = para2Runs.map((r) => r.text).join("");
    expect(fullText).toBe("Office Document ToolkitDocument");

    // All text in paragraph 2 should have italic properties
    for (const run of para2Runs) {
      expect(run.properties).toEqual(ITALIC_PROPS);
    }
  });

  it("reported bug: copy 'Document' from second run, paste replacing selection in same run", () => {
    // Same two-paragraph layout
    const body = createMultiParagraphBody([
      ["Aurochs", BOLD_PROPS],
      ["Office Document Toolkit", ITALIC_PROPS],
    ]);

    // User selects "Toolkit" (last 7 chars) and pastes "Document" over it
    // Original: "Aurochs\nOffice Document Toolkit" (30 chars)
    // New:      "Aurochs\nOffice Document Document" (31 chars)
    // The "Toolkit" (positions 23-30) is replaced with "Document"
    const result = mergeTextIntoBody(body, "Aurochs\nOffice Document Document", BOLD_PROPS);

    const para2Runs = result.paragraphs[1].runs.filter(
      (r): r is { type: "text"; text: string; properties?: RunProperties } => r.type === "text",
    );

    const fullText = para2Runs.map((r) => r.text).join("");
    expect(fullText).toBe("Office Document Document");

    // All text in paragraph 2 should have italic properties
    for (const run of para2Runs) {
      expect(run.properties).toEqual(ITALIC_PROPS);
    }
  });

  it("reported bug: copy 'Document' from second run, paste at start of first paragraph", () => {
    const body = createMultiParagraphBody([
      ["Aurochs", BOLD_PROPS],
      ["Office Document Toolkit", ITALIC_PROPS],
    ]);

    // Paste at the very beginning (position 0)
    // New: "DocumentAurochs\nOffice Document Toolkit"
    const result = mergeTextIntoBody(body, "DocumentAurochs\nOffice Document Toolkit", BOLD_PROPS);

    const para1Runs = result.paragraphs[0].runs.filter(
      (r): r is { type: "text"; text: string; properties?: RunProperties } => r.type === "text",
    );

    // "Document" at position 0 has no preceding char → falls back to defaultProps (BOLD_PROPS)
    // "Aurochs" retains BOLD_PROPS
    // Both should be bold (merged into one run)
    const fullText = para1Runs.map((r) => r.text).join("");
    expect(fullText).toBe("DocumentAurochs");
    for (const run of para1Runs) {
      expect(run.properties).toEqual(BOLD_PROPS);
    }
  });

  it("simulates full editing flow: type → merge → type → merge (styles accumulate correctly)", () => {
    // Start with multi-style body
    const original = createMultiRunBody([
      ["Aurochs", BOLD_PROPS],
      [" Office", ITALIC_PROPS],
    ]);

    // Step 1: User types "X" at end (position 14)
    const step1 = mergeTextIntoBody(original, "Aurochs OfficeX", BOLD_PROPS);
    const step1Runs = collectRuns(step1);
    expect(step1Runs).toHaveLength(2);
    expect(step1Runs[1][0]).toBe(" OfficeX");
    expect(step1Runs[1][1]).toEqual(ITALIC_PROPS);

    // Step 2: Using step1 result as new base, user types "Y" at end
    // This simulates the styledBaseBody pattern in TextEditController
    const step2 = mergeTextIntoBody(step1, "Aurochs OfficeXY", BOLD_PROPS);
    const step2Runs = collectRuns(step2);
    expect(step2Runs).toHaveLength(2);
    expect(step2Runs[1][0]).toBe(" OfficeXY");
    expect(step2Runs[1][1]).toEqual(ITALIC_PROPS);
  });
});

// =============================================================================
// Tests: round-trip (copy scenario simulation)
// =============================================================================

describe("round-trip copy-paste scenario", () => {
  it("copying from second run and pasting at end preserves original style", () => {
    // Original: "Aurochs" (bold) + "Office Document Toolkit" (italic)
    const body = createMultiRunBody([
      ["Aurochs", BOLD_PROPS],
      ["Office Document Toolkit", ITALIC_PROPS],
    ]);

    // Step 1: "Copy" — extract entries for "Office Document Toolkit" (positions 7-30)
    const allEntries = flattenTextBody(body);
    const copiedEntries: StyledCharEntry[] = allEntries.slice(7, 30).map((e) => ({
      char: e.char,
      kind: e.kind,
      properties: e.properties,
    }));
    const copiedText = copiedEntries.map((e) => e.char).join("");

    // Step 2: Simulate JSON round-trip (clipboard serialization)
    const serialized = JSON.parse(JSON.stringify(copiedEntries)) as StyledCharEntry[];

    // Step 3: "Paste" — native paste appends at end
    // Original: "AurochsOffice Document Toolkit" (30 chars)
    // After paste: "AurochsOffice Document ToolkitOffice Document Toolkit" (53 chars)
    const newText = "AurochsOffice Document ToolkitOffice Document Toolkit";
    const pending: PendingStyledPaste = { plainText: copiedText, entries: serialized };
    const result = mergeTextIntoBody(body, newText, BOLD_PROPS, pending);
    const runs = collectRuns(result);

    // Original runs preserved, pasted region retains italic
    expect(runs).toHaveLength(2);
    expect(runs[0]).toEqual(["Aurochs", BOLD_PROPS]);
    expect(runs[1][0]).toBe("Office Document ToolkitOffice Document Toolkit");
    expect(runs[1][1]).toEqual(ITALIC_PROPS);
  });

  it("copying part of second run and pasting at beginning preserves style", () => {
    // Original: "Aurochs" (bold) + "Office" (italic)
    const body = createMultiRunBody([
      ["Aurochs", BOLD_PROPS],
      ["Office", ITALIC_PROPS],
    ]);

    // Copy "Office" (positions 7-13)
    const allEntries = flattenTextBody(body);
    const copiedEntries: StyledCharEntry[] = allEntries.slice(7, 13).map((e) => ({
      char: e.char,
      kind: e.kind,
      properties: e.properties,
    }));
    const copiedText = copiedEntries.map((e) => e.char).join("");

    // JSON round-trip
    const serialized = JSON.parse(JSON.stringify(copiedEntries)) as StyledCharEntry[];

    // Paste at position 0 (before "Aurochs")
    // Original: "AurochsOffice" → "OfficeAurochsOffice"
    const pending: PendingStyledPaste = { plainText: copiedText, entries: serialized };
    const result = mergeTextIntoBody(body, "OfficeAurochsOffice", BOLD_PROPS, pending);
    const runs = collectRuns(result);

    expect(getPlainText(result)).toBe("OfficeAurochsOffice");
    expect(runs).toHaveLength(3);
    // Pasted "Office" should be italic
    expect(runs[0][0]).toBe("Office");
    expect(runs[0][1]).toEqual(ITALIC_PROPS);
    // Original "Aurochs" still bold
    expect(runs[1]).toEqual(["Aurochs", BOLD_PROPS]);
    // Original "Office" still italic
    expect(runs[2]).toEqual(["Office", ITALIC_PROPS]);
  });
});
