/**
 * @file DOCX Chart Renderer
 *
 * Renders charts embedded in DOCX documents.
 * Adapts DOCX drawing context to chart rendering context.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 */

import type { Chart } from "@aurochs-office/chart/domain";
import { renderChart as renderChartSvg } from "@aurochs-renderer/chart/svg";
import type { DocxDrawingRenderContext } from "../react/context";
import { createDocxChartRenderContext, createDocxFillResolver } from "./context-adapter";

// =============================================================================
// Exports
// =============================================================================

export { createDocxChartRenderContext, createDocxFillResolver } from "./context-adapter";

// =============================================================================
// Chart Rendering
// =============================================================================

/**
 * Render a chart as SVG string.
 *
 * @param chart - Parsed chart data
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param ctx - DOCX drawing render context
 * @returns SVG string
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
  ctx: DocxDrawingRenderContext;
}): string {
  const chartCtx = createDocxChartRenderContext(ctx);
  const fillResolver = createDocxFillResolver(ctx);
  return renderChartSvg({ chart, width, height, ctx: chartCtx, fillResolver });
}

/**
 * Check if chart has renderable data.
 */
export function hasChartData(chart: Chart): boolean {
  return chart.plotArea.charts.length > 0;
}
