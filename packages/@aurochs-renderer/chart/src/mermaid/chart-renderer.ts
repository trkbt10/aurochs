/**
 * @file Render chart data as a fenced Mermaid code block
 */

import { serializeChartToMermaid } from "@aurochs-builder/mermaid";
import { wrapInMermaidFence } from "@aurochs/mermaid";
import type { ChartMermaidParams } from "./types";

/** Render chart data as a fenced Mermaid code block string. */
export function renderChartMermaid(params: ChartMermaidParams): string {
  const content = serializeChartToMermaid({
    series: params.series,
    chartType: params.chartType,
    title: params.title,
  });

  if (!content) {
    return "";
  }

  return wrapInMermaidFence(content);
}
