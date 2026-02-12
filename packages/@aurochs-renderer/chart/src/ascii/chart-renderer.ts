/**
 * @file Chart ASCII renderer - dispatches to chart-type-specific renderers
 */

import type { ChartAsciiParams, AsciiSeriesData } from "./types";
import { renderBarAscii } from "./bar-renderer";
import { renderLineAscii } from "./line-renderer";
import { renderPieAscii } from "./pie-renderer";

type RenderParams = { readonly series: readonly AsciiSeriesData[]; readonly width: number };

/** Dispatch to type-specific renderer. */
function renderByType(chartType: ChartAsciiParams["chartType"], params: RenderParams): string {
  switch (chartType) {
    case "line":
    case "area":
      return renderLineAscii(params);
    case "pie":
      return renderPieAscii(params);
    case "bar":
    case "scatter":
    case "radar":
    case "other":
    default:
      return renderBarAscii(params);
  }
}

/** Render chart data as ASCII art, dispatching by chart type. */
export function renderChartAscii(params: ChartAsciiParams): string {
  const { series, chartType, title, width } = params;
  const lines: string[] = [];

  if (title) {
    lines.push(title);
    lines.push("\u2500".repeat(Math.min(title.length + 4, width)));
  }

  const chart = renderByType(chartType, { series, width });

  if (chart) {
    lines.push(chart);
  }

  return lines.join("\n");
}
