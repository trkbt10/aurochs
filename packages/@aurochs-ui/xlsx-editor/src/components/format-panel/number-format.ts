/**
 * @file Number format helpers (format panel)
 *
 * Builds small formatCode strings compatible with SpreadsheetML `numFmt` / `formatCode`.
 */

/**
 * Build a simple decimal number format (e.g. `0.00`, `#,##0.00`).
 */
export function buildDecimalFormat(params: { readonly decimals: number; readonly thousands: boolean }): string {
  const decimals = Math.max(0, Math.min(20, Math.trunc(params.decimals)));
  const base = params.thousands ? "#,##0" : "0";
  if (decimals === 0) {
    return base;
  }
  return `${base}.${"0".repeat(decimals)}`;
}

/**
 * Build a scientific number format (e.g. `0.00E+00`).
 */
export function buildScientificFormat(params: { readonly significantDigits: number }): string {
  const digits = Math.max(1, Math.min(15, Math.trunc(params.significantDigits)));
  const decimals = Math.max(0, digits - 1);
  return `0${decimals === 0 ? "" : `.${"0".repeat(decimals)}`}E+00`;
}
