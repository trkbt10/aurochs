/**
 * @file Sparkline domain types
 *
 * Defines types for sparkline mini-charts in worksheets.
 * Sparklines are small inline charts that display data trends in cells.
 *
 * @see ECMA-376 Part 4, Section 18.x14 (Sparklines - Extension)
 * @see MS-XLSX Extension Part
 */

import type { XlsxColor } from "./style/font";

/**
 * Individual sparkline definition.
 *
 * Links a data range to a display cell.
 */
export type XlsxSparkline = {
  /** Data source range reference (e.g., "Sheet1!A1:A10") */
  readonly f: string;
  /** Display cell reference (e.g., "B1") */
  readonly sqref: string;
};

/**
 * Sparkline type.
 */
export type XlsxSparklineType = "line" | "column" | "stacked";

/**
 * Axis display options for sparklines.
 */
export type XlsxSparklineAxisOptions = {
  /** Minimum axis value type */
  readonly minAxisType?: "individual" | "group" | "custom";
  /** Maximum axis value type */
  readonly maxAxisType?: "individual" | "group" | "custom";
  /** Custom minimum value */
  readonly manualMin?: number;
  /** Custom maximum value */
  readonly manualMax?: number;
  /** Whether to display axis */
  readonly displayXAxis?: boolean;
  /** Right-to-left display */
  readonly rightToLeft?: boolean;
};

/**
 * Sparkline group containing multiple sparklines with shared settings.
 *
 * All sparklines in a group share the same visual appearance settings.
 */
export type XlsxSparklineGroup = {
  /** Sparkline chart type */
  readonly type: XlsxSparklineType;
  /** Individual sparklines in this group */
  readonly sparklines: readonly XlsxSparkline[];
  /** Series line/fill color */
  readonly colorSeries?: XlsxColor;
  /** Negative value color */
  readonly colorNegative?: XlsxColor;
  /** Axis color */
  readonly colorAxis?: XlsxColor;
  /** Marker color */
  readonly colorMarkers?: XlsxColor;
  /** First point marker color */
  readonly colorFirst?: XlsxColor;
  /** Last point marker color */
  readonly colorLast?: XlsxColor;
  /** High point marker color */
  readonly colorHigh?: XlsxColor;
  /** Low point marker color */
  readonly colorLow?: XlsxColor;
  /** Whether to highlight first point */
  readonly first?: boolean;
  /** Whether to highlight last point */
  readonly last?: boolean;
  /** Whether to highlight high point */
  readonly high?: boolean;
  /** Whether to highlight low point */
  readonly low?: boolean;
  /** Whether to highlight negative values */
  readonly negative?: boolean;
  /** Whether to show markers (for line sparklines) */
  readonly markers?: boolean;
  /** Line weight in points */
  readonly lineWeight?: number;
  /** Display hidden/empty cells as */
  readonly displayEmptyCellsAs?: "gap" | "zero" | "span";
  /** Whether to display hidden cells */
  readonly displayHidden?: boolean;
  /** Axis options */
  readonly axisOptions?: XlsxSparklineAxisOptions;
  /** Date axis reference range */
  readonly dateAxis?: string;
};
