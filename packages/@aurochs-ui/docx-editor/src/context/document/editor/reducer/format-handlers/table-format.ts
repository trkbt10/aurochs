/**
 * @file Table Format Handlers
 *
 * Handlers for table formatting operations.
 * Includes table properties and cell properties.
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import type { HandlerMap } from "../handler-types";
import {
  getSelectedIndices,
  applyTableFormat,
  applyTableCellFormat,
  updateDocumentContent,
} from "./helpers";

// =============================================================================
// Table Format Handlers
// =============================================================================

export const tableFormatHandlers: HandlerMap = {
  APPLY_TABLE_FORMAT: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "table") {
        return applyTableFormat(element, action.format);
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },

  APPLY_TABLE_CELL_FORMAT: (state, action) => {
    const document = state.documentHistory.present;
    const indices = getSelectedIndices(state.selection.element.selectedIds, document.body.content.length);

    if (indices.length === 0) {
      return state;
    }

    const newDocument = updateDocumentContent(document, indices, (element) => {
      if (element.type === "table") {
        return applyTableCellFormat(element, action.format);
      }
      return element;
    });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, newDocument),
    };
  },
};
