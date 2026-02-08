/**
 * @file Chart renderer (PPTX adapter)
 *
 * pptx-render retains only the adapter layer:
 * - CoreRenderContext -> ChartRenderContext
 * - BaseFill -> ResolvedFill via FillResolver
 *
 * The actual chart SVG renderer lives in @aurochs-renderer/chart.
 */

import type { Chart } from "@aurochs-office/chart/domain";
import { renderChart as renderChartSvg } from "@aurochs-renderer/chart/svg";
import type { CoreRenderContext } from "../render-context";
import { createChartRenderContext, createFillResolver } from "./context-adapter";

/**
 * Render a chart as SVG string.
 */
export function renderChart({
  chart,
  width,
  height,
  ctx,
}: {
  chart: Chart;
  width: number;
  height: number;
  ctx: CoreRenderContext;
}): string {
  const chartCtx = createChartRenderContext(ctx);
  const fillResolver = createFillResolver(ctx);
  return renderChartSvg({ chart, width, height, ctx: chartCtx, fillResolver });
}

/**
 * Check if chart has renderable data
 */
export function hasChartData(chart: Chart): boolean {
  return chart.plotArea.charts.length > 0;
}
