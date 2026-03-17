/**
 * @file Table Structure Handlers
 *
 * Handlers for table structural operations (insert/remove rows/columns, merge/split).
 * Delegates to mutation.ts functions.
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import type { DocxTable } from "@aurochs-office/docx/domain/table";
import type { HandlerMap } from "../handler-types";
import { updateDocumentContent } from "./helpers";
import {
  createTable,
  insertRow,
  removeRow,
  insertColumn,
  removeColumn,
  mergeCellsHorizontally,
  mergeCellsVertically,
} from "../../../../../table/mutation";

// =============================================================================
// Helpers
// =============================================================================

/** Get table at the given index from document body content. */
function getTableAtIndex(content: readonly { type: string }[], index: number): DocxTable | undefined {
  const element = content[index];
  if (element && element.type === "table") {
    return element as DocxTable;
  }
  return undefined;
}

/** Apply a mutation to a specific table in the document and push to history. */
function applyTableMutation(
  state: Parameters<NonNullable<HandlerMap["INSERT_TABLE"]>>[0],
  tableIndex: number,
  mutate: (table: DocxTable) => DocxTable,
): ReturnType<NonNullable<HandlerMap["INSERT_TABLE"]>> {
  const document = state.documentHistory.present;
  const table = getTableAtIndex(document.body.content, tableIndex);
  if (!table) {
    return state;
  }

  const newDocument = updateDocumentContent(document, [tableIndex], (element) => {
    if (element.type === "table") {
      return mutate(element as DocxTable);
    }
    return element;
  });

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDocument),
  };
}

// =============================================================================
// Table Structure Handlers
// =============================================================================

export const tableStructureHandlers: HandlerMap = {
  INSERT_TABLE: (state, action) => {
    const document = state.documentHistory.present;
    const table = createTable(action.rows, action.cols);
    const content = [...document.body.content];
    content.splice(action.index, 0, table);
    const newDocument = {
      ...document,
      body: { ...document.body, content },
    };
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  DELETE_TABLE: (state, action) => {
    const document = state.documentHistory.present;
    const content = document.body.content.filter((_, i) => i !== action.index);
    const newDocument = {
      ...document,
      body: { ...document.body, content },
    };
    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  INSERT_TABLE_ROW: (state, action) => {
    const rowIndex = action.above ? action.rowIndex : action.rowIndex + 1;
    return applyTableMutation(state, action.tableIndex, (table) => insertRow(table, rowIndex));
  },

  DELETE_TABLE_ROW: (state, action) => {
    return applyTableMutation(state, action.tableIndex, (table) => removeRow(table, action.rowIndex));
  },

  INSERT_TABLE_COLUMN: (state, action) => {
    const colIndex = action.before ? action.colIndex : action.colIndex + 1;
    return applyTableMutation(state, action.tableIndex, (table) => insertColumn(table, colIndex));
  },

  DELETE_TABLE_COLUMN: (state, action) => {
    return applyTableMutation(state, action.tableIndex, (table) => removeColumn(table, action.colIndex));
  },

  MERGE_TABLE_CELLS: (state, action) => {
    const { tableIndex, startRow, startCol, endRow, endCol } = action;

    return applyTableMutation(state, tableIndex, (table) => {
      // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
      let result = table;

      // Horizontal merge on each row
      if (startCol < endCol) {
        for (let ri = startRow; ri <= endRow; ri++) {
          result = mergeCellsHorizontally({ table: result, rowIndex: ri, startCol, endCol });
        }
      }

      // Vertical merge on each column
      if (startRow < endRow) {
        for (let ci = startCol; ci <= endCol; ci++) {
          result = mergeCellsVertically({ table: result, colIndex: ci, startRow, endRow });
        }
      }

      return result;
    });
  },

  SPLIT_TABLE_CELL: (state, action) => {
    return applyTableMutation(state, action.tableIndex, (table) => {
      const cell = table.rows[action.rowIndex]?.cells[action.colIndex];
      if (!cell) { return table; }

      return {
        ...table,
        rows: table.rows.map((row, ri) => {
          if (ri !== action.rowIndex) { return row; }
          return {
            ...row,
            cells: row.cells.map((c, ci) => {
              if (ci !== action.colIndex) { return c; }
              const { gridSpan: _gs, vMerge: _vm, hMerge: _hm, ...restProps } = c.properties ?? {};
              return {
                ...c,
                properties: Object.keys(restProps).length > 0 ? restProps : undefined,
              };
            }),
          };
        }),
      };
    });
  },
};
