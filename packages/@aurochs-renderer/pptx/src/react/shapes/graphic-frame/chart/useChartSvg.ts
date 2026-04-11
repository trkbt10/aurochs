/**
 * @file Hook for chart rendering
 *
 * Encapsulates context extraction, chart SVG generation, and conversion
 * to React elements. Returns ReactNode ready for rendering.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import { useMemo, type ReactNode } from "react";
import type { Chart } from "@aurochs-office/chart/domain";
import type { ChartReference } from "@aurochs-office/pptx/domain";
import { useRenderContext, useRenderResourceStore } from "../../../context";
import { renderChart } from "../../../../chart";
import { parseSvgString } from "../../../../svg/svg-parse";
import { svgChildrenToJsx } from "../../../../svg/svg-to-jsx";

/**
 * Result of chart rendering hook.
 *
 * Returns React nodes (not SVG strings) — the content is already
 * parsed and converted to React elements within the hook.
 */
export type ChartSvgResult = {
  /** React elements representing the chart SVG content, or null if no content */
  readonly content: ReactNode;
  /** Whether chart content was successfully generated */
  readonly hasContent: boolean;
};

/**
 * Hook to render chart as React elements.
 *
 * Resolves chart data from ResourceStore, renders it via the chart
 * renderer, and returns the result as React elements.
 *
 * @param chartData - Chart reference data (may have parsedChart)
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns React elements and content flag
 */
export function useChartSvg(chartData: ChartReference | undefined, width: number, height: number): ChartSvgResult {
  const ctx = useRenderContext();
  const resourceStore = useRenderResourceStore();

  return useMemo(() => {
    if (chartData === undefined) {
      return { content: null, hasContent: false };
    }

    const entry = resourceStore?.get<Chart>(chartData.resourceId);
    const chart = entry?.parsed;

    if (chart === undefined) {
      ctx.warnings.add({
        type: "fallback",
        message: `Chart not in ResourceStore: ${chartData.resourceId}`,
      });
      return { content: null, hasContent: false };
    }

    // renderChart returns a complete SVG string (<svg>...</svg>)
    const chartSvgString = renderChart({ chart, width, height, ctx });

    // Parse the SVG and extract children of the root <svg> element.
    // The outer <svg> wrapper is discarded because ChartContent renders
    // within an existing SVG context (inside a <g> element).
    const root = parseSvgString(chartSvgString);
    if (root === null) {
      return { content: null, hasContent: false };
    }

    const content = svgChildrenToJsx(root.children, "chart");
    return { content, hasContent: true };
  }, [chartData, width, height, ctx, resourceStore]);
}
