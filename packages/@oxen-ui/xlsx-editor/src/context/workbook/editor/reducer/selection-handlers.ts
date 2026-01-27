/**
 * @file Selection handlers
 *
 * Handlers for cell selection operations.
 *
 * Note: Selection is UI-only state and should not affect workbookHistory.
 */

import type { HandlerMap } from "./handler-types";
import {
  createSingleCellSelection,
  createRangeSelection,
  extendSelection,
  addRangeToSelection,
  clearSelection,
} from "../../state/selection";

function selectCellWithExtend(
  state: { readonly cellSelection: Parameters<typeof extendSelection>[0] },
  action: { readonly extend?: boolean; readonly address: Parameters<typeof createSingleCellSelection>[0] },
): ReturnType<typeof createSingleCellSelection> {
  if (action.extend) {
    return extendSelection(state.cellSelection, action.address);
  }
  return createSingleCellSelection(action.address);
}

export const selectionHandlers: HandlerMap = {
  SELECT_CELL: (state, action) => {
    return {
      ...state,
      cellSelection: selectCellWithExtend(state, action),
    };
  },
  SELECT_RANGE: (state, action) => {
    return {
      ...state,
      cellSelection: createRangeSelection(action.range),
    };
  },
  EXTEND_SELECTION: (state, action) => {
    return {
      ...state,
      cellSelection: extendSelection(state.cellSelection, action.toAddress),
    };
  },
  ADD_RANGE_TO_SELECTION: (state, action) => {
    return {
      ...state,
      cellSelection: addRangeToSelection(state.cellSelection, action.range),
    };
  },
  CLEAR_SELECTION: (state) => {
    return {
      ...state,
      cellSelection: clearSelection(),
    };
  },
};
