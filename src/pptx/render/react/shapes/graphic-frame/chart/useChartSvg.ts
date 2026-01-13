/**
 * @file Hook for chart SVG generation
 *
 * Encapsulates context extraction and SVG generation for charts.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import { useMemo } from "react";
import type { Chart } from "../../../../../domain/chart";
import type { ChartReference } from "../../../../../domain";
import { useRenderContext, useRenderResourceStore } from "../../../context";
import { renderChart } from "../../../../chart";
import { extractSvgContent } from "../../../../svg/svg-utils";
import type { SvgResult } from "../types";

/**
 * Hook to render chart to SVG string.
 *
 * Encapsulates context extraction to ensure correct parameters
 * are passed to renderChart.
 *
 * @param chartData - Chart reference data (may have parsedChart)
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns SVG result with content flag
 */
export function useChartSvg(
  chartData: ChartReference | undefined,
  width: number,
  height: number,
): SvgResult {
  // Get full render context for chart rendering
  const ctx = useRenderContext();
  const resourceStore = useRenderResourceStore();

  return useMemo(() => {
    if (chartData === undefined) {
      return { svg: null, hasContent: false };
    }

    // Try to get chart from ResourceStore first, then fall back to parsedChart
    let chart: Chart | undefined;

    if (resourceStore !== undefined) {
      const entry = resourceStore.get<{ shapes?: unknown; dataModel?: unknown } | Chart>(chartData.resourceId);
      // Check if it's a Chart (has specific chart properties)
      if (entry?.parsed !== undefined && "plotArea" in (entry.parsed as object)) {
        chart = entry.parsed as Chart;
      }
    }

    // Fall back to legacy parsedChart field
    if (chart === undefined) {
      chart = chartData.parsedChart;
    }

    if (chart === undefined) {
      ctx.warnings.add({
        type: "fallback",
        message: `Chart not pre-parsed: ${chartData.resourceId}`,
      });
      return { svg: null, hasContent: false };
    }

    const chartHtml = renderChart(
      chart,
      width,
      height,
      ctx,
    );

    const svg = extractSvgContent(chartHtml as string);
    return { svg, hasContent: svg !== null };
  }, [chartData, width, height, ctx, resourceStore]);
}
