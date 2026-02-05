/**
 * @file Types for chart ASCII rendering
 */

export type AsciiSeriesData = {
  readonly name?: string;
  readonly values: readonly number[];
  readonly categories?: readonly string[];
};

export type ChartAsciiParams = {
  readonly series: readonly AsciiSeriesData[];
  readonly chartType: "bar" | "line" | "pie" | "scatter" | "area" | "radar" | "other";
  readonly title?: string;
  readonly width: number;
};
