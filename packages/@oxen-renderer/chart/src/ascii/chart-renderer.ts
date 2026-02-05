/**
 * @file Chart ASCII renderer - dispatches to chart-type-specific renderers
 */

import type { ChartAsciiParams } from "./types";
import { renderBarAscii } from "./bar-renderer";
import { renderLineAscii } from "./line-renderer";
import { renderPieAscii } from "./pie-renderer";

/** Render chart data as ASCII art, dispatching by chart type. */
export function renderChartAscii(params: ChartAsciiParams): string {
  const { series, chartType, title, width } = params;
  const lines: string[] = [];

  if (title) {
    lines.push(title);
    lines.push("\u2500".repeat(Math.min(title.length + 4, width)));
  }

  let chart: string;

  switch (chartType) {
    case "line":
    case "area":
      chart = renderLineAscii({ series, width });
      break;
    case "pie":
      chart = renderPieAscii({ series, width });
      break;
    case "bar":
    case "scatter":
    case "radar":
    case "other":
    default:
      chart = renderBarAscii({ series, width });
      break;
  }

  if (chart) {
    lines.push(chart);
  }

  return lines.join("\n");
}
