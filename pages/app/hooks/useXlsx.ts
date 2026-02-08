/**
 * @file XLSX loading hook for the pages app.
 */

import { useState, useCallback } from "react";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { detectSpreadsheetFileType, parseXlsWithReport } from "@aurochs-office/xls";
import { createGetZipTextFileContentFromBytes } from "@aurochs-office/opc";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";

export type XlsxState = {
  status: "idle" | "loading" | "loaded" | "error";
  workbook: XlsxWorkbook | null;
  fileName: string | null;
  error: string | null;
};

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
  const [state, setState] = useState<XlsxState>({
    status: "idle",
    workbook: null,
    fileName: null,
    error: null,
  });

  const loadFromFile = useCallback(async (file: File) => {
    setState({ status: "loading", workbook: null, fileName: file.name, error: null });

    try {
      const workbook = await parseWorkbookFromFile(file);
      setState({ status: "loaded", workbook, fileName: file.name, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load spreadsheet";
      setState({ status: "error", workbook: null, fileName: file.name, error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", workbook: null, fileName: null, error: null });
  }, []);

  return {
    ...state,
    loadFromFile,
    reset,
  };
}
