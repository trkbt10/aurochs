/**
 * @file Unified spreadsheet parser
 *
 * Routes to XLS or XLSX parser based on file type detection.
 */

import type { XlsxWorkbook } from "../xlsx/domain/workbook";
import { parseXlsxWorkbook } from "../xlsx/parser";
import { createGetZipTextFileContentFromBytes } from "../files/ooxml-zip";
import { createDefaultStyleSheet } from "../xlsx/domain/style/types";
import { parseXlsWithReport } from "../xls";
import { detectSpreadsheetFileType, type SpreadsheetFileType } from "./detector";

export type SpreadsheetParseMode = "strict" | "lenient";

export type SpreadsheetWarning = {
  readonly fileType: Exclude<SpreadsheetFileType, "unknown">;
  readonly code: string;
  readonly message: string;
  readonly where: string;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
};

export type ParseSpreadsheetOptions = {
  /**
   * Force parsing as a specific file type.
   * If not specified, the file type is detected from content.
   */
  readonly forceType?: SpreadsheetFileType;
  /**
   * Parsing strictness. In lenient mode, parser errors fall back to an empty workbook instead of throwing.
   *
   * Default: "strict"
   */
  readonly mode?: SpreadsheetParseMode;
  /**
   * Optional warning sink for auditing parse fallbacks.
   *
   * XLS warnings are forwarded from `parseXlsWithReport()`. XLSX warnings are emitted only when lenient fallback triggers.
   */
  readonly onWarning?: (warning: SpreadsheetWarning) => void;
};

/**
 * Error thrown when parsing a spreadsheet file fails.
 */
export class SpreadsheetParseError extends Error {
  constructor(
    message: string,
    public readonly fileType: SpreadsheetFileType,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SpreadsheetParseError";
  }
}

/**
 * Parse a spreadsheet file (XLS or XLSX) into a workbook.
 *
 * @param bytes - File content as ArrayBuffer or Uint8Array
 * @param options - Parser options
 * @returns Parsed workbook
 * @throws SpreadsheetParseError if parsing fails
 */
export async function parseSpreadsheetFile(
  bytes: ArrayBuffer | Uint8Array,
  options?: ParseSpreadsheetOptions,
): Promise<XlsxWorkbook> {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const fileType = options?.forceType ?? detectSpreadsheetFileType(data);
  const xlsMode = options?.mode ?? "lenient";
  const xlsxMode = options?.mode ?? "strict";

  if (fileType === "unknown") {
    throw new SpreadsheetParseError(
      "Unknown file format. Expected XLS or XLSX file.",
      fileType,
    );
  }

  if (fileType === "xls") {
    try {
      const parsed = parseXlsWithReport(data, { mode: xlsMode });
      if (options?.onWarning) {
        for (const warning of parsed.warnings) {
          options.onWarning({ fileType: "xls", ...warning });
        }
      }
      return parsed.workbook;
    } catch (cause) {
      throw new SpreadsheetParseError(
        `Failed to parse XLS file: ${cause instanceof Error ? cause.message : String(cause)}`,
        fileType,
        cause,
      );
    }
  }

  // fileType === "xlsx"
  try {
    const getFileContent = await createGetZipTextFileContentFromBytes(data);
    return await parseXlsxWorkbook(getFileContent);
  } catch (cause) {
    if (xlsxMode === "lenient") {
      if (options?.onWarning) {
        options.onWarning({
          fileType: "xlsx",
          code: "XLSX_PARSE_FAILED_FALLBACK",
          where: "parseSpreadsheetFile",
          message: "Failed to parse XLSX; returning an empty workbook as fallback.",
          meta: { error: cause instanceof Error ? cause.message : String(cause) },
        });
      }
      return {
        dateSystem: "1900",
        sheets: [
          {
            dateSystem: "1900",
            name: "Sheet1",
            sheetId: 1,
            state: "visible",
            rows: [],
            xmlPath: "xl/worksheets/sheet1.xml",
          },
        ],
        styles: createDefaultStyleSheet(),
        sharedStrings: [],
      };
    }
    throw new SpreadsheetParseError(
      `Failed to parse XLSX file: ${cause instanceof Error ? cause.message : String(cause)}`,
      fileType,
      cause,
    );
  }
}
