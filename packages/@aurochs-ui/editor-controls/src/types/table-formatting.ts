/**
 * @file Table style band flags
 *
 * Uses positive semantics (true = enabled).
 * DOCX noHBand/noVBand are inverted by the DOCX adapter.
 */

export type TableStyleBands = {
  readonly headerRow?: boolean;
  readonly totalRow?: boolean;
  readonly firstColumn?: boolean;
  readonly lastColumn?: boolean;
  readonly bandedRows?: boolean;
  readonly bandedColumns?: boolean;
};
