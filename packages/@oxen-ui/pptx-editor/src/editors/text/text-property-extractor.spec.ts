/**
 * @file Unit tests for text-property-extractor
 */

import { describe, it, expect } from "vitest";
import {
  getRunsInSelection,
  getParagraphsInSelection,
  extractPropertiesAtCursor,
  extractPropertiesFromSelection,
  extractPropertiesFromTextBody,
  extractTextProperties,
  getEffectiveRunPropertiesAtCursor,
} from "./text-property-extractor";
import type { TextBody, TextRun, Paragraph } from "@oxen/pptx/domain/text";
import type { CursorPosition, TextSelection } from "../../slide/text-edit";
import type { Points, Pixels } from "@oxen/ooxml/domain/units";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextBody(paragraphs: Paragraph[]): TextBody {
  return {
    bodyProperties: {
      anchor: "top",
      wrapping: "square",
    },
    paragraphs,
  };
}

function createParagraph(runs: TextRun[], properties = {}): Paragraph {
  return {
    properties: { ...properties },
    runs,
  };
}

function createTextRun(text: string, properties = {}): TextRun {
  return {
    type: "text",
    text,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}

// Simple text body for testing
const simpleTextBody = createTextBody([
  createParagraph([
    createTextRun("Hello ", { bold: true, fontSize: 12 as Points }),
    createTextRun("World", { italic: true, fontSize: 14 as Points }),
  ], { alignment: "left" }),
  createParagraph([
    createTextRun("Second paragraph", { bold: false, fontSize: 12 as Points }),
  ], { alignment: "center" }),
]);

// Text body with empty paragraph
const textBodyWithEmpty = createTextBody([
  createParagraph([
    createTextRun("First", { bold: true }),
  ]),
  createParagraph([], { defaultRunProperties: { italic: true, fontSize: 16 as Points } }),
  createParagraph([
    createTextRun("Third", { bold: false }),
  ]),
]);

// =============================================================================
// Tests
// =============================================================================

describe("getRunsInSelection", () => {
  it("returns runs for single-run selection", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const ranges = getRunsInSelection(simpleTextBody, selection);

    expect(ranges.length).toBe(1);
    expect(ranges[0].paragraphIndex).toBe(0);
    expect(ranges[0].runIndex).toBe(0);
    expect(ranges[0].startOffset).toBe(0);
    expect(ranges[0].endOffset).toBe(5);
  });

  it("returns runs for multi-run selection within paragraph", () => {
    // Selection from "llo " to "Wor"
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 2 },
      end: { paragraphIndex: 0, charOffset: 9 },
    };

    const ranges = getRunsInSelection(simpleTextBody, selection);

    expect(ranges.length).toBe(2);
    // First run: "llo " (offset 2-6 in "Hello ")
    expect(ranges[0].runIndex).toBe(0);
    expect(ranges[0].startOffset).toBe(2);
    expect(ranges[0].endOffset).toBe(6);
    // Second run: "Wor" (offset 0-3 in "World")
    expect(ranges[1].runIndex).toBe(1);
    expect(ranges[1].startOffset).toBe(0);
    expect(ranges[1].endOffset).toBe(3);
  });

  it("returns runs for multi-paragraph selection", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 8 },
      end: { paragraphIndex: 1, charOffset: 6 },
    };

    const ranges = getRunsInSelection(simpleTextBody, selection);

    expect(ranges.length).toBe(2);
    // First paragraph: "rld" from "World"
    expect(ranges[0].paragraphIndex).toBe(0);
    expect(ranges[0].runIndex).toBe(1);
    // Second paragraph: "Second"
    expect(ranges[1].paragraphIndex).toBe(1);
    expect(ranges[1].runIndex).toBe(0);
  });

  it("handles reversed selection (end before start)", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 5 },
      end: { paragraphIndex: 0, charOffset: 0 },
    };

    const ranges = getRunsInSelection(simpleTextBody, selection);

    expect(ranges.length).toBe(1);
    expect(ranges[0].startOffset).toBe(0);
    expect(ranges[0].endOffset).toBe(5);
  });

  it("returns empty for empty selection", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 3 },
      end: { paragraphIndex: 0, charOffset: 3 },
    };

    const ranges = getRunsInSelection(simpleTextBody, selection);

    expect(ranges.length).toBe(0);
  });
});

describe("getParagraphsInSelection", () => {
  it("returns single paragraph for selection within one paragraph", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const indices = getParagraphsInSelection(simpleTextBody, selection);

    expect(indices).toEqual([0]);
  });

  it("returns multiple paragraphs for multi-paragraph selection", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 5 },
      end: { paragraphIndex: 1, charOffset: 3 },
    };

    const indices = getParagraphsInSelection(simpleTextBody, selection);

    expect(indices).toEqual([0, 1]);
  });
});

describe("extractPropertiesAtCursor", () => {
  it("extracts properties at cursor within run", () => {
    const position: CursorPosition = { paragraphIndex: 0, charOffset: 2 };

    const result = extractPropertiesAtCursor(simpleTextBody, position);

    expect(result.runProperties.bold.type).toBe("same");
    if (result.runProperties.bold.type === "same") {
      expect(result.runProperties.bold.value).toBe(true);
    }
    expect(result.paragraphProperties.alignment.type).toBe("same");
  });

  it("extracts properties at cursor in second run", () => {
    const position: CursorPosition = { paragraphIndex: 0, charOffset: 7 };

    const result = extractPropertiesAtCursor(simpleTextBody, position);

    expect(result.runProperties.italic.type).toBe("same");
    if (result.runProperties.italic.type === "same") {
      expect(result.runProperties.italic.value).toBe(true);
    }
  });

  it("uses default run properties for empty paragraph", () => {
    const position: CursorPosition = { paragraphIndex: 1, charOffset: 0 };

    const result = extractPropertiesAtCursor(textBodyWithEmpty, position);

    expect(result.runProperties.italic.type).toBe("same");
    if (result.runProperties.italic.type === "same") {
      expect(result.runProperties.italic.value).toBe(true);
    }
  });

  it("handles out of bounds paragraph index", () => {
    const position: CursorPosition = { paragraphIndex: 99, charOffset: 0 };

    const result = extractPropertiesAtCursor(simpleTextBody, position);

    expect(result.paragraphIndices).toEqual([]);
    expect(result.runRanges).toEqual([]);
  });
});

describe("extractPropertiesFromSelection", () => {
  it("returns same when selection has uniform properties", () => {
    // Selection within first run only
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 5 },
    };

    const result = extractPropertiesFromSelection(simpleTextBody, selection);

    expect(result.runProperties.bold.type).toBe("same");
    if (result.runProperties.bold.type === "same") {
      expect(result.runProperties.bold.value).toBe(true);
    }
  });

  it("returns mixed when selection spans runs with different properties", () => {
    // Selection spans both runs
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 0, charOffset: 11 },
    };

    const result = extractPropertiesFromSelection(simpleTextBody, selection);

    // Bold: first run true, second run undefined -> same (true)
    // Italic: first run undefined, second run true -> same (true)
    // FontSize: 12 vs 14 -> mixed
    expect(result.runProperties.fontSize.type).toBe("mixed");
  });

  it("returns mixed for paragraph properties when spanning paragraphs", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: 1, charOffset: 5 },
    };

    const result = extractPropertiesFromSelection(simpleTextBody, selection);

    // alignment: "left" vs "center" -> mixed
    expect(result.paragraphProperties.alignment.type).toBe("mixed");
  });

  it("falls back to cursor extraction for empty selection", () => {
    const selection: TextSelection = {
      start: { paragraphIndex: 0, charOffset: 3 },
      end: { paragraphIndex: 0, charOffset: 3 },
    };

    const result = extractPropertiesFromSelection(simpleTextBody, selection);

    // Should extract cursor position properties
    expect(result.runProperties.bold.type).toBe("same");
  });
});

describe("extractPropertiesFromTextBody", () => {
  it("extracts all properties from entire text body", () => {
    const result = extractPropertiesFromTextBody(simpleTextBody);

    expect(result.paragraphIndices).toEqual([0, 1]);
    expect(result.runRanges.length).toBe(3); // 2 runs in para 0, 1 in para 1
  });

  it("returns mixed for different properties across text body", () => {
    const result = extractPropertiesFromTextBody(simpleTextBody);

    // Multiple different font sizes
    expect(result.runProperties.fontSize.type).toBe("mixed");
    // Multiple different alignments
    expect(result.paragraphProperties.alignment.type).toBe("mixed");
  });

  it("handles empty text body", () => {
    const emptyBody = createTextBody([]);

    const result = extractPropertiesFromTextBody(emptyBody);

    expect(result.paragraphIndices).toEqual([]);
    expect(result.runRanges).toEqual([]);
  });
});

describe("extractTextProperties", () => {
  it("handles none context", () => {
    const result = extractTextProperties(simpleTextBody, { type: "none" });

    expect(result.paragraphIndices).toEqual([]);
    expect(result.runRanges).toEqual([]);
  });

  it("handles cursor context", () => {
    const result = extractTextProperties(simpleTextBody, {
      type: "cursor",
      position: { paragraphIndex: 0, charOffset: 2 },
    });

    expect(result.paragraphIndices).toEqual([0]);
    expect(result.runRanges.length).toBe(1);
  });

  it("handles selection context", () => {
    const result = extractTextProperties(simpleTextBody, {
      type: "selection",
      selection: {
        start: { paragraphIndex: 0, charOffset: 0 },
        end: { paragraphIndex: 0, charOffset: 11 },
      },
    });

    expect(result.runRanges.length).toBe(2);
  });

  it("handles shape context", () => {
    const result = extractTextProperties(simpleTextBody, { type: "shape" });

    expect(result.paragraphIndices).toEqual([0, 1]);
    expect(result.runRanges.length).toBe(3);
  });
});

describe("getEffectiveRunPropertiesAtCursor", () => {
  it("returns run properties when present", () => {
    const position: CursorPosition = { paragraphIndex: 0, charOffset: 2 };

    const props = getEffectiveRunPropertiesAtCursor(simpleTextBody, position);

    expect(props?.bold).toBe(true);
    expect(props?.fontSize).toBe(12);
  });

  it("returns default properties for empty paragraph", () => {
    const position: CursorPosition = { paragraphIndex: 1, charOffset: 0 };

    const props = getEffectiveRunPropertiesAtCursor(textBodyWithEmpty, position);

    expect(props?.italic).toBe(true);
    expect(props?.fontSize).toBe(16);
  });

  it("merges run and default properties", () => {
    const textBodyWithDefaults = createTextBody([
      createParagraph(
        [createTextRun("Test", { bold: true })],
        { defaultRunProperties: { fontSize: 20 as Points, italic: true } }
      ),
    ]);

    const props = getEffectiveRunPropertiesAtCursor(textBodyWithDefaults, {
      paragraphIndex: 0,
      charOffset: 0,
    });

    // Run property takes precedence
    expect(props?.bold).toBe(true);
    // Default properties are inherited
    expect(props?.fontSize).toBe(20);
    expect(props?.italic).toBe(true);
  });

  it("returns undefined for out of bounds", () => {
    const props = getEffectiveRunPropertiesAtCursor(simpleTextBody, {
      paragraphIndex: 99,
      charOffset: 0,
    });

    expect(props).toBeUndefined();
  });
});
