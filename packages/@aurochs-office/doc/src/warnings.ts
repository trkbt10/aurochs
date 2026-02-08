/**
 * @file DOC parse/conversion warnings
 */

export type DocWarningCode =
  | "DOC_PARSE_FAILED_FALLBACK"
  | "CFB_NON_STRICT_RETRY"
  | "CFB_FAT_CHAIN_INVALID"
  | "CFB_FAT_CHAIN_TOO_SHORT"
  | "CFB_FAT_CHAIN_LENGTH_MISMATCH"
  | "CFB_FAT_SECTOR_READ_FAILED"
  | "CFB_MINIFAT_CHAIN_INVALID"
  | "CFB_MINIFAT_CHAIN_TOO_SHORT"
  | "CFB_MINIFAT_CHAIN_LENGTH_MISMATCH"
  | "CFB_MINISTREAM_TRUNCATED"
  | "DOC_STREAM_NOT_FOUND"
  | "DOC_FIB_INVALID"
  | "DOC_PIECE_TABLE_INVALID"
  | "DOC_TEXT_DECODE_FAILED"
  | "DOC_PARAGRAPH_PARSE_FAILED"
  | "DOC_CHAR_PROP_PARSE_FAILED";

export type DocWarning = {
  readonly code: DocWarningCode;
  readonly message: string;
  readonly where: string;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
};

export type DocWarningSink = (warning: DocWarning) => void;

/** Create a warning sink that collects warnings in an array. */
export function createDocWarningCollector(): { readonly warn: DocWarningSink; readonly warnings: readonly DocWarning[] } {
  const warnings: DocWarning[] = [];
  return {
    warn: (warning) => {
      warnings.push(warning);
    },
    warnings,
  };
}
