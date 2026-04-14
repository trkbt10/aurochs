/**
 * @file @aurochs-converters/interop-dsv-xlsx
 *
 * Bidirectional conversion between DSV (CSV/TSV) and XLSX formats.
 *
 * ## DSV → XLSX
 *
 * ```typescript
 * import { parseDsv } from "@aurochs/dsv";
 * import { convertDsvToXlsx } from "@aurochs-converters/interop-dsv-xlsx";
 *
 * const doc = parseDsv(csvText, { hasHeaders: true });
 * const result = convertDsvToXlsx(doc, { sheetName: "Data" });
 * // result.data is an XlsxWorkbook
 * ```
 *
 * ## XLSX → DSV
 *
 * ```typescript
 * import { convertXlsxToDsv } from "@aurochs-converters/interop-dsv-xlsx";
 * import { buildDsv } from "@aurochs/dsv";
 *
 * const result = convertXlsxToDsv(workbook, { sheetIndex: 0 });
 * const csvText = buildDsv(result.data);
 * ```
 */

export { convertDsvToXlsx } from "./dsv-to-xlsx";
export type { DsvToXlsxOptions } from "./dsv-to-xlsx";

export { convertXlsxToDsv } from "./xlsx-to-dsv";
export type { XlsxToDsvOptions } from "./xlsx-to-dsv";
