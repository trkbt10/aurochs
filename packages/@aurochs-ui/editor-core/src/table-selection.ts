/**
 * @file Table cell selection and grid utilities
 *
 * Generic types and utilities for table cell selection and grid display.
 * Format-agnostic — works with any table structure.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Position of a cell in a table grid.
 */
export type CellPosition = {
  readonly row: number;
  readonly col: number;
};

/**
 * Minimal table row interface for grid display.
 */
export type TableRowLike = {
  /** Row height (optional, for dimension editors) */
  readonly height?: number;
  /** Cells in the row */
  readonly cells: readonly { readonly text?: string }[];
};

/**
 * Minimal table column interface for grid display.
 */
export type TableColumnLike = {
  /** Column width (optional, for dimension editors) */
  readonly width?: number;
};

/**
 * Minimal table grid interface for grid display.
 */
export type TableGridLike = {
  readonly columns: readonly TableColumnLike[];
};

// =============================================================================
// Column Letter Generation
// =============================================================================

/**
 * Generate column letter (A, B, C, ... Z, AA, AB, ...) from 0-based index.
 */
export function getColumnLetter(index: number): string {
  const buildLetter = (n: number, acc: string): string => {
    if (n < 0) {
      return acc;
    }
    const char = String.fromCharCode((n % 26) + 65);
    return buildLetter(Math.floor(n / 26) - 1, char + acc);
  };
  return buildLetter(index, "");
}

// =============================================================================
// Cell Preview
// =============================================================================

/**
 * Get preview text from a cell, truncated to maxLength.
 */
export function getCellPreviewText(text: string | undefined, maxLength: number = 10): string {
  if (!text) { return ""; }
  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength) + "…";
  }
  return trimmed;
}
