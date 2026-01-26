/**
 * @file Spreadsheet file type detection
 *
 * Content-based detection using file signatures (magic bytes).
 */

import { CFB_SIGNATURE } from "../cfb/constants";

/** ZIP signature for XLSX (OOXML) files */
const ZIP_SIGNATURE = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

export type SpreadsheetFileType = "xls" | "xlsx" | "unknown";

function matchesSignature(bytes: Uint8Array, signature: Uint8Array): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Detect spreadsheet file type from file content.
 *
 * Uses magic bytes to identify the format:
 * - CFB signature (D0 CF 11 E0 A1 B1 1A E1) → XLS (BIFF)
 * - ZIP signature (50 4B 03 04) → XLSX (OOXML)
 *
 * @param bytes - File content as Uint8Array
 * @returns Detected file type
 */
export function detectSpreadsheetFileType(bytes: Uint8Array): SpreadsheetFileType {
  if (bytes.length < 4) {
    return "unknown";
  }

  if (matchesSignature(bytes, CFB_SIGNATURE)) {
    return "xls";
  }

  if (matchesSignature(bytes, ZIP_SIGNATURE)) {
    return "xlsx";
  }

  return "unknown";
}
