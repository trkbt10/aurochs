/**
 * @file Workbook date system (1900/1904)
 *
 * SpreadsheetML workbooks can declare the base date system via `workbookPr/@date1904`.
 * This affects how numeric serial values are interpreted as calendar dates.
 *
 * @see ECMA-376 Part 4, Section 18.2.31 (workbookPr)
 */

export type XlsxDateSystem = "1900" | "1904";

/**
 * Offset (days) to convert a 1904-based serial into the equivalent 1900-based serial.
 *
 * Excel's 1904 system uses 1904-01-01 as day 0. The common conversion is:
 * `serial1900 = serial1904 + 1462`.
 */
export const EXCEL_1904_TO_1900_DAY_OFFSET = 1462;

/**
 * Resolve workbook date system from `workbookPr/@date1904`.
 */
export function resolveXlsxDateSystem(date1904: boolean | undefined): XlsxDateSystem {
  return date1904 ? "1904" : "1900";
}

