/**
 * @file DOCX Table Module
 *
 * Exports table mutation utilities for the DOCX editor.
 */

export {
  appendCellContent,
  appendColumn,
  appendRow,
  clearCellBorders,
  createTable,
  createTableCell,
  createTableRow,
  getCell,
  getColumnCount,
  getRowCount,
  getTableGridColumns,
  insertColumn,
  insertRow,
  isTableEmpty,
  mergeCellProperties,
  mergeCellsHorizontally,
  mergeCellsVertically,
  mergeRowProperties,
  mergeTableProperties,
  removeCellProperty,
  removeColumn,
  removeRow,
  setCell,
  setCellBorders,
  setCellContent,
  setCellProperties,
  setCellVerticalMerge,
  setColumnWidth,
  setRow,
  setRowProperties,
  setTableAlignment,
  setTableBorders,
  setTableGrid,
  setTableLook,
  setTableProperties,
  setTableWidth,
} from "./mutation";
