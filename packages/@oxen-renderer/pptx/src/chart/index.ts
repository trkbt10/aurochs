/**
 * @file Chart renderer (PPTX adapter)
 *
 * pptx-render retains only the adapter layer:
 * - CoreRenderContext -> ChartRenderContext
 * - BaseFill -> ResolvedFill via FillResolver
 *
 * The actual chart SVG renderer lives in @oxen-renderer/chart.
 */

import type { Chart } from "@oxen-office/chart/domain";
import { renderChart as renderChartSvg } from "@oxen-renderer/chart";
import type { CoreRenderContext } from "../render-context";
import { type HtmlString, unsafeHtml } from "../html/index";
import { createChartRenderContext, createFillResolver } from "./context-adapter";

export function renderChart(
  ...args: [
    chart: Chart,
    width: number,
    height: number,
    ctx: CoreRenderContext,
  ]
): HtmlString {
  const [chart, width, height, ctx] = args;
  const chartCtx = createChartRenderContext(ctx);
  const fillResolver = createFillResolver(ctx);
  return unsafeHtml(renderChartSvg({ chart, width, height, ctx: chartCtx, fillResolver }));
}

/**
 * Check if chart has renderable data
 */
export function hasChartData(chart: Chart): boolean {
  return chart.plotArea.charts.length > 0;
}
