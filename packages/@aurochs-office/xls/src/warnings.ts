/**
 * @file XLS parse/conversion warnings
 *
 * In lenient mode, we do not silently "fix up" invalid inputs. Instead, we emit warnings
 * describing the fallback behavior so callers can audit quality and tests can enforce it.
 */

export type XlsWarningCode =
  | "XLS_PARSE_FAILED_FALLBACK"
  | "CFB_NON_STRICT_RETRY"
  | "CFB_FAT_CHAIN_INVALID"
  | "CFB_FAT_CHAIN_TOO_SHORT"
  | "CFB_FAT_CHAIN_LENGTH_MISMATCH"
  | "CFB_FAT_SECTOR_READ_FAILED"
  | "CFB_MINIFAT_CHAIN_INVALID"
  | "CFB_MINIFAT_CHAIN_TOO_SHORT"
  | "CFB_MINIFAT_CHAIN_LENGTH_MISMATCH"
  | "CFB_MINISTREAM_TRUNCATED"
  | "XLS_RAW_BIFF_FALLBACK"
  | "BIFF_SUBSTREAM_TRUNCATED"
  | "BOF_TRUNCATED"
  | "DATEMODE_NON_BOOLEAN"
  | "BOUNDSHEET_UNKNOWN_TYPE"
  | "BOUNDSHEET_UNKNOWN_HIDDEN_STATE"
  | "BOUNDSHEET_NAME_FALLBACK_LEGACY"
  | "FORMULA_CACHED_STRING_MISSING_STRING_RECORD"
  | "FORMULA_CCE_TRUNCATED"
  | "FORMULA_CONVERSION_FAILED"
  | "STRING_CONTINUE_TRUNCATED"
  | "SST_TRUNCATED"
  | "STYLE_DUPLICATE_NAME"
  | "STYLE_MISSING_STYLE_XF"
  | "STYLE_EMPTY_NAME"
  | "STYLE_NAME_FALLBACK_LEGACY"
  | "XF_INDEX_OUT_OF_RANGE"
  | "FONT_INDEX_OUT_OF_RANGE"
  | "FONT_NAME_FALLBACK_LEGACY"
  | "BORDER_STYLE_UNSUPPORTED"
  | "FILL_PATTERN_UNSUPPORTED"
  | "PALETTE_COUNT_MISMATCH"
  | "MERGECELLS_COUNT_MISMATCH"
  | "MULBLANK_COLLAST_MISMATCH"
  | "MULRK_COLLAST_MISMATCH";

export type XlsWarning = {
  readonly code: XlsWarningCode;
  readonly message: string;
  readonly where: string;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
};

export type XlsWarningSink = (warning: XlsWarning) => void;

/** Create a warning sink that collects warnings in an array (for reporting/testing). */
export function createXlsWarningCollector(): { readonly warn: XlsWarningSink; readonly warnings: readonly XlsWarning[] } {
  const warnings: XlsWarning[] = [];
  return {
    warn: (warning) => {
      warnings.push(warning);
    },
    warnings,
  };
}
