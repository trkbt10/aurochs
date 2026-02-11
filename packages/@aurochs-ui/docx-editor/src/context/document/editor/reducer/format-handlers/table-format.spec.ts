/**
 * @file Table Format Handlers Tests
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { DocxEditorState } from "../../types";
import { createHistory } from "@aurochs-ui/editor-core/history";
import { createEmptyDocxSelection, createIdleDragState } from "../../../state";
import { tableFormatHandlers } from "./table-format";

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

function createTable(rows: number, cols: number): DocxTable {
  return {
    type: "table",
    rows: Array.from({ length: rows }, () => ({
      type: "tableRow" as const,
      cells: Array.from({ length: cols }, () => ({
        type: "tableCell" as const,
        content: [createParagraph("Cell")],
      })),
    })),
  };
}

function createDocument(content: DocxDocument["body"]["content"]): DocxDocument {
  return { body: { content } };
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

function getTable(state: DocxEditorState, index: number): DocxTable {
  return state.documentHistory.present.body.content[index] as DocxTable;
}

// =============================================================================
// APPLY_TABLE_FORMAT
// =============================================================================

describe("APPLY_TABLE_FORMAT", () => {
  it("applies format to selected table", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_FORMAT!(state, {
      type: "APPLY_TABLE_FORMAT",
      format: { tblW: { value: 5000, type: "dxa" } },
    });

    expect(getTable(result, 0).properties?.tblW).toEqual({ value: 5000, type: "dxa" });
  });

  it("applies tblLook properties", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_FORMAT!(state, {
      type: "APPLY_TABLE_FORMAT",
      format: {
        tblLook: {
          firstRow: true,
          lastRow: false,
          firstColumn: true,
          lastColumn: false,
          noHBand: false,
          noVBand: true,
        },
      },
    });

    const tblLook = getTable(result, 0).properties?.tblLook;
    expect(tblLook?.firstRow).toBe(true);
    expect(tblLook?.lastRow).toBe(false);
    expect(tblLook?.firstColumn).toBe(true);
    expect(tblLook?.lastColumn).toBe(false);
    expect(tblLook?.noHBand).toBe(false);
    expect(tblLook?.noVBand).toBe(true);
  });

  it("does not modify paragraphs", () => {
    const doc = createDocument([createParagraph("hello"), createTable(2, 2)]);
    const state = createState(doc, [0, 1]);

    const result = tableFormatHandlers.APPLY_TABLE_FORMAT!(state, {
      type: "APPLY_TABLE_FORMAT",
      format: { tblW: { value: 5000, type: "dxa" } },
    });

    // Paragraph should be unchanged
    expect(result.documentHistory.present.body.content[0]).toEqual(createParagraph("hello"));
    // Table should have the new format
    expect(getTable(result, 1).properties?.tblW).toEqual({ value: 5000, type: "dxa" });
  });

  it("returns unchanged state if no selection", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, []);

    const result = tableFormatHandlers.APPLY_TABLE_FORMAT!(state, {
      type: "APPLY_TABLE_FORMAT",
      format: { tblW: { value: 5000, type: "dxa" } },
    });

    expect(result).toBe(state);
  });

  it("pushes to history", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_FORMAT!(state, {
      type: "APPLY_TABLE_FORMAT",
      format: { tblW: { value: 5000, type: "dxa" } },
    });

    expect(result.documentHistory.past).toHaveLength(1);
    expect(result.documentHistory.past[0]).toBe(doc);
  });
});

// =============================================================================
// APPLY_TABLE_CELL_FORMAT
// =============================================================================

describe("APPLY_TABLE_CELL_FORMAT", () => {
  it("applies format to all cells in selected table", () => {
    const doc = createDocument([createTable(2, 3)]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_CELL_FORMAT!(state, {
      type: "APPLY_TABLE_CELL_FORMAT",
      format: { vAlign: "center" },
    });

    const table = getTable(result, 0);
    for (const row of table.rows) {
      for (const cell of row.cells) {
        expect(cell.properties?.vAlign).toBe("center");
      }
    }
  });

  it("applies tcW (cell width) to all cells", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_CELL_FORMAT!(state, {
      type: "APPLY_TABLE_CELL_FORMAT",
      format: { tcW: { value: 2500, type: "dxa" } },
    });

    const table = getTable(result, 0);
    for (const row of table.rows) {
      for (const cell of row.cells) {
        expect(cell.properties?.tcW).toEqual({ value: 2500, type: "dxa" });
      }
    }
  });

  it("applies shading to all cells", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_CELL_FORMAT!(state, {
      type: "APPLY_TABLE_CELL_FORMAT",
      format: { shd: { val: "clear", fill: "FFFF00" } },
    });

    const table = getTable(result, 0);
    for (const row of table.rows) {
      for (const cell of row.cells) {
        expect(cell.properties?.shd).toEqual({ val: "clear", fill: "FFFF00" });
      }
    }
  });

  it("does not modify non-table elements", () => {
    const doc = createDocument([createParagraph("hello"), createTable(2, 2)]);
    const state = createState(doc, [0, 1]);

    const result = tableFormatHandlers.APPLY_TABLE_CELL_FORMAT!(state, {
      type: "APPLY_TABLE_CELL_FORMAT",
      format: { vAlign: "bottom" },
    });

    // Paragraph should be unchanged
    expect(result.documentHistory.present.body.content[0]).toEqual(createParagraph("hello"));
  });

  it("returns unchanged state if no selection", () => {
    const doc = createDocument([createTable(2, 2)]);
    const state = createState(doc, []);

    const result = tableFormatHandlers.APPLY_TABLE_CELL_FORMAT!(state, {
      type: "APPLY_TABLE_CELL_FORMAT",
      format: { vAlign: "center" },
    });

    expect(result).toBe(state);
  });

  it("merges with existing cell properties", () => {
    const tableWithProps: DocxTable = {
      type: "table",
      rows: [
        {
          type: "tableRow",
          cells: [
            {
              type: "tableCell",
              properties: { tcW: { value: 1000, type: "dxa" } },
              content: [createParagraph("Cell")],
            },
          ],
        },
      ],
    };
    const doc = createDocument([tableWithProps]);
    const state = createState(doc, [0]);

    const result = tableFormatHandlers.APPLY_TABLE_CELL_FORMAT!(state, {
      type: "APPLY_TABLE_CELL_FORMAT",
      format: { vAlign: "center" },
    });

    const cell = getTable(result, 0).rows[0].cells[0];
    expect(cell.properties?.tcW).toEqual({ value: 1000, type: "dxa" });
    expect(cell.properties?.vAlign).toBe("center");
  });
});
