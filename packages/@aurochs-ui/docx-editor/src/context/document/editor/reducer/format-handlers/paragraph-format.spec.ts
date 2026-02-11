/**
 * @file Paragraph Format Handlers Tests
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxEditorState } from "../../types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { createEmptyDocxSelection, createIdleDragState } from "../../../state";
import { paragraphFormatHandlers } from "./paragraph-format";

// =============================================================================
// Test Fixtures
// =============================================================================

function createParagraph(text: string): DocxParagraph {
  return {
    type: "paragraph",
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
// APPLY_PARAGRAPH_FORMAT
// =============================================================================

describe("APPLY_PARAGRAPH_FORMAT", () => {
  it("applies format to selected paragraph", () => {
    const doc = createDocument([createParagraph("hello"), createParagraph("world")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.APPLY_PARAGRAPH_FORMAT!(state, {
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { jc: "center" },
    });

    expect(getParaProps(result, 0)?.jc).toBe("center");
    expect(getParaProps(result, 1)?.jc).toBeUndefined();
  });

  it("applies format to multiple selected paragraphs", () => {
    const doc = createDocument([
      createParagraph("one"),
      createParagraph("two"),
      createParagraph("three"),
    ]);
    const state = createState(doc, [0, 2]);

    const result = paragraphFormatHandlers.APPLY_PARAGRAPH_FORMAT!(state, {
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { jc: "right" },
    });

    expect(getParaProps(result, 0)?.jc).toBe("right");
    expect(getParaProps(result, 1)?.jc).toBeUndefined();
    expect(getParaProps(result, 2)?.jc).toBe("right");
  });

  it("returns unchanged state if no selection", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, []);

    const result = paragraphFormatHandlers.APPLY_PARAGRAPH_FORMAT!(state, {
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { jc: "center" },
    });

    expect(result).toBe(state);
  });

  it("pushes to history", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.APPLY_PARAGRAPH_FORMAT!(state, {
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { jc: "center" },
    });

    expect(result.documentHistory.past).toHaveLength(1);
    expect(result.documentHistory.past[0]).toBe(doc);
  });
});

// =============================================================================
// SET_PARAGRAPH_ALIGNMENT
// =============================================================================

describe("SET_PARAGRAPH_ALIGNMENT", () => {
  it("sets alignment to center", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_ALIGNMENT!(state, {
      type: "SET_PARAGRAPH_ALIGNMENT",
      alignment: "center",
    });

    expect(getParaProps(result, 0)?.jc).toBe("center");
  });

  it("sets alignment to left", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_ALIGNMENT!(state, {
      type: "SET_PARAGRAPH_ALIGNMENT",
      alignment: "left",
    });

    expect(getParaProps(result, 0)?.jc).toBe("left");
  });

  it("sets alignment to right", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_ALIGNMENT!(state, {
      type: "SET_PARAGRAPH_ALIGNMENT",
      alignment: "right",
    });

    expect(getParaProps(result, 0)?.jc).toBe("right");
  });

  it("sets alignment to both (justify)", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_ALIGNMENT!(state, {
      type: "SET_PARAGRAPH_ALIGNMENT",
      alignment: "both",
    });

    expect(getParaProps(result, 0)?.jc).toBe("both");
  });
});

// =============================================================================
// SET_LINE_SPACING
// =============================================================================

describe("SET_LINE_SPACING", () => {
  it("sets line spacing with auto rule (default)", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    // 1.5 line spacing = 360 (1.5 * 240)
    const result = paragraphFormatHandlers.SET_LINE_SPACING!(state, {
      type: "SET_LINE_SPACING",
      spacing: 1.5,
    });

    expect(getParaProps(result, 0)?.spacing?.line).toBe(360);
    expect(getParaProps(result, 0)?.spacing?.lineRule).toBe("auto");
  });

  it("sets line spacing with exact rule", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    // 12pt exact = 240 twips (12 * 20)
    const result = paragraphFormatHandlers.SET_LINE_SPACING!(state, {
      type: "SET_LINE_SPACING",
      spacing: 12,
      rule: "exact",
    });

    expect(getParaProps(result, 0)?.spacing?.line).toBe(240);
    expect(getParaProps(result, 0)?.spacing?.lineRule).toBe("exact");
  });

  it("sets double spacing", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    // Double spacing = 480 (2 * 240)
    const result = paragraphFormatHandlers.SET_LINE_SPACING!(state, {
      type: "SET_LINE_SPACING",
      spacing: 2,
    });

    expect(getParaProps(result, 0)?.spacing?.line).toBe(480);
  });
});

// =============================================================================
// SET_PARAGRAPH_INDENT
// =============================================================================

describe("SET_PARAGRAPH_INDENT", () => {
  it("sets left indent", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    // 36pt left indent = 720 twips (36 * 20)
    const result = paragraphFormatHandlers.SET_PARAGRAPH_INDENT!(state, {
      type: "SET_PARAGRAPH_INDENT",
      left: 36,
    });

    expect(getParaProps(result, 0)?.ind?.left).toBe(720);
  });

  it("sets right indent", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_INDENT!(state, {
      type: "SET_PARAGRAPH_INDENT",
      right: 18,
    });

    expect(getParaProps(result, 0)?.ind?.right).toBe(360);
  });

  it("sets positive first line indent", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_INDENT!(state, {
      type: "SET_PARAGRAPH_INDENT",
      firstLine: 18,
    });

    expect(getParaProps(result, 0)?.ind?.firstLine).toBe(360);
    expect(getParaProps(result, 0)?.ind?.hanging).toBeUndefined();
  });

  it("sets negative first line indent as hanging indent", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_INDENT!(state, {
      type: "SET_PARAGRAPH_INDENT",
      firstLine: -18,
    });

    expect(getParaProps(result, 0)?.ind?.hanging).toBe(360);
    expect(getParaProps(result, 0)?.ind?.firstLine).toBeUndefined();
  });

  it("sets multiple indent values", () => {
    const doc = createDocument([createParagraph("hello")]);
    const state = createState(doc, [0]);

    const result = paragraphFormatHandlers.SET_PARAGRAPH_INDENT!(state, {
      type: "SET_PARAGRAPH_INDENT",
      left: 36,
      right: 18,
      firstLine: 9,
    });

    expect(getParaProps(result, 0)?.ind?.left).toBe(720);
    expect(getParaProps(result, 0)?.ind?.right).toBe(360);
    expect(getParaProps(result, 0)?.ind?.firstLine).toBe(180);
  });
});
