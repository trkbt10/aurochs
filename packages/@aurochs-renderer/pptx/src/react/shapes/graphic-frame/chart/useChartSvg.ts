/**
 * @file Hook for chart SVG generation
 *
 * Encapsulates context extraction and SVG generation for charts.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import { useMemo } from "react";
import type { Chart } from "@aurochs-office/chart/domain";
import type { ChartReference } from "@aurochs-office/pptx/domain";
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
export function useChartSvg(chartData: ChartReference | undefined, width: number, height: number): SvgResult {
  // Get full render context for chart rendering
  const ctx = useRenderContext();
  const resourceStore = useRenderResourceStore();

  return useMemo(() => {
    if (chartData === undefined) {
      return { svg: null, hasContent: false };
    }

    // Get chart from ResourceStore
    const entry = resourceStore?.get<Chart>(chartData.resourceId);
    const chart = entry?.parsed;

    if (chart === undefined) {
      ctx.warnings.add({
        type: "fallback",
        message: `Chart not in ResourceStore: ${chartData.resourceId}`,
      });
      return { svg: null, hasContent: false };
    }

    const chartHtml = renderChart({ chart, width, height, ctx });

    const svg = extractSvgContent(chartHtml as string);
    return { svg, hasContent: svg !== null };
  }, [chartData, width, height, ctx, resourceStore]);
}
