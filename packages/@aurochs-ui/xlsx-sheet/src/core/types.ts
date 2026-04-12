/**
 * @file Shared types for core sheet grid rendering components
 *
 * These types define the props contract that both the editor and viewer
 * consume. Core components are context-free and take all data via props.
 */

import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FormulaEvaluator } from "@aurochs-office/xlsx/formula/evaluator";
import type { SheetLayout } from "../selectors/sheet-layout";
import type { NormalizedMergeRange } from "../sheet/merge-range";

/**
 * Visible range of rows or columns (0-based indices, inclusive).
 */
export type VisibleRange = {
  readonly start: number;
  readonly end: number;
};

/**
 * Common props shared across core grid rendering components.
 *
 * These represent the minimum data needed to render cells, gridlines,
 * borders, and drawings in the sheet viewport.
 */
export type CoreSheetRenderProps = {
  /** 0-based index of the sheet within the workbook */
  readonly sheetIndex: number;
  /** The worksheet to render */
  readonly sheet: XlsxWorksheet;
  /** Workbook stylesheet for resolving cell formats */
  readonly styles: XlsxStyleSheet;
  /** Pre-computed sheet layout (row/column positions and sizes) */
  readonly layout: SheetLayout;
  /** Visible row range (0-based, inclusive) */
  readonly rowRange: VisibleRange;
  /** Visible column range (0-based, inclusive) */
  readonly colRange: VisibleRange;
  /** Current vertical scroll offset in pixels (unscaled) */
  readonly scrollTop: number;
  /** Current horizontal scroll offset in pixels (unscaled) */
  readonly scrollLeft: number;
  /** Normalized merge cell ranges for the sheet */
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  /** Formula evaluator for computing formula cell display values */
  readonly formulaEvaluator: FormulaEvaluator;
  /** Theme color scheme for resolving theme-based colors */
  readonly colorScheme?: ColorScheme;
};

// =============================================================================
// Grid Metrics
// =============================================================================

/**
 * Grid metrics that control cell sizing and header dimensions.
 *
 * This is the single source of truth for grid metrics.
 * Both the editor and viewer use these values (or overrides based on them).
 */
export type SheetGridMetrics = {
  /** Number of rows to render in the virtual grid */
  readonly rowCount: number;
  /** Number of columns to render in the virtual grid */
  readonly colCount: number;
  /** Default row height in pixels */
  readonly rowHeightPx: number;
  /** Default column width in pixels */
  readonly colWidthPx: number;
  /** Width of the row header gutter (row numbers) in pixels */
  readonly rowHeaderWidthPx: number;
  /** Height of the column header gutter (A, B, C...) in pixels */
  readonly colHeaderHeightPx: number;
};

/**
 * Default grid metrics — single source of truth.
 *
 * Row height and column width are derived from ECMA-376 defaults:
 * - Default row height: 15pt → 15 × (96/72) = 20px
 * - Default column width: 8.43 characters → 8.43 × 7 + 5 ≈ 64px
 *
 * Header dimensions follow Excel's UI conventions.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.81 (sheetFormatPr: defaultRowHeight)
 * @see ECMA-376 Part 4, Section 18.3.1.81 (sheetFormatPr: defaultColWidth)
 */
export const DEFAULT_SHEET_GRID_METRICS: SheetGridMetrics = {
  rowCount: 100,
  colCount: 26,
  rowHeightPx: 20,
  colWidthPx: 64,
  rowHeaderWidthPx: 46,
  colHeaderHeightPx: 20,
};

// =============================================================================
// Viewport Dimensions
// =============================================================================

/**
 * Viewport dimensions for gridline and border rendering.
 */
export type ViewportDimensions = {
  /** Total number of rows in the grid */
  readonly rowCount: number;
  /** Total number of columns in the grid */
  readonly colCount: number;
  /** Viewport width in pixels (unscaled) */
  readonly viewportWidth: number;
  /** Viewport height in pixels (unscaled) */
  readonly viewportHeight: number;
};
