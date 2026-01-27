/**
 * @file DocumentToolbar unit tests
 */

import { render, fireEvent } from "@testing-library/react";
import { JSDOM } from "jsdom";
import type { DocxBlockContent, DocxDocument } from "@oxen/docx/domain/document";
import type { DocumentEditorContextValue } from "../context/document/DocumentEditorContext";
import type { DocxEditorState } from "../context/document/editor/types";
import { createInitialTextEditState } from "../context/document/editor/types";
import type { DocxSelectionState } from "../context/document/state";
import {
  createCursorSelection,
  createEmptyDocxSelection,
  createHistory,
  createIdleDragState,
} from "../context/document/state";

const isBunRuntime = typeof (globalThis as unknown as { readonly Bun?: unknown }).Bun !== "undefined";
const t: {
  readonly describe: (name: string, fn: () => void) => void;
  readonly it: (name: string, fn: () => void) => void;
  readonly expect: typeof expect;
  readonly beforeEach: (fn: () => void) => void;
} = isBunRuntime
  ? ((await import("bun:test")) as unknown as {
      readonly describe: (name: string, fn: () => void) => void;
      readonly it: (name: string, fn: () => void) => void;
      readonly expect: typeof expect;
      readonly beforeEach: (fn: () => void) => void;
    })
  : {
      describe,
      it,
      expect,
      beforeEach,
    };

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const win = dom.window as unknown as Window &
    typeof globalThis & {
      readonly HTMLElement: typeof HTMLElement;
      readonly Node: typeof Node;
    };
  Object.defineProperty(globalThis, "window", { value: win, writable: true });
  Object.defineProperty(globalThis, "document", { value: win.document, writable: true });
  try {
    Object.defineProperty(globalThis, "navigator", { value: win.navigator, writable: true });
  } catch {
    // navigator may be non-configurable in some runtimes (e.g. Bun)
  }
  Object.defineProperty(globalThis, "HTMLElement", { value: win.HTMLElement, writable: true });
  Object.defineProperty(globalThis, "Node", { value: win.Node, writable: true });
  Object.defineProperty(globalThis, "getComputedStyle", { value: win.getComputedStyle.bind(win), writable: true });
}

let currentContext: DocumentEditorContextValue | undefined;
let DocumentToolbar: typeof import("./DocumentToolbar").DocumentToolbar | undefined;

async function setupDocumentToolbarModule() {
  if (DocumentToolbar) {
    return;
  }

  const useDocumentEditor = () => {
    if (!currentContext) {
      throw new Error("Test context not set");
    }
    return currentContext;
  };

  if (isBunRuntime) {
    const bunTest = await import("bun:test");
    bunTest.mock.module("../context/document/DocumentEditorContext", () => ({
      useDocumentEditor,
    }));
  } else {
    vi.doMock("../context/document/DocumentEditorContext", () => ({
      useDocumentEditor,
    }));
  }

  ({ DocumentToolbar } = await import("./DocumentToolbar"));
}

await setupDocumentToolbarModule();
if (!DocumentToolbar) {
  throw new Error("DocumentToolbar module did not load");
}
const DocumentToolbarComponent = DocumentToolbar;

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

function createContextValue({
  document,
  selection = createEmptyDocxSelection(),
  selectedElements = [],
  canUndo = false,
  canRedo = false,
  editorMode = "editing",
  dispatch = () => {},
}: {
  readonly document: DocxDocument;
  readonly selection?: DocxSelectionState;
  readonly selectedElements?: readonly DocxBlockContent[];
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly editorMode?: DocumentEditorContextValue["editorMode"];
  readonly dispatch?: DocumentEditorContextValue["dispatch"];
}): DocumentEditorContextValue {
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

t.describe("DocumentToolbar", () => {
  t.beforeEach(() => {
    currentContext = undefined;
  });

  t.it("disables Undo/Redo buttons based on canUndo/canRedo", () => {
    const document = createDocumentWithFormattedRun();
    const selection = {
      ...createEmptyDocxSelection(),
      mode: "text",
      text: createCursorSelection({ paragraphIndex: 0, charOffset: 0 }),
    } satisfies DocxSelectionState;

    currentContext = createContextValue({ document, selection, canUndo: false, canRedo: true });

    const { getByRole } = render(<DocumentToolbarComponent />);

    const undoButton = getByRole("button", { name: /Undo/i }) as HTMLButtonElement;
    const redoButton = getByRole("button", { name: /Redo/i }) as HTMLButtonElement;

    t.expect(undoButton.disabled).toBe(true);
    t.expect(redoButton.disabled).toBe(false);
  });

  t.it("reflects selected formatting state in toggle buttons", () => {
    const document = createDocumentWithFormattedRun();
    const selection = {
      ...createEmptyDocxSelection(),
      mode: "text",
      text: createCursorSelection({ paragraphIndex: 0, charOffset: 0 }),
    } satisfies DocxSelectionState;

    currentContext = createContextValue({ document, selection });

    const { getByRole } = render(<DocumentToolbarComponent />);

    const bold = getByRole("button", { name: "Bold" });
    const italic = getByRole("button", { name: "Italic" });
    const underline = getByRole("button", { name: "Underline" });
    const strike = getByRole("button", { name: "Strikethrough" });

    t.expect(bold.getAttribute("aria-pressed")).toBe("true");
    t.expect(italic.getAttribute("aria-pressed")).toBe("true");
    t.expect(underline.getAttribute("aria-pressed")).toBe("true");
    t.expect(strike.getAttribute("aria-pressed")).toBe("true");
  });

  t.it("dispatches expected actions when buttons are clicked", () => {
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
    currentContext = createContextValue({ document, selection, canUndo: true, canRedo: true, dispatch });

    const { getByRole } = render(<DocumentToolbarComponent />);

    fireEvent.click(getByRole("button", { name: /Undo/i }));
    fireEvent.click(getByRole("button", { name: /Redo/i }));
    fireEvent.click(getByRole("button", { name: "Bold" }));
    fireEvent.click(getByRole("button", { name: /Align left/i }));
    fireEvent.click(getByRole("button", { name: "Bulleted list" }));
    fireEvent.click(getByRole("button", { name: /Increase indent/i }));

    t.expect(dispatchCalls).toContainEqual({ type: "UNDO" });
    t.expect(dispatchCalls).toContainEqual({ type: "REDO" });
    t.expect(dispatchCalls).toContainEqual({ type: "TOGGLE_BOLD" });
    t.expect(dispatchCalls).toContainEqual({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: "left" });
    t.expect(dispatchCalls).toContainEqual({ type: "TOGGLE_BULLET_LIST" });
    t.expect(dispatchCalls).toContainEqual({ type: "INCREASE_INDENT" });
  });

  t.it("disables formatting buttons when there is no selection", () => {
    const document: DocxDocument = {
      body: { content: [] },
    };

    currentContext = createContextValue({ document, selection: createEmptyDocxSelection() });

    const { getByRole } = render(<DocumentToolbarComponent />);

    const bold = getByRole("button", { name: "Bold" }) as HTMLButtonElement;
    const alignLeft = getByRole("button", { name: /Align left/i }) as HTMLButtonElement;
    const bullet = getByRole("button", { name: "Bulleted list" }) as HTMLButtonElement;
    const indentInc = getByRole("button", { name: /Increase indent/i }) as HTMLButtonElement;

    t.expect(bold.disabled).toBe(true);
    t.expect(alignLeft.disabled).toBe(true);
    t.expect(bullet.disabled).toBe(true);
    t.expect(indentInc.disabled).toBe(true);
  });
});
