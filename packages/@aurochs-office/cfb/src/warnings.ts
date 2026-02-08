/**
 * @file MS-CFB non-strict warnings
 *
 * In non-strict mode, we allow some interoperability fallbacks (e.g. truncated streams).
 * These MUST be surfaced to callers via warnings to avoid silent data corruption.
 */

export type CfbWarningCode =
  | "FAT_CHAIN_INVALID"
  | "FAT_CHAIN_TOO_SHORT"
  | "FAT_CHAIN_LENGTH_MISMATCH"
  | "FAT_SECTOR_READ_FAILED"
  | "MINIFAT_CHAIN_INVALID"
  | "MINIFAT_CHAIN_TOO_SHORT"
  | "MINIFAT_CHAIN_LENGTH_MISMATCH"
  | "MINISTREAM_TRUNCATED";

export type CfbWarning = {
  readonly code: CfbWarningCode;
  readonly where: string;
  readonly message: string;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
};

export type CfbWarningSink = (warning: CfbWarning) => void;

/** Emit a warning in non-strict mode, or throw `strictError` in strict mode. */
export function warnCfbOrThrow(
  opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink },
  warning: CfbWarning,
  strictError: Error,
): void {
  if (opts.strict) {
    throw strictError;
  }
  if (!opts.onWarning) {
    throw new Error(`non-strict CFB mode requires onWarning sink: ${warning.code} (${warning.where})`);
  }
  opts.onWarning(warning);
}
