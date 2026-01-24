/**
 * @file XLS parser entry point
 */

import { CfbFormatError, openCfb } from "../cfb";
import type { XlsxWorkbook } from "../xlsx/domain/workbook";
import { parseWorkbookStream } from "./biff/workbook-stream";
import { convertXlsToXlsx } from "./converter";
import { extractXlsWorkbook } from "./extractor";

function readWorkbookStreamFromCfb(bytes: Uint8Array): Uint8Array {
  const cfb = openCfb(bytes);
  try {
    return cfb.readStream(["Workbook"]);
  } catch (err) {
    if (err instanceof CfbFormatError && err.message.includes("Path not found")) {
      return cfb.readStream(["Book"]);
    }
    throw err;
  }
}

export function parseXls(bytes: Uint8Array): XlsxWorkbook {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseXls: bytes must be a Uint8Array");
  }

  const workbookStreamBytes = readWorkbookStreamFromCfb(bytes);
  const parsed = parseWorkbookStream(workbookStreamBytes);
  const xls = extractXlsWorkbook(parsed);
  return convertXlsToXlsx(xls);
}
