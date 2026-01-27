/**
 * @file Unit tests for run-formatting
 */

import { describe, it, expect } from "vitest";
import {
  applyRunPropertiesToSelection,
  applyParagraphPropertiesToSelection,
  mergeAdjacentRuns,
  normalizeTextBody,
  toggleRunProperty,
  clearRunProperties,
} from "./run-formatting";
import type {
  TextBody,
  TextRun,
  Paragraph,
  RegularRun,
} from "@oxen/pptx/domain/text";
import type { TextSelection } from "./cursor";
import type { Points } from "@oxen/ooxml/domain/units";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextBody(paragraphs: Paragraph[]): TextBody {
  return {
    bodyProperties: { anchor: "top", wrapping: "square" },
    paragraphs,
  };
}

function createParagraph(runs: TextRun[], properties = {}): Paragraph {
  return {
    properties: { ...properties },
    runs,
  };
}

function createTextRun(text: string, properties?: object): TextRun {
  return {
    type: "text" as const,
    text,
    properties: properties as never,
  };
}

function getRunTexts(textBody: TextBody): string[][] {
  return textBody.paragraphs.map((p) =>
    p.runs.map((r) => (r.type === "text" ? r.text : r.type === "break" ? "\\n" : `[${r.type}]`))
  );
}

// =============================================================================
// Tests: mergeAdjacentRuns
// =============================================================================

describe("mergeAdjacentRuns", () => {
  it("merges adjacent text runs with same properties", () => {
    const runs: TextRun[] = [
      createTextRun("Hello", { bold: true }),
      createTextRun(" World", { bold: true }),
    ];

    const merged = mergeAdjacentRuns(runs);

    expect(merged.length).toBe(1);
    expect((merged[0] as RegularRun).text).toBe("Hello World");
  });

  it("does not merge runs with different properties", () => {
    const runs: TextRun[] = [
      createTextRun("Hello", { bold: true }),
      createTextRun(" World", { italic: true }),
    ];

    const merged = mergeAdjacentRuns(runs);

    expect(merged.length).toBe(2);
  });

  it("handles empty array", () => {
    const merged = mergeAdjacentRuns([]);
    expect(merged).toEqual([]);
  });

  it("handles single run", () => {
    const runs: TextRun[] = [createTextRun("Hello")];
    const merged = mergeAdjacentRuns(runs);
    expect(merged.length).toBe(1);
  });

  it("merges multiple consecutive runs", () => {
    const runs: TextRun[] = [
      createTextRun("A", { bold: true }),
      createTextRun("B", { bold: true }),
      createTextRun("C", { bold: true }),
    ];

    const merged = mergeAdjacentRuns(runs);

    expect(merged.length).toBe(1);
    expect((merged[0] as RegularRun).text).toBe("ABC");
  });

  it("does not merge break runs", () => {
    const runs: TextRun[] = [
      createTextRun("Hello"),
      { type: "break" as const },
      createTextRun("World"),
    ];

    const merged = mergeAdjacentRuns(runs);

    expect(merged.length).toBe(3);
  });

  it("merges runs with undefined properties", () => {
    const runs: TextRun[] = [
      createTextRun("Hello"),
      createTextRun(" World"),
    ];

    const merged = mergeAdjacentRuns(runs);

    expect(merged.length).toBe(1);
    expect((merged[0] as RegularRun).text).toBe("Hello World");
  });
});

// =============================================================================
// Tests: applyRunPropertiesToSelection
// =============================================================================

describe("applyRunPropertiesToSelection", () => {
  it("applies formatting to entire single run", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello World")]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 11 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result.paragraphs[0].runs[0].properties).toEqual({ bold: true });
  });

  it("splits run and applies formatting to middle portion", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello World")]),
    ]);

    // Select "llo Wo"
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 2 },
      end: { paragraphIndex: 0, charOffset: 8 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result.paragraphs[0].runs.length).toBe(3);
    expect(getRunTexts(result)).toEqual([["He", "llo Wo", "rld"]]);
    expect(result.paragraphs[0].runs[0].properties).toBeUndefined();
    expect(result.paragraphs[0].runs[1].properties).toEqual({ bold: true });
    expect(result.paragraphs[0].runs[2].properties).toBeUndefined();
  });

  it("applies formatting to start of run", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello World")]),
    ]);

    // Select "Hello"
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result.paragraphs[0].runs.length).toBe(2);
    expect(getRunTexts(result)).toEqual([["Hello", " World"]]);
    expect(result.paragraphs[0].runs[0].properties).toEqual({ bold: true });
  });

  it("applies formatting to end of run", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello World")]),
    ]);

    // Select "World"
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 6 },
      end: { paragraphIndex: 0, charOffset: 11 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result.paragraphs[0].runs.length).toBe(2);
    expect(getRunTexts(result)).toEqual([["Hello ", "World"]]);
    expect(result.paragraphs[0].runs[1].properties).toEqual({ bold: true });
  });

  it("applies formatting across multiple runs", () => {
    const textBody = createTextBody([
      createParagraph([
        createTextRun("Hello ", { italic: true }),
        createTextRun("World"),
      ]),
    ]);

    // Select "llo Wor"
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 2 },
      end: { paragraphIndex: 0, charOffset: 9 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    // Should result in 4 runs: "He"(italic), "llo "(bold+italic), "Wor"(bold), "ld"
    expect(result.paragraphs[0].runs.length).toBe(4);
  });

  it("applies formatting across multiple paragraphs", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("First")]),
      createParagraph([createTextRun("Second")]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 2 },
      end: { paragraphIndex: 1, charOffset: 3 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    // First paragraph: "Fi" + "rst" (bold)
    expect(result.paragraphs[0].runs.length).toBe(2);
    // Second paragraph: "Sec" (bold) + "ond"
    expect(result.paragraphs[1].runs.length).toBe(2);
  });

  it("merges properties with existing run properties", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello", { italic: true })]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result.paragraphs[0].runs[0].properties).toEqual({ italic: true, bold: true });
  });

  it("returns unchanged textBody for empty selection", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello")]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 2 },
      end: { paragraphIndex: 0, charOffset: 2 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result).toBe(textBody);
  });

  it("returns unchanged textBody for empty update", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello")]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, {});

    expect(result).toBe(textBody);
  });

  it("handles reversed selection (end before start)", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello World")]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 5 },
      end: { paragraphIndex: 0, charOffset: 0 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    expect(result.paragraphs[0].runs.length).toBe(2);
    expect(getRunTexts(result)).toEqual([["Hello", " World"]]);
  });

  it("merges adjacent runs after applying same formatting", () => {
    const textBody = createTextBody([
      createParagraph([
        createTextRun("Hello", { bold: true }),
        createTextRun(" World"),
      ]),
    ]);

    // Apply bold to " World" - should merge with "Hello"
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 5 },
      end: { paragraphIndex: 0, charOffset: 11 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    // Should be merged into single run
    expect(result.paragraphs[0].runs.length).toBe(1);
    expect((result.paragraphs[0].runs[0] as RegularRun).text).toBe("Hello World");
  });
});

// =============================================================================
// Tests: applyParagraphPropertiesToSelection
// =============================================================================

describe("applyParagraphPropertiesToSelection", () => {
  it("applies paragraph properties to selected paragraphs", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("First")], { alignment: "left" }),
      createParagraph([createTextRun("Second")], { alignment: "left" }),
      createParagraph([createTextRun("Third")], { alignment: "left" }),
    ]);

    const result = applyParagraphPropertiesToSelection(textBody, [0, 2], { alignment: "center" });

    expect(result.paragraphs[0].properties.alignment).toBe("center");
    expect(result.paragraphs[1].properties.alignment).toBe("left");
    expect(result.paragraphs[2].properties.alignment).toBe("center");
  });

  it("returns unchanged textBody for empty indices", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello")]),
    ]);

    const result = applyParagraphPropertiesToSelection(textBody, [], { alignment: "center" });

    expect(result).toBe(textBody);
  });

  it("returns unchanged textBody for empty update", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello")]),
    ]);

    const result = applyParagraphPropertiesToSelection(textBody, [0], {});

    expect(result).toBe(textBody);
  });
});

// =============================================================================
// Tests: normalizeTextBody
// =============================================================================

describe("normalizeTextBody", () => {
  it("merges adjacent runs in all paragraphs", () => {
    const textBody = createTextBody([
      createParagraph([
        createTextRun("A", { bold: true }),
        createTextRun("B", { bold: true }),
      ]),
      createParagraph([
        createTextRun("C"),
        createTextRun("D"),
      ]),
    ]);

    const result = normalizeTextBody(textBody);

    expect(result.paragraphs[0].runs.length).toBe(1);
    expect((result.paragraphs[0].runs[0] as RegularRun).text).toBe("AB");
    expect(result.paragraphs[1].runs.length).toBe(1);
    expect((result.paragraphs[1].runs[0] as RegularRun).text).toBe("CD");
  });
});

// =============================================================================
// Tests: toggleRunProperty
// =============================================================================

describe("toggleRunProperty", () => {
  it("turns on property when currently off", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello")]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = toggleRunProperty(textBody, selection, "bold", undefined);

    expect(result.paragraphs[0].runs[0].properties).toEqual({ bold: true });
  });

  it("turns off property when currently on", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello", { bold: true })]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = toggleRunProperty(textBody, selection, "bold", true);

    // Property should be removed (undefined)
    expect(result.paragraphs[0].runs[0].properties?.bold).toBeUndefined();
  });
});

// =============================================================================
// Tests: clearRunProperties
// =============================================================================

describe("clearRunProperties", () => {
  it("clears specified properties from selection", () => {
    const textBody = createTextBody([
      createParagraph([createTextRun("Hello", { bold: true, italic: true, fontSize: 12 as Points })]),
    ]);

    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = clearRunProperties(textBody, selection, ["bold", "italic"]);

    expect(result.paragraphs[0].runs[0].properties?.bold).toBeUndefined();
    expect(result.paragraphs[0].runs[0].properties?.italic).toBeUndefined();
    expect(result.paragraphs[0].runs[0].properties?.fontSize).toBe(12);
  });
});

// =============================================================================
// Tests: Edge Cases
// =============================================================================

describe("edge cases", () => {
  it("handles break runs correctly", () => {
    const textBody = createTextBody([
      createParagraph([
        createTextRun("Hello"),
        { type: "break" as const },
        createTextRun("World"),
      ]),
    ]);

    // Selection includes the break
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 4 },
      end: { paragraphIndex: 0, charOffset: 8 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    // Should split "Hello" at 4, apply to break, split "World" at 2
    expect(result.paragraphs[0].runs.length).toBe(5);
  });

  it("handles field runs correctly", () => {
    const textBody = createTextBody([
      createParagraph([
        createTextRun("Page "),
        { type: "field" as const, fieldType: "slidenum", id: "1", text: "5" },
        createTextRun(" of 10"),
      ]),
    ]);

    // Selection overlaps with field
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 3 },
      end: { paragraphIndex: 0, charOffset: 7 },
    };

    const result = applyRunPropertiesToSelection(textBody, selection, { bold: true });

    // Field run should get the formatting since it overlaps
    const fieldRun = result.paragraphs[0].runs.find((r) => r.type === "field");
    expect(fieldRun?.properties).toEqual({ bold: true });
  });
});
