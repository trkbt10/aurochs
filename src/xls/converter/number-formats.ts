/**
 * @file XLS FORMAT → XLSX numberFormats mapping
 */

import type { XlsxNumberFormat } from "../../xlsx/domain/style/number-format";
import { numFmtId } from "../../xlsx/domain/types";
import type { XlsNumberFormat } from "../domain/types";

/** Convert XLS FORMAT records into XLSX custom number format entries. */
export function convertXlsNumberFormatsToXlsxNumberFormats(formats: readonly XlsNumberFormat[]): readonly XlsxNumberFormat[] {
  if (!Array.isArray(formats)) {
    throw new Error("convertXlsNumberFormatsToXlsxNumberFormats: formats must be an array");
  }

  // In both BIFF and SpreadsheetML, custom formats generally live at IDs >= 164.
  return formats
    .filter((f) => f.formatIndex >= 164)
    .map((f) => ({ numFmtId: numFmtId(f.formatIndex), formatCode: f.formatCode }));
}
