/**
 * @file XLS module public API
 */

export { parseXls, parseXlsWithReport, type ParseXlsOptions, type ParseXlsResult } from "./parser";
export { convertXlsToXlsx } from "./converter";
export { extractXlsWorkbook } from "./extractor";
export type { XlsWorkbook } from "./domain/types";
export { detectSpreadsheetFileType, type SpreadsheetFileType } from "./spreadsheet-file-type";
