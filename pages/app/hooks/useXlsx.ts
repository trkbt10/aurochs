/**
 * @file XLSX loading hook for the pages app.
 */

import { useCallback } from "react";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { detectSpreadsheetFileType, parseXlsWithReport } from "@aurochs-office/xls";
import { createGetZipTextFileContentFromBytes } from "@aurochs-office/opc";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";
import { useFileLoader } from "./useFileLoader";

async function parseWorkbookFromFile(file: File): Promise<XlsxWorkbook> {
  const data = new Uint8Array(await file.arrayBuffer());
  const fileType = detectSpreadsheetFileType(data);
  if (fileType === "unknown") {
    throw new Error("Unknown file format. Expected XLS or XLSX file.");
  }

  if (fileType === "xls") {
    const parsed = parseXlsWithReport(data, { mode: "lenient" });
    return parsed.workbook;
  }

  const getFileContent = await createGetZipTextFileContentFromBytes(data);
  return await parseXlsxWorkbook(getFileContent);
}

/**
 * Manage XLSX/XLS loading state for the pages app.
 */
export function useXlsx() {
  const { load, data, ...rest } = useFileLoader<XlsxWorkbook>("Failed to load spreadsheet");

  const loadFromFile = useCallback(
    (file: File) => load(file.name, () => parseWorkbookFromFile(file)),
    [load],
  );

  return {
    ...rest,
    workbook: data,
    loadFromFile,
  };
}
