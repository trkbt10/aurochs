/**
 * @file DocumentInfoPanel unit tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocumentEditorContextValue } from "../context/document/DocumentEditorContext";
import { createInitialState } from "../context/document/editor";
import { createEmptyDocxSelection, createIdleDragState } from "../context/document/state";
import { DocumentInfoPanel, calculateDocumentStats } from "./DocumentInfoPanel";
import { DocumentEditorTestProvider } from "../context/document/DocumentEditorContext";
import { docxStyleId } from "@aurochs-office/docx/domain/types";

function createParagraph(text: string, props?: DocxParagraph["properties"]): DocxParagraph {
  return {
    type: "paragraph",
    properties: props,
    content: [
      {
        type: "run",
        properties: props?.rPr,
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createTableWithText(text: string): DocxTable {
  return {
    type: "table",
    rows: [
      {
        type: "tableRow",
        cells: [
          {
            type: "tableCell",
            content: [createParagraph(text)],
          },
        ],
      },
    ],
  };
}

function createContextValue(overrides: Partial<DocumentEditorContextValue>): DocumentEditorContextValue {
  const doc: DocxDocument =
    overrides.document ??
    ({
      body: {
        content: [],
      },
    } satisfies DocxDocument);

  const state = createInitialState(doc);

  return {
    state: {
      ...state,
      selection: overrides.state?.selection ?? createEmptyDocxSelection(),
      drag: overrides.state?.drag ?? createIdleDragState(),
    },
    dispatch: overrides.dispatch ?? (() => {}),
    document: doc,
    selectedElements: overrides.selectedElements ?? [],
    primaryElement: overrides.primaryElement,
    canUndo: overrides.canUndo ?? false,
    canRedo: overrides.canRedo ?? false,
    textEdit: overrides.textEdit ?? state.textEdit,
    editorMode: overrides.editorMode ?? state.mode,
  };
}

describe("DocumentInfoPanel", () => {
  it("calculates document stats including table text", () => {
    const doc = {
      body: {
        content: [createParagraph("Hello"), createTableWithText("A")],
      },
    } satisfies DocxDocument;

    expect(calculateDocumentStats(doc)).toEqual({
      paragraphCount: 1,
      tableCount: 1,
      characterCount: 6,
    });
  });

  it("renders without errors for an empty document", () => {
    const doc = {
      body: {
        content: [],
      },
    } satisfies DocxDocument;

    const { getAllByText } = render(
      <DocumentEditorTestProvider value={createContextValue({ document: doc })}>
        <DocumentInfoPanel />
      </DocumentEditorTestProvider>,
    );
    expect(getAllByText("0").length).toBeGreaterThanOrEqual(3);
  });

  it("shows style list items for styles in the document", () => {
    const heading1Id = docxStyleId("Heading1");
    const doc = {
      body: {
        content: [createParagraph("Hello", { pStyle: heading1Id })],
      },
      styles: {
        style: [
          {
            type: "paragraph",
            styleId: heading1Id,
            name: { val: "Heading 1" },
          },
        ],
      },
    } satisfies DocxDocument;

    const { getByText } = render(
      <DocumentEditorTestProvider value={createContextValue({ document: doc })}>
        <DocumentInfoPanel />
      </DocumentEditorTestProvider>,
    );
    expect(getByText("Heading 1")).toBeTruthy();
  });

  it("dispatches an apply-style action when a style is selected", () => {
    const heading1Id = docxStyleId("Heading1");
    const dispatchCalls: unknown[] = [];
    const dispatch: DocumentEditorContextValue["dispatch"] = (action) => {
      dispatchCalls.push(action);
    };

    const doc = {
      body: {
        content: [createParagraph("Hello", { pStyle: heading1Id })],
      },
      styles: {
        style: [
          {
            type: "paragraph",
            styleId: heading1Id,
            name: { val: "Heading 1" },
          },
        ],
      },
    } satisfies DocxDocument;

    const { getByText } = render(
      <DocumentEditorTestProvider value={createContextValue({ document: doc, dispatch, editorMode: "editing" })}>
        <DocumentInfoPanel />
      </DocumentEditorTestProvider>,
    );
    fireEvent.click(getByText("Heading 1"));

    expect(dispatchCalls).toContainEqual({
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { pStyle: heading1Id },
    });
  });
});
