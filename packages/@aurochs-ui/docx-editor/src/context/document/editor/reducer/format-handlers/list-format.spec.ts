/**
 * @file List Format Handlers Tests
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { docxNumId, docxIlvl, twips } from "@aurochs-office/docx/domain/types";
import type { DocxEditorState } from "../../types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { createEmptyDocxSelection, createIdleDragState } from "../../../state";
import { listFormatHandlers } from "./list-format";

// =============================================================================
// Test Fixtures
// =============================================================================

function createNumPr(numPr?: { numId: number; ilvl: number }) {
  if (!numPr) {
    return undefined;
  }
  return { numPr: { numId: docxNumId(numPr.numId), ilvl: docxIlvl(numPr.ilvl) } };
}

function createParagraph(text: string, numPr?: { numId: number; ilvl: number }): DocxParagraph {
  return {
    type: "paragraph",
    properties: createNumPr(numPr),
    content: [
      {
        type: "run",
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createIndentedParagraph(text: string, leftIndent: number): DocxParagraph {
  return {
    type: "paragraph",
    properties: {
      ind: { left: twips(leftIndent) },
    },
    content: [
      {
        type: "run",
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

function getParaProps(state: DocxEditorState, paraIndex: number) {
  const para = state.documentHistory.present.body.content[paraIndex] as DocxParagraph;
  return para.properties;
}

// =============================================================================
// TOGGLE_BULLET_LIST
// =============================================================================

describe("TOGGLE_BULLET_LIST", () => {
  it("adds bullet list to plain paragraph", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.TOGGLE_BULLET_LIST!(state, { type: "TOGGLE_BULLET_LIST" });

    expect(getParaProps(result, 0)?.numPr?.numId).toBe(1);
    expect(getParaProps(result, 0)?.numPr?.ilvl).toBe(0);
  });

  it("removes bullet list from bulleted paragraph", () => {
    const doc = createDocument([createParagraph("hello", { numId: 1, ilvl: 0 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.TOGGLE_BULLET_LIST!(state, { type: "TOGGLE_BULLET_LIST" });

    expect(getParaProps(result, 0)?.numPr).toBeUndefined();
  });

  it("converts numbered list to bullet list", () => {
    const doc = createDocument([createParagraph("hello", { numId: 2, ilvl: 0 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.TOGGLE_BULLET_LIST!(state, { type: "TOGGLE_BULLET_LIST" });

    expect(getParaProps(result, 0)?.numPr?.numId).toBe(1);
  });

  it("applies to multiple selected paragraphs", () => {
    const doc = createDocument([
      createParagraph("one"),
      createParagraph("two"),
      createParagraph("three"),
    ]);
    const state = createState(doc, [0, 1, 2]);

    const result = listFormatHandlers.TOGGLE_BULLET_LIST!(state, { type: "TOGGLE_BULLET_LIST" });

    expect(getParaProps(result, 0)?.numPr?.numId).toBe(1);
    expect(getParaProps(result, 1)?.numPr?.numId).toBe(1);
    expect(getParaProps(result, 2)?.numPr?.numId).toBe(1);
  });
});

// =============================================================================
// TOGGLE_NUMBERED_LIST
// =============================================================================

describe("TOGGLE_NUMBERED_LIST", () => {
  it("adds numbered list to plain paragraph", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.TOGGLE_NUMBERED_LIST!(state, { type: "TOGGLE_NUMBERED_LIST" });

    expect(getParaProps(result, 0)?.numPr?.numId).toBe(2);
    expect(getParaProps(result, 0)?.numPr?.ilvl).toBe(0);
  });

  it("removes numbered list from numbered paragraph", () => {
    const doc = createDocument([createParagraph("hello", { numId: 2, ilvl: 0 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.TOGGLE_NUMBERED_LIST!(state, { type: "TOGGLE_NUMBERED_LIST" });

    expect(getParaProps(result, 0)?.numPr).toBeUndefined();
  });

  it("converts bullet list to numbered list", () => {
    const doc = createDocument([createParagraph("hello", { numId: 1, ilvl: 0 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.TOGGLE_NUMBERED_LIST!(state, { type: "TOGGLE_NUMBERED_LIST" });

    expect(getParaProps(result, 0)?.numPr?.numId).toBe(2);
  });
});

// =============================================================================
// INCREASE_INDENT
// =============================================================================

describe("INCREASE_INDENT", () => {
  it("increases list level for list item", () => {
    const doc = createDocument([createParagraph("hello", { numId: 1, ilvl: 0 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.INCREASE_INDENT!(state, { type: "INCREASE_INDENT" });

    expect(getParaProps(result, 0)?.numPr?.ilvl).toBe(1);
  });

  it("does not exceed max list level (8)", () => {
    const doc = createDocument([createParagraph("hello", { numId: 1, ilvl: 8 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.INCREASE_INDENT!(state, { type: "INCREASE_INDENT" });

    expect(getParaProps(result, 0)?.numPr?.ilvl).toBe(8);
  });

  it("increases left indent for regular paragraph", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.INCREASE_INDENT!(state, { type: "INCREASE_INDENT" });

    // Default increment is 720 twips (0.5 inch)
    expect(getParaProps(result, 0)?.ind?.left).toBe(720);
  });

  it("adds to existing indent", () => {
    const doc = createDocument([createIndentedParagraph("hello", 720)]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.INCREASE_INDENT!(state, { type: "INCREASE_INDENT" });

    expect(getParaProps(result, 0)?.ind?.left).toBe(1440);
  });
});

// =============================================================================
// DECREASE_INDENT
// =============================================================================

describe("DECREASE_INDENT", () => {
  it("decreases list level for list item", () => {
    const doc = createDocument([createParagraph("hello", { numId: 1, ilvl: 2 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.DECREASE_INDENT!(state, { type: "DECREASE_INDENT" });

    expect(getParaProps(result, 0)?.numPr?.ilvl).toBe(1);
  });

  it("removes list when at level 0", () => {
    const doc = createDocument([createParagraph("hello", { numId: 1, ilvl: 0 })]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.DECREASE_INDENT!(state, { type: "DECREASE_INDENT" });

    expect(getParaProps(result, 0)?.numPr).toBeUndefined();
  });

  it("decreases left indent for regular paragraph", () => {
    const doc = createDocument([createIndentedParagraph("hello", 1440)]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.DECREASE_INDENT!(state, { type: "DECREASE_INDENT" });

    expect(getParaProps(result, 0)?.ind?.left).toBe(720);
  });

  it("removes indent when it would go to zero", () => {
    const doc = createDocument([createIndentedParagraph("hello", 720)]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.DECREASE_INDENT!(state, { type: "DECREASE_INDENT" });

    // When indent becomes 0, the ind property should be removed
    expect(getParaProps(result, 0)?.ind).toBeUndefined();
  });

  it("does not go below zero indent", () => {
    const doc = createDocument([createIndentedParagraph("hello", 360)]);
    const state = createState(doc, [0]);

    const result = listFormatHandlers.DECREASE_INDENT!(state, { type: "DECREASE_INDENT" });

    // 360 - 720 would be negative, so should become 0 (removed)
    expect(getParaProps(result, 0)?.ind).toBeUndefined();
  });
});
