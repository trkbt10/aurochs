/**
 * @file Types for chart Mermaid rendering
 */

export type ChartSeriesData = {
  readonly name?: string;
  readonly values: readonly number[];
  readonly categories?: readonly string[];
};

export type ChartMermaidParams = {
  readonly series: readonly ChartSeriesData[];
  readonly chartType: "bar" | "line" | "pie" | "scatter" | "area" | "radar" | "other";
  readonly title?: string;
};
