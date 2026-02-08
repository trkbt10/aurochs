/**
 * @file StyleSheet mutation helpers (SpreadsheetML)
 *
 * Utilities for creating/reusing fonts/fills/borders/numFmts/cellXfs when
 * building new styleId values for edited cell formatting.
 */

export type {
  UpsertBorderResult,
  UpsertCellXfResult,
  UpsertFillResult,
  UpsertFontResult,
  UpsertNumberFormatResult,
} from "./mutation/upsert";

export {
  upsertBorder,
  upsertCellXf,
  upsertCustomNumberFormat,
  upsertFill,
  upsertFont,
  useBuiltinNumberFormat,
} from "./mutation/upsert";
