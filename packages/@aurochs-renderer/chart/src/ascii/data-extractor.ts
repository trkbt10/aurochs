/**
 * @file Extract series data from chart domain objects
 */

import type { AsciiSeriesData, ChartAsciiParams } from "./types";

type ChartSeries = {
  readonly name?: string;
  readonly values?: readonly (number | null | undefined)[];
  readonly categories?: readonly (string | null | undefined)[];
};

type ChartInfo = {
  readonly title?: string;
  readonly chartType?: string;
  readonly series?: readonly ChartSeries[];
};

/** Convert nullable categories to string array. */
function toStringCategories(
  categories: readonly (string | null | undefined)[] | undefined
): readonly string[] | undefined {
  if (!categories) {
    return undefined;
  }
  return categories.map((c) => (c != null ? String(c) : ""));
}

/** Map a chart type string to the normalized type for rendering. */
function normalizeChartType(type: string | undefined): ChartAsciiParams["chartType"] {
  if (!type) {
    return "other";
  }
  const lower = type.toLowerCase();
  if (lower.includes("bar") || lower.includes("col")) {
    return "bar";
  }
  if (lower.includes("line")) {
    return "line";
  }
  if (lower.includes("pie") || lower.includes("doughnut")) {
    return "pie";
  }
  if (lower.includes("scatter") || lower.includes("bubble")) {
    return "scatter";
  }
  if (lower.includes("area")) {
    return "area";
  }
  if (lower.includes("radar")) {
    return "radar";
  }
  return "other";
}

/** Extract AsciiSeriesData[] from a chart domain object. */
export function extractChartData(chart: ChartInfo): {
  readonly series: readonly AsciiSeriesData[];
  readonly chartType: ChartAsciiParams["chartType"];
  readonly title?: string;
} {
  const chartType = normalizeChartType(chart.chartType);
  const seriesData: AsciiSeriesData[] = [];

  if (chart.series) {
    for (const s of chart.series) {
      const values = (s.values ?? []).map((v) => (typeof v === "number" ? v : 0));
      const categories = toStringCategories(s.categories);

      seriesData.push({
        name: s.name ?? undefined,
        values,
        categories,
      });
    }
  }

  return { series: seriesData, chartType, title: chart.title };
}
