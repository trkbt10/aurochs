/**
 * @file SelectedElementPanel unit tests
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
import { SelectedElementPanel } from "./SelectedElementPanel";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";

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

function createSimpleTable(): DocxTable {
  return {
    type: "table",
    properties: { tblW: { value: 5000, type: "pct" } },
    rows: [
      {
        type: "tableRow",
        cells: [
          {
            type: "tableCell",
            content: [],
            properties: { vAlign: "top" },
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

describe("SelectedElementPanel", () => {
  const mockUseDocumentEditor = useDocumentEditor as unknown as {
    readonly mockReset: () => void;
    readonly mockReturnValue: (value: DocumentEditorContextValue) => void;
  };

  beforeEach(() => {
    mockUseDocumentEditor.mockReset();
  });

  it("shows empty state when there is no selection", () => {
    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        primaryElement: undefined,
        selectedElements: [],
      })
    );

    const { getByTestId, getByText } = render(<SelectedElementPanel />);
    const empty = getByTestId("docx-selected-element-panel-empty");
    expect(empty).toBeTruthy();
    expect(getByText("No selection")).toBeTruthy();

    expect(empty.style.padding).toBe("var(--spacing-lg)");
    expect(empty.style.color).toBe("var(--text-secondary)");
    expect(empty.style.fontSize).toBe("var(--font-size-md)");
  });

  it("shows run and paragraph editors for paragraph selection", () => {
    const paragraph = createParagraph("Hello", { rPr: { b: true } });

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        primaryElement: paragraph,
        selectedElements: [paragraph],
      })
    );

    const { getByText, container } = render(<SelectedElementPanel />);
    expect(getByText("Formatting")).toBeTruthy();
    expect(getByText("Alignment")).toBeTruthy();

    const wrapper = container.querySelector('div[style*="gap: var(--spacing-md)"]') as
      | HTMLDivElement
      | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.style.gap).toBe("var(--spacing-md)");
    expect(wrapper?.style.padding).toBe("var(--spacing-md)");
  });

  it("shows table and cell editors for table selection", () => {
    const table = createSimpleTable();

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        primaryElement: table,
        selectedElements: [table],
      })
    );

    const { getByText, container } = render(<SelectedElementPanel />);
    expect(getByText("Table Width")).toBeTruthy();
    expect(getByText("Cell Width")).toBeTruthy();

    const wrapper = container.querySelector('div[style*="gap: var(--spacing-md)"]') as
      | HTMLDivElement
      | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.style.gap).toBe("var(--spacing-md)");
    expect(wrapper?.style.padding).toBe("var(--spacing-md)");
  });

  it("dispatches formatting actions when properties change", () => {
    const paragraph = createParagraph("Hello", { rPr: {} });
    const dispatch = vi.fn();

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        primaryElement: paragraph,
        selectedElements: [paragraph],
        dispatch,
      })
    );

    const { getByLabelText } = render(<SelectedElementPanel />);

    fireEvent.click(getByLabelText("Bold"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "APPLY_RUN_FORMAT",
      format: { b: true },
    });

    fireEvent.click(getByLabelText("Center"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "APPLY_PARAGRAPH_FORMAT",
      format: { jc: "center" },
    });
  });

  it("shows mixed values when multiple paragraphs have different run properties", () => {
    const p1 = createParagraph("A", { rPr: { b: true } });
    const p2 = createParagraph("B", { rPr: { b: false } });

    mockUseDocumentEditor.mockReturnValue(
      createContextValue({
        primaryElement: p1,
        selectedElements: [p1, p2],
      })
    );

    const { getByLabelText } = render(<SelectedElementPanel />);
    expect(getByLabelText("Bold").getAttribute("aria-pressed")).toBe("mixed");
  });
});
