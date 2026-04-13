/**
 * @file PDF document domain
 *
 * Exports types and operations for PDF document structure.
 */

export type { PdfElement, PdfPage, PdfDocument, PdfEmbeddedFont, PdfFontToUnicode, PdfFontMetrics, PdfTable, PdfTableRow, PdfTableCell } from "./types";

export { PDF_UNITS, PDF_PAGE_SIZES, isPdfPath, isPdfText, isPdfTextBlock, isPdfImage, isPdfTable } from "./types";

// Element addressing
export type { PdfElementId } from "./element-id";
export { createElementId, parseElementId } from "./element-id";

// Element transformation
export { getElementRotationRad, getElementRotationDeg, rotateElement, moveElement, scaleElement } from "./element-transform";

// Document mutation
export {
  updateElementInDocument,
  deleteElements,
  addElementsToPage,
  addPage,
  deletePages,
  duplicatePages,
  reorderPages,
  updatePageSize,
} from "./document-mutation";

// Table mutation
export {
  createTableCell,
  insertRow,
  removeRow,
  insertColumn,
  removeColumn,
  setColumnWidth,
  setRowHeight,
  mergeCells,
  splitCell,
  type TableCellRange,
} from "./table-mutation";
