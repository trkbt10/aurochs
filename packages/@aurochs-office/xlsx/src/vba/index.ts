/**
 * @file Excel VBA Host Adapter exports
 *
 * Provides VBA runtime integration for Excel (XLSX) documents.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

export { createExcelHostAdapter, createExcelAdapterState } from "./adapter";
export type { ExcelAdapterState } from "./adapter";
export type {
  ExcelHostObject,
  ExcelApplicationObject,
  ExcelWorkbookObject,
  ExcelWorksheetObject,
  ExcelRangeObject,
  ExcelWorksheetsObject,
} from "./types";
export {
  isApplicationObject,
  isWorkbookObject,
  isWorksheetObject,
  isRangeObject,
  isWorksheetsObject,
} from "./types";
