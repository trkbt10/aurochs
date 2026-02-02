/**
 * @file Page break domain types
 *
 * Defines types for row and column page breaks in worksheets.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.72 (rowBreaks)
 * @see ECMA-376 Part 4, Section 18.3.1.14 (colBreaks)
 * @see ECMA-376 Part 4, Section 18.3.1.9 (brk)
 */

/**
 * Individual page break definition.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.9 (brk)
 */
export type XlsxPageBreak = {
  /** The row or column index where the break occurs (1-based) */
  readonly id: number;
  /** Maximum row/column to which the break applies */
  readonly max?: number;
  /** Minimum row/column from which the break applies */
  readonly min?: number;
  /** Whether this is a manual page break (true) or automatic (false) */
  readonly manual?: boolean;
  /** Whether this page break is a preview break (page break preview mode) */
  readonly pt?: boolean;
};

/**
 * Collection of page breaks for a worksheet.
 */
export type XlsxPageBreaks = {
  /** Row page breaks (horizontal breaks) */
  readonly rowBreaks: readonly XlsxPageBreak[];
  /** Column page breaks (vertical breaks) */
  readonly colBreaks: readonly XlsxPageBreak[];
};
