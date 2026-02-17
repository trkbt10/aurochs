/**
 * @file Row/Column mutation operations
 *
 * Re-exports all row and column mutation operations from their respective modules.
 *
 * This file provides backward compatibility for existing imports.
 * New code should import directly from:
 * - ./row-mutation for row operations
 * - ./column-mutation for column operations
 * - ./cell-range-utils for utilities
 */

// Row operations
export {
  insertRows,
  deleteRows,
  setRowHeight,
  hideRows,
  unhideRows,
  setRowOutlineLevel,
  groupRows,
  ungroupRows,
  setRowCollapsed,
} from "./row-mutation";

// Column operations
export {
  insertColumns,
  deleteColumns,
  setColumnWidth,
  hideColumns,
  unhideColumns,
  setColumnOutlineLevel,
  groupColumns,
  ungroupColumns,
  setColumnCollapsed,
} from "./column-mutation";
