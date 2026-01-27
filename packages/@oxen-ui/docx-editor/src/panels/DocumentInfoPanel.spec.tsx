/**
 * @file DocumentInfoPanel unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { JSDOM } from "jsdom";
import type { DocxDocument } from "@oxen/docx/domain/document";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxTable } from "@oxen/docx/domain/table";
import type { DocumentEditorContextValue } from "../context/document/DocumentEditorContext";
import { createInitialState } from "../context/document/editor";
import { createEmptyDocxSelection, createIdleDragState } from "../context/document/state";
import { DocumentInfoPanel, calculateDocumentStats } from "./DocumentInfoPanel";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import { docxStyleId } from "@oxen/docx/domain/types";

vi.mock("../context/document/DocumentEditorContext", async () => {
  return {
    useDocumentEditor: vi.fn(),
  };
});

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const win = dom.window as unknown as Window &
    typeof globalThis & {
      readonly HTMLElement: typeof HTMLElement;
      readonly Node: typeof Node;
    };
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.navigator = win.navigator;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Node = win.Node;
  globalThis.getComputedStyle = win.getComputedStyle.bind(win);
}

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

function createContextValue(
  overrides: Partial<DocumentEditorContextValue>
): DocumentEditorContextValue {
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
  const mockUseDocumentEditor = useDocumentEditor as unknown as {
    readonly mockReset: () => void;
    readonly mockReturnValue: (value: DocumentEditorContextValue) => void;
  };

  beforeEach(() => {
    mockUseDocumentEditor.mockReset();
  });

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

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        document: doc,
      })
    );

    const { getAllByText } = render(<DocumentInfoPanel />);
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

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        document: doc,
      })
    );

    const { getByText } = render(<DocumentInfoPanel />);
    expect(getByText("Heading 1")).toBeTruthy();
  });

  it("dispatches an apply-style action when a style is selected", () => {
    const heading1Id = docxStyleId("Heading1");
    const dispatch = vi.fn();

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

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        document: doc,
        dispatch,
        editorMode: "editing",
      })
    );

    const { getByText } = render(<DocumentInfoPanel />);
    fireEvent.click(getByText("Heading 1"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { pStyle: heading1Id },
    });
  });
});
