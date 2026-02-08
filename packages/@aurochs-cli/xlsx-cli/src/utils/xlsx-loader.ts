/**
 * @file XLSX workbook loader utility
 *
 * Wraps the comprehensive XLSX parser with file loading logic.
 */

import * as fs from "node:fs/promises";
import { loadZipPackage } from "@aurochs/zip";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";
import type { XlsxParseOptions } from "@aurochs-office/xlsx/parser";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";

export type LoadXlsxOptions = {
  /** Include rich text formatting in shared strings */
  readonly includeRichText?: boolean;
};

/**
 * Load and parse an XLSX file using the comprehensive parser.
 *
 * @param filePath - Path to the XLSX file
 * @param options - Parse options
 * @returns Parsed XlsxWorkbook with full P0 support (styles, formulas, merged cells, etc.)
 */
export async function loadXlsxWorkbook(filePath: string, options?: LoadXlsxOptions): Promise<XlsxWorkbook> {
  const buffer = await fs.readFile(filePath);
  const pkg = await loadZipPackage(buffer);

  const getFileContent = async (path: string): Promise<string | undefined> => {
    return pkg.readText(path) ?? undefined;
  };

  const parseOptions: XlsxParseOptions = {
    includeRichText: options?.includeRichText,
  };

  return parseXlsxWorkbook(getFileContent, parseOptions);
}
