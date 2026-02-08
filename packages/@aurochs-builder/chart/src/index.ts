/**
 * @file Chart builder package
 *
 * Provides builders for creating chart XML documents for PPTX, DOCX, and XLSX.
 * Offers a simplified spec-based API for chart creation.
 *
 * @example
 * ```typescript
 * import { buildChartDocument, buildChartData } from "@aurochs-builder/chart";
 *
 * const data = buildChartData(
 *   ["Q1", "Q2", "Q3", "Q4"],
 *   [{ name: "Sales", values: [100, 200, 150, 300] }]
 * );
 *
 * const chartDoc = buildChartDocument({
 *   chartType: "barChart",
 *   title: "Quarterly Sales",
 *   data,
 * });
 * ```
 */

// Types
export type {
  BuildableChartType,
  Grouping,
  BarGrouping,
  ScatterStyle,
  RadarStyle,
  OfPieType,
  ChartSeriesSpec,
  ChartDataSpec,
  ChartBuildSpec,
} from "./types";

// Builders
export { buildChartDocument, buildChartElement, buildChartData } from "./chart-builder";

// Chart space builder
export { buildChartSpaceDocument, buildChartSpaceElement, type ChartSpaceOptions } from "./chart-space-builder";
