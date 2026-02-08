/**
 * @file Chart builder types
 *
 * Types for building chart elements across PPTX, DOCX, and XLSX.
 * These are simplified spec types for the builder API.
 */

/**
 * Buildable chart types
 */
export type BuildableChartType =
  | "barChart"
  | "bar3DChart"
  | "lineChart"
  | "line3DChart"
  | "pieChart"
  | "pie3DChart"
  | "doughnutChart"
  | "areaChart"
  | "area3DChart"
  | "scatterChart"
  | "bubbleChart"
  | "radarChart"
  | "surfaceChart"
  | "surface3DChart"
  | "stockChart"
  | "ofPieChart";

/**
 * Chart grouping type
 */
export type Grouping = "standard" | "stacked" | "percentStacked";

/**
 * Bar chart specific grouping
 */
export type BarGrouping = Grouping | "clustered";

/**
 * Scatter chart style
 */
export type ScatterStyle = "lineMarker" | "line" | "marker" | "smooth" | "smoothMarker";

/**
 * Radar chart style
 */
export type RadarStyle = "standard" | "marker" | "filled";

/**
 * Pie of pie / bar of pie type
 */
export type OfPieType = "pie" | "bar";

/**
 * Chart series data specification
 */
export type ChartSeriesSpec = {
  readonly name: string;
  readonly values: readonly number[];
};

/**
 * Chart data specification
 */
export type ChartDataSpec = {
  readonly categories: readonly string[];
  readonly series: readonly ChartSeriesSpec[];
};

/**
 * Chart build specification
 */
export type ChartBuildSpec = {
  /** Chart type */
  readonly chartType: BuildableChartType;
  /** Chart title (optional) */
  readonly title?: string;
  /** Chart data */
  readonly data: ChartDataSpec;
};
