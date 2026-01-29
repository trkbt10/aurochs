/**
 * @file State management exports
 *
 * Re-exports all state management functions for worksheet editing.
 */

export {
  createSingleCellSelection,
  createRangeSelection,
  extendSelection,
  addRangeToSelection,
  getAllSelectedRanges,
  isCellSelected,
  isSelectionEmpty,
  isSingleCellSelection,
  clearSelection,
} from "./selection";

export {
  isDragIdle,
  isDragRangeSelect,
  isDragFill,
  isDragRowResize,
  isDragColumnResize,
  startRangeSelectDrag,
  updateRangeSelectDrag,
  getRangeSelectRange,
  startFillDrag,
  updateFillDrag,
  startRowResizeDrag,
  calculateRowResizeHeight,
  startColumnResizeDrag,
  calculateColumnResizeWidth,
  endDrag,
  isDragging,
} from "./drag";
