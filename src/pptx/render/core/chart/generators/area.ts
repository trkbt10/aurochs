/**
 * @file Area chart generator
 *
 * Generates SVG content for area charts.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.3 (areaChart)
 */

import type { SeriesData, ValueAxisConfig, ChartContent } from "../types";
import { getValueRange } from "../data";
import { safeGetLabel } from "../axis";

/**
 * Generate area chart content
 * Handles negative values by positioning areas relative to zero line
 *
 * @see ECMA-376 Part 1, Section 21.2.2.3 (areaChart)
 */
export function generateAreaChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  axisConfig?: ValueAxisConfig
): ChartContent {
  const { minVal, maxVal } = getValueRange(data, axisConfig);
  const valueRange = maxVal - minVal;

  const numPoints = data[0]?.values.length ?? 0;
  const xStep = chartWidth / Math.max(numPoints - 1, 1);

  // Calculate zero line position
  const zeroY = chartHeight - ((0 - minVal) / valueRange) * chartHeight;

  // Draw areas (in reverse order for proper stacking)
  const areas: string[] = [];
  const reversed = [...data].reverse();
  reversed.forEach((series, index) => {
    const colorIndex = data.length - 1 - index;
    const color = colors[colorIndex % colors.length];

    const linePoints = series.values.map((point, i) => {
      const x = i * xStep;
      const y = chartHeight - ((point.y - minVal) / valueRange) * chartHeight;
      return `L ${x} ${y}`;
    });

    // Area fills from zero line to data points
    const pathD = `M 0 ${zeroY} ${linePoints.join(" ")} L ${chartWidth} ${zeroY} Z`;
    areas.push(
      `<path d="${pathD}" fill="${color}" fill-opacity="0.6" stroke="${color}" stroke-width="1"/>`
    );
  });

  // Draw axes with zero line
  const axes =
    `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="#333" stroke-width="1"/>` +
    `<line x1="0" y1="${zeroY}" x2="${chartWidth}" y2="${zeroY}" stroke="#333" stroke-width="1"/>`;

  // Collect category labels for external rendering (supports tickLblSkip)
  const xlabels = data[0]?.xlabels;
  const categoryLabels = Array.from({ length: numPoints }, (_, i) => safeGetLabel(xlabels, i));

  return {
    content: axes + areas.join(""),
    seriesData: data,
    valueRange: { minVal, maxVal },
    colors,
    categoryLabels,
    chartType: "area" as const,
  };
}
