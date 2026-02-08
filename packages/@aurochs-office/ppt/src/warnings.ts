/**
 * @file PPT parse/conversion warnings
 */

export type PptWarningCode =
  | "PPT_PARSE_FAILED_FALLBACK"
  | "CFB_NON_STRICT_RETRY"
  | "CFB_FAT_CHAIN_INVALID"
  | "CFB_FAT_CHAIN_TOO_SHORT"
  | "CFB_FAT_CHAIN_LENGTH_MISMATCH"
  | "CFB_FAT_SECTOR_READ_FAILED"
  | "CFB_MINIFAT_CHAIN_INVALID"
  | "CFB_MINIFAT_CHAIN_TOO_SHORT"
  | "CFB_MINIFAT_CHAIN_LENGTH_MISMATCH"
  | "CFB_MINISTREAM_TRUNCATED"
  | "PPT_STREAM_NOT_FOUND"
  | "PPT_CURRENT_USER_MISSING"
  | "PPT_PERSIST_OFFSET_INVALID"
  | "PPT_RECORD_TRUNCATED"
  | "PPT_UNKNOWN_RECORD_SKIPPED"
  | "PPT_SLIDE_PARSE_FAILED"
  | "PPT_TEXT_DECODE_FAILED"
  | "PPT_SHAPE_PARSE_FAILED"
  | "PPT_PICTURE_PARSE_FAILED"
  | "PPT_COLOR_RESOLVE_FAILED"
  | "PPT_HYPERLINK_RESOLVE_FAILED"
  | "PPT_TABLE_PARSE_FAILED"
  | "PPT_CHART_PARSE_FAILED"
  | "PPT_NOTES_PARSE_FAILED";

export type PptWarning = {
  readonly code: PptWarningCode;
  readonly message: string;
  readonly where: string;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
};

export type PptWarningSink = (warning: PptWarning) => void;

/** Create a warning sink that collects warnings in an array. */
export function createPptWarningCollector(): { readonly warn: PptWarningSink; readonly warnings: readonly PptWarning[] } {
  const warnings: PptWarning[] = [];
  return {
    warn: (warning) => {
      warnings.push(warning);
    },
    warnings,
  };
}
