/**
 * @file Run Format Handlers Tests
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxEditorState } from "../../types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { createEmptyDocxSelection, createIdleDragState } from "../../../state";
import { runFormatHandlers } from "./run-format";

// =============================================================================
// Test Fixtures
// =============================================================================

function createRunProps(props?: { b?: boolean; i?: boolean; sz?: number }) {
  if (!props) {
    return undefined;
  }
  return { b: props.b, i: props.i, sz: props.sz as never };
}

function createParagraph(text: string, props?: { b?: boolean; i?: boolean; sz?: number }): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties: createRunProps(props),
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createDocument(paragraphs: DocxParagraph[]): DocxDocument {
  return { body: { content: paragraphs } };
}

function createSelectionFromIndices(selectedIndices: number[]) {
  if (selectedIndices.length === 0) {
    return createEmptyDocxSelection();
  }
  return {
    element: {
      selectedIds: selectedIndices.map(String),
      primaryId: String(selectedIndices[0]),
    },
    text: { range: undefined, cursor: undefined, isCollapsed: true },
    mode: "element" as const,
  };
}

function createState(document: DocxDocument, selectedIndices: number[] = []): DocxEditorState {
  return {
    documentHistory: createHistory(document),
    selection: createSelectionFromIndices(selectedIndices),
    drag: createIdleDragState(),
    clipboard: undefined,
    textEdit: { isEditing: false, editingElementId: undefined, cursorPosition: undefined },
    mode: "editing",
    activeSectionIndex: 0,
  };
}

function getFirstRunProps(state: DocxEditorState, paraIndex: number) {
  const para = state.documentHistory.present.body.content[paraIndex] as DocxParagraph;
  const firstRun = para.content.find((c) => c.type === "run");
  return firstRun?.properties;
}

// =============================================================================
// APPLY_RUN_FORMAT
// =============================================================================

describe("APPLY_RUN_FORMAT", () => {
  it("applies format to selected paragraph", () => {
    const doc = createDocument([createParagraph("hello"), createParagraph("world")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.APPLY_RUN_FORMAT!(state, { type: "APPLY_RUN_FORMAT", format: { b: true } });

    expect(getFirstRunProps(result, 0)?.b).toBe(true);
    expect(getFirstRunProps(result, 1)?.b).toBeUndefined();
  });

  it("applies format to multiple selected paragraphs", () => {
    const doc = createDocument([
      createParagraph("one"),
      createParagraph("two"),
      createParagraph("three"),
    ]);
    const state = createState(doc, [0, 2]);

    const result = runFormatHandlers.APPLY_RUN_FORMAT!(state, { type: "APPLY_RUN_FORMAT", format: { i: true } });

    expect(getFirstRunProps(result, 0)?.i).toBe(true);
    expect(getFirstRunProps(result, 1)?.i).toBeUndefined();
    expect(getFirstRunProps(result, 2)?.i).toBe(true);
  });

  it("returns unchanged state if no selection", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, []);

    const result = runFormatHandlers.APPLY_RUN_FORMAT!(state, { type: "APPLY_RUN_FORMAT", format: { b: true } });

    expect(result).toBe(state);
  });

  it("pushes to history", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.APPLY_RUN_FORMAT!(state, { type: "APPLY_RUN_FORMAT", format: { b: true } });

    expect(result.documentHistory.past).toHaveLength(1);
    expect(result.documentHistory.past[0]).toBe(doc);
  });
});

// =============================================================================
// TOGGLE_BOLD
// =============================================================================

describe("TOGGLE_BOLD", () => {
  it("enables bold when not set", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.TOGGLE_BOLD!(state, { type: "TOGGLE_BOLD" });

    expect(getFirstRunProps(result, 0)?.b).toBe(true);
  });

  it("disables bold when all selected are bold", () => {
    const doc = createDocument([createParagraph("hello", { b: true })]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.TOGGLE_BOLD!(state, { type: "TOGGLE_BOLD" });

    expect(getFirstRunProps(result, 0)?.b).toBeUndefined();
  });

  it("enables bold when mixed selection", () => {
    const doc = createDocument([
      createParagraph("bold", { b: true }),
      createParagraph("not bold"),
    ]);
    const state = createState(doc, [0, 1]);

    const result = runFormatHandlers.TOGGLE_BOLD!(state, { type: "TOGGLE_BOLD" });

    expect(getFirstRunProps(result, 0)?.b).toBe(true);
    expect(getFirstRunProps(result, 1)?.b).toBe(true);
  });
});

// =============================================================================
// TOGGLE_ITALIC
// =============================================================================

describe("TOGGLE_ITALIC", () => {
  it("enables italic when not set", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.TOGGLE_ITALIC!(state, { type: "TOGGLE_ITALIC" });

    expect(getFirstRunProps(result, 0)?.i).toBe(true);
  });

  it("disables italic when already set", () => {
    const doc = createDocument([createParagraph("hello", { i: true })]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.TOGGLE_ITALIC!(state, { type: "TOGGLE_ITALIC" });

    expect(getFirstRunProps(result, 0)?.i).toBeUndefined();
  });
});

// =============================================================================
// TOGGLE_UNDERLINE
// =============================================================================

describe("TOGGLE_UNDERLINE", () => {
  it("enables underline when not set", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.TOGGLE_UNDERLINE!(state, { type: "TOGGLE_UNDERLINE" });

    expect(getFirstRunProps(result, 0)?.u).toEqual({ val: "single" });
  });
});

// =============================================================================
// TOGGLE_STRIKETHROUGH
// =============================================================================

describe("TOGGLE_STRIKETHROUGH", () => {
  it("enables strikethrough when not set", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.TOGGLE_STRIKETHROUGH!(state, { type: "TOGGLE_STRIKETHROUGH" });

    expect(getFirstRunProps(result, 0)?.strike).toBe(true);
  });
});

// =============================================================================
// SET_FONT_SIZE
// =============================================================================

describe("SET_FONT_SIZE", () => {
  it("sets font size in half-points", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.SET_FONT_SIZE!(state, { type: "SET_FONT_SIZE", size: 12 });

    // 12pt = 24 half-points
    expect(getFirstRunProps(result, 0)?.sz).toBe(24);
  });
});

// =============================================================================
// SET_FONT_FAMILY
// =============================================================================

describe("SET_FONT_FAMILY", () => {
  it("sets font family for all font types", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.SET_FONT_FAMILY!(state, { type: "SET_FONT_FAMILY", family: "Arial" });

    const rFonts = getFirstRunProps(result, 0)?.rFonts;
    expect(rFonts?.ascii).toBe("Arial");
    expect(rFonts?.hAnsi).toBe("Arial");
    expect(rFonts?.eastAsia).toBe("Arial");
    expect(rFonts?.cs).toBe("Arial");
  });
});

// =============================================================================
// SET_TEXT_COLOR
// =============================================================================

describe("SET_TEXT_COLOR", () => {
  it("sets text color without hash prefix", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.SET_TEXT_COLOR!(state, { type: "SET_TEXT_COLOR", color: "#FF0000" });

    expect(getFirstRunProps(result, 0)?.color?.val).toBe("FF0000");
  });

  it("handles color without hash prefix", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.SET_TEXT_COLOR!(state, { type: "SET_TEXT_COLOR", color: "00FF00" });

    expect(getFirstRunProps(result, 0)?.color?.val).toBe("00FF00");
  });
});

// =============================================================================
// SET_HIGHLIGHT_COLOR
// =============================================================================

describe("SET_HIGHLIGHT_COLOR", () => {
  it("sets highlight color", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.SET_HIGHLIGHT_COLOR!(state, { type: "SET_HIGHLIGHT_COLOR", color: "yellow" });

    expect(getFirstRunProps(result, 0)?.highlight).toBe("yellow");
  });

  it("removes highlight when color is undefined", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.SET_HIGHLIGHT_COLOR!(state, { type: "SET_HIGHLIGHT_COLOR", color: undefined });

    expect(getFirstRunProps(result, 0)?.highlight).toBeUndefined();
  });
});

// =============================================================================
// CLEAR_FORMATTING
// =============================================================================

describe("CLEAR_FORMATTING", () => {
  it("removes all run properties", () => {
    const doc = createDocument([createParagraph("hello", { b: true, i: true, sz: 24 })]);
    const state = createState(doc, [0]);

    const result = runFormatHandlers.CLEAR_FORMATTING!(state, { type: "CLEAR_FORMATTING" });

    expect(getFirstRunProps(result, 0)).toBeUndefined();
  });
});
