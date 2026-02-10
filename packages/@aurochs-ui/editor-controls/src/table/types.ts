/**
 * @file Table editor formatting types
 *
 * Generic table style band and cell formatting types used by
 * TableStyleBandsEditor and CellFormattingEditor.
 */

import type { BorderEdges } from "../surface/types";

// --- Table style bands ---

export type TableStyleBands = {
  readonly headerRow?: boolean;
  readonly totalRow?: boolean;
  readonly firstColumn?: boolean;
  readonly lastColumn?: boolean;
  readonly bandedRows?: boolean;
  readonly bandedColumns?: boolean;
};

export type TableBandFeatures = {
  /** Show header row toggle. Default: true. */
  readonly showHeaderRow?: boolean;
  /** Show total row toggle. Default: true. */
  readonly showTotalRow?: boolean;
  /** Show first column toggle. Default: true. */
  readonly showFirstColumn?: boolean;
  /** Show last column toggle. Default: true. */
  readonly showLastColumn?: boolean;
  /** Show banded rows toggle. Default: true. */
  readonly showBandedRows?: boolean;
  /** Show banded columns toggle. Default: true. */
  readonly showBandedColumns?: boolean;
};

// --- Cell formatting ---

export type VerticalAlignment = "top" | "center" | "bottom";

export type CellFormatting = {
  /** Vertical alignment of cell content. */
  readonly verticalAlignment?: VerticalAlignment;
  /** Background color as #RRGGBB hex string. */
  readonly backgroundColor?: string;
  /** Text wrapping within cell. */
  readonly wrapText?: boolean;
  /** Per-edge borders. */
  readonly borders?: BorderEdges;
};

export type CellFormattingFeatures = {
  /** Show vertical alignment controls. Default: true. */
  readonly showVerticalAlignment?: boolean;
  /** Show background color control. Default: true. */
  readonly showBackgroundColor?: boolean;
  /** Show text wrapping toggle. Default: false. */
  readonly showWrapText?: boolean;
  /** Show border controls. Default: true. */
  readonly showBorders?: boolean;
};
