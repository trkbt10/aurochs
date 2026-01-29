/**
 * @file DocumentToolbar unit tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { DocxBlockContent, DocxDocument } from "@oxen-office/docx/domain/document";
import type { DocumentEditorContextValue } from "../context/document/DocumentEditorContext";
import { DocumentEditorTestProvider } from "../context/document/DocumentEditorContext";
import type { DocxEditorState } from "../context/document/editor/types";
import { createInitialTextEditState } from "../context/document/editor/types";
import type { DocxSelectionState } from "../context/document/state";
import {
  createCursorSelection,
  createEmptyDocxSelection,
  createHistory,
  createIdleDragState,
} from "../context/document/state";
import { DocumentToolbar } from "./DocumentToolbar";

function createDocumentWithFormattedRun(): DocxDocument {
  return {
    body: {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              properties: {
                b: true,
                i: true,
                u: { val: "single" },
                strike: true,
              },
              content: [{ type: "text", value: "Hello" }],
            },
          ],
        },
      ],
    },
  };
}

function createContextValue(args: {
  readonly document: DocxDocument;
  readonly selection?: DocxSelectionState;
  readonly selectedElements?: readonly DocxBlockContent[];
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly editorMode?: DocumentEditorContextValue["editorMode"];
  readonly dispatch?: DocumentEditorContextValue["dispatch"];
}): DocumentEditorContextValue {
  const {
    document,
    selection = createEmptyDocxSelection(),
    selectedElements = [],
    canUndo = false,
    canRedo = false,
    editorMode = "editing",
    dispatch = () => {},
  } = args;

  const state: DocxEditorState = {
    documentHistory: createHistory(document),
    selection,
    drag: createIdleDragState(),
    clipboard: undefined,
    textEdit: createInitialTextEditState(),
    mode: editorMode,
    activeSectionIndex: 0,
  };

  return {
    state,
    dispatch,
    document,
    selectedElements,
    primaryElement: selectedElements[0],
    canUndo,
    canRedo,
    textEdit: state.textEdit,
    editorMode,
  };
}

describe("DocumentToolbar", () => {
  it("disables Undo/Redo buttons based on canUndo/canRedo", () => {
    const document = createDocumentWithFormattedRun();
    const selection = {
      ...createEmptyDocxSelection(),
      mode: "text",
      text: createCursorSelection({ paragraphIndex: 0, charOffset: 0 }),
    } satisfies DocxSelectionState;

    const value = createContextValue({ document, selection, canUndo: false, canRedo: true });

    const { getByRole } = render(
      <DocumentEditorTestProvider value={value}>
        <DocumentToolbar />
      </DocumentEditorTestProvider>
    );

    const undoButton = getByRole("button", { name: /Undo/i }) as HTMLButtonElement;
    const redoButton = getByRole("button", { name: /Redo/i }) as HTMLButtonElement;

    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(false);
  });

  it("reflects selected formatting state in toggle buttons", () => {
    const document = createDocumentWithFormattedRun();
    const selection = {
      ...createEmptyDocxSelection(),
      mode: "text",
      text: createCursorSelection({ paragraphIndex: 0, charOffset: 0 }),
    } satisfies DocxSelectionState;

    const value = createContextValue({ document, selection });

    const { getByRole } = render(
      <DocumentEditorTestProvider value={value}>
        <DocumentToolbar />
      </DocumentEditorTestProvider>
    );

    const bold = getByRole("button", { name: "Bold" });
    const italic = getByRole("button", { name: "Italic" });
    const underline = getByRole("button", { name: "Underline" });
    const strike = getByRole("button", { name: "Strikethrough" });

    expect(bold.getAttribute("aria-pressed")).toBe("true");
    expect(italic.getAttribute("aria-pressed")).toBe("true");
    expect(underline.getAttribute("aria-pressed")).toBe("true");
    expect(strike.getAttribute("aria-pressed")).toBe("true");
  });

  it("dispatches expected actions when buttons are clicked", () => {
    const document = createDocumentWithFormattedRun();
    const selection = {
      ...createEmptyDocxSelection(),
      mode: "text",
      text: createCursorSelection({ paragraphIndex: 0, charOffset: 0 }),
    } satisfies DocxSelectionState;

    const dispatchCalls: unknown[] = [];
    const dispatch: DocumentEditorContextValue["dispatch"] = (action) => {
      dispatchCalls.push(action);
    };

    const value = createContextValue({ document, selection, canUndo: true, canRedo: true, dispatch });

    const { getByRole } = render(
      <DocumentEditorTestProvider value={value}>
        <DocumentToolbar />
      </DocumentEditorTestProvider>
    );

    fireEvent.click(getByRole("button", { name: /Undo/i }));
    fireEvent.click(getByRole("button", { name: /Redo/i }));
    fireEvent.click(getByRole("button", { name: "Bold" }));
    fireEvent.click(getByRole("button", { name: /Align left/i }));
    fireEvent.click(getByRole("button", { name: "Bulleted list" }));
    fireEvent.click(getByRole("button", { name: /Increase indent/i }));

    expect(dispatchCalls).toContainEqual({ type: "UNDO" });
    expect(dispatchCalls).toContainEqual({ type: "REDO" });
    expect(dispatchCalls).toContainEqual({ type: "TOGGLE_BOLD" });
    expect(dispatchCalls).toContainEqual({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: "left" });
    expect(dispatchCalls).toContainEqual({ type: "TOGGLE_BULLET_LIST" });
    expect(dispatchCalls).toContainEqual({ type: "INCREASE_INDENT" });
  });

  it("disables formatting buttons when there is no selection", () => {
    const document: DocxDocument = {
      body: { content: [] },
    };

    const value = createContextValue({ document, selection: createEmptyDocxSelection() });

    const { getByRole } = render(
      <DocumentEditorTestProvider value={value}>
        <DocumentToolbar />
      </DocumentEditorTestProvider>
    );

    const bold = getByRole("button", { name: "Bold" }) as HTMLButtonElement;
    const alignLeft = getByRole("button", { name: /Align left/i }) as HTMLButtonElement;
    const bullet = getByRole("button", { name: "Bulleted list" }) as HTMLButtonElement;
    const indentInc = getByRole("button", { name: /Increase indent/i }) as HTMLButtonElement;

    expect(bold.disabled).toBe(true);
    expect(alignLeft.disabled).toBe(true);
    expect(bullet.disabled).toBe(true);
    expect(indentInc.disabled).toBe(true);
  });
});

