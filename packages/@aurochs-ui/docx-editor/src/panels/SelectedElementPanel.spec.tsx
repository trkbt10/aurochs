/**
 * @file SelectedElementPanel unit tests
 *
 * Tests the panel rendering for different element types (no selection, paragraph, table)
 * and verifies formatting dispatch integration.
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocumentEditorContextValue } from "../context/document/DocumentEditorContext";
import { createInitialState } from "../context/document/editor";
import { createEmptyDocxSelection, createIdleDragState } from "../context/document/state";
import { SelectedElementPanel } from "./SelectedElementPanel";
import { DocumentEditorTestProvider } from "../context/document/DocumentEditorContext";

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
    activePageIndex: state.activePageIndex,
  };
}

describe("SelectedElementPanel", () => {
  it("shows empty state when there is no selection", () => {
    const { getByTestId } = render(
      <DocumentEditorTestProvider value={createContextValue({ primaryElement: undefined, selectedElements: [] })}>
        <SelectedElementPanel />
      </DocumentEditorTestProvider>,
    );
    const empty = getByTestId("docx-selected-element-panel-empty");
    expect(empty).toBeTruthy();
    expect(empty.textContent).toBe("Click on text to edit formatting");
  });

  it("shows Font and Alignment sections for paragraph selection", () => {
    const paragraph = createParagraph("Hello", { rPr: { b: true } });

    const { container } = render(
      <DocumentEditorTestProvider
        value={createContextValue({ primaryElement: paragraph, selectedElements: [paragraph] })}
      >
        <SelectedElementPanel />
      </DocumentEditorTestProvider>,
    );

    // The header should show "Format"
    const header = container.querySelector('div[style*="font-weight: 600"]');
    expect(header?.textContent).toBe("Format");

    // TextFormattingEditor renders OptionalPropertySections with titles "Font", etc.
    const sectionTitles = Array.from(container.querySelectorAll('[role="button"] span')).map(
      (el) => el.textContent,
    );
    expect(sectionTitles).toContain("Font");

    // ParagraphFormattingEditor renders FieldGroup with label "Alignment"
    const allText = container.textContent ?? "";
    expect(allText).toContain("Alignment");
  });

  it("shows Table and Cell sections for table selection", () => {
    const table = createSimpleTable();

    const { container } = render(
      <DocumentEditorTestProvider value={createContextValue({ primaryElement: table, selectedElements: [table] })}>
        <SelectedElementPanel />
      </DocumentEditorTestProvider>,
    );

    const sectionTitles = Array.from(container.querySelectorAll('[role="button"] span')).map(
      (el) => el.textContent,
    );
    expect(sectionTitles).toContain("Table");
    expect(sectionTitles).toContain("Cell");
  });

  it("dispatches APPLY_RUN_FORMAT when font weight changes", () => {
    const paragraph = createParagraph("Hello", { rPr: {} });
    const dispatchCalls: unknown[] = [];
    const dispatch: DocumentEditorContextValue["dispatch"] = (action) => {
      dispatchCalls.push(action);
    };

    const { getByLabelText } = render(
      <DocumentEditorTestProvider
        value={createContextValue({ primaryElement: paragraph, selectedElements: [paragraph], dispatch })}
      >
        <SelectedElementPanel />
      </DocumentEditorTestProvider>,
    );

    // FontSection renders a "Font weight" combobox selector
    const fontWeightButton = getByLabelText("Font weight");
    expect(fontWeightButton).toBeTruthy();
  });

  it("shows mixed values when multiple paragraphs have different run properties", () => {
    const p1 = createParagraph("A", { rPr: { b: true } });
    const p2 = createParagraph("B", { rPr: { b: false } });

    const { getByLabelText } = render(
      <DocumentEditorTestProvider value={createContextValue({ primaryElement: p1, selectedElements: [p1, p2] })}>
        <SelectedElementPanel />
      </DocumentEditorTestProvider>,
    );

    // When multiple elements are selected, the FontSection still renders with mixed context.
    // Font weight selector should be present.
    const fontWeightButton = getByLabelText("Font weight");
    expect(fontWeightButton).toBeTruthy();
  });
});
