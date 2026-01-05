/**
 * @file Chart rendering types
 *
 * Common types used across chart rendering modules.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { DataLabels, Trendline, ErrorBars, ChartLines } from "../../../domain/chart";
import type { MultiLevelCategories } from "./data";

/**
 * Data point for chart rendering
 */
export type DataPoint = {
  readonly x: number | string;
  readonly y: number;
  /**
   * Bubble size for bubble charts
   * @see ECMA-376 Part 1, Section 21.2.2.22 (bubbleSize)
   */
  readonly bubbleSize?: number;
  /**
   * Per-point color override from dPt styling
   * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt)
   */
  readonly colorOverride?: string;
};

/**
 * Data point styling from dPt
 * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt)
 */
export type DataPointStyle = {
  readonly idx: number;
  readonly colorOverride?: string;
};

/**
 * Series data for chart rendering
 */
export type SeriesData = {
  readonly key: string;
  readonly values: readonly DataPoint[];
  readonly xlabels?: Record<string, string>;
  /** Per-point style overrides from dPt elements */
  readonly pointStyles?: readonly DataPointStyle[];
  /**
   * Trendlines for this series
   * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
   */
  readonly trendlines?: readonly Trendline[];
  /**
   * Error bars for this series
   * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
   */
  readonly errorBars?: readonly ErrorBars[];
};

/**
 * Value axis configuration extracted from axes
 */
export type ValueAxisConfig = {
  readonly min?: number;
  readonly max?: number;
  readonly majorUnit?: number;
  readonly crosses?: "autoZero" | "max" | "min";
};

/**
 * Chart content result (inner SVG content without wrapper)
 */
export type ChartContent = {
  readonly content: string;
  readonly seriesData: readonly SeriesData[];
  readonly valueRange?: { minVal: number; maxVal: number };
  readonly colors: readonly string[];
  /** Category labels for X-axis display */
  readonly categoryLabels?: readonly string[];
  /**
   * Multi-level category labels for hierarchical X-axis display
   * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
   */
  readonly multiLevelCategories?: MultiLevelCategories;
  /** Chart type for data label positioning */
  readonly chartType?: "bar" | "line" | "pie" | "scatter" | "area" | "stock" | "bubble";
  /** Whether bar chart is horizontal */
  readonly isHorizontal?: boolean;
  /** Data labels configuration from chart series */
  readonly dataLabels?: DataLabels;
  /**
   * X-axis value range for scatter charts (uses two value axes)
   * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
   */
  readonly xValueRange?: { minVal: number; maxVal: number };
};

/**
 * Chart layout result
 */
export type ChartLayout = {
  readonly plotLeft: number;
  readonly plotTop: number;
  readonly plotWidth: number;
  readonly plotHeight: number;
  readonly legendPos?: { x: number; y: number };
};

/**
 * Bar chart configuration
 */
export type BarChartConfig = {
  readonly barDir: "bar" | "col";
  readonly grouping: "clustered" | "stacked" | "percentStacked" | "standard";
};

/**
 * Line chart configuration
 */
export type LineChartConfig = {
  /**
   * Whether to use smooth curve interpolation
   * @see ECMA-376 Part 1, Section 21.2.2.185 (smooth)
   */
  readonly smooth?: boolean;
  /**
   * Whether to show data point markers
   * @see ECMA-376 Part 1, Section 21.2.2.97 (marker)
   */
  readonly marker?: boolean;
  /**
   * Drop lines from data points to category axis
   * @see ECMA-376 Part 1, Section 21.2.2.53 (dropLines)
   */
  readonly dropLines?: ChartLines;
  /**
   * Hi-Low lines connecting high and low values
   * @see ECMA-376 Part 1, Section 21.2.2.75 (hiLowLines)
   */
  readonly hiLowLines?: ChartLines;
};

/**
 * Pie chart configuration
 */
export type PieChartConfig = {
  /** First slice start angle in degrees (0-360), per ECMA-376 21.2.2.54 */
  readonly firstSliceAng?: number;
  /** Hole size for doughnut (0-90 percent), per ECMA-376 21.2.2.72 */
  readonly holeSize?: number;
  /**
   * Whether each slice gets a different color
   * @see ECMA-376 Part 1, Section 21.2.2.230 (varyColors)
   * Default is true for pie charts
   */
  readonly varyColors?: boolean;
  /**
   * Explosion values per slice (percentage 0-100)
   * @see ECMA-376 Part 1, Section 21.2.2.65 (explosion)
   */
  readonly explosions?: readonly number[];
};
