/**
 * @file Line chart generator
 *
 * Generates SVG content for line charts with optional smooth curves.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (lineChart)
 * @see ECMA-376 Part 1, Section 21.2.2.185 (smooth) - curved lines
 */

import type { SeriesData, ValueAxisConfig, ChartContent, LineChartConfig } from "../types";
import { getValueRange } from "../data";
import { safeGetLabel } from "../axis";
import { extractDropLineStyle, extractHiLowLineStyle, toSvgStrokeAttributes } from "../line-style";

/**
 * Calculate control points for Catmull-Rom to Bézier curve conversion
 * Creates smooth curves that pass through all data points
 */
function calculateSmoothControlPoints(
  points: readonly { x: number; y: number }[]
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number }[] {
  const count = Math.max(points.length - 1, 0);
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    const p0 = points[Math.max(0, index - 2)];
    const p1 = points[index - 1];
    const p2 = points[index];
    const p3 = points[Math.min(points.length - 1, index + 1)];

    // Catmull-Rom to Bézier conversion
    // Tension factor (0.5 is default for Catmull-Rom)
    const tension = 0.5;

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    return { cp1x, cp1y, cp2x, cp2y };
  });
}

/**
 * Generate line chart content
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (lineChart)
 * @see ECMA-376 Part 1, Section 21.2.2.185 (smooth) - curved lines
 *
 * Handles negative values by positioning zero line correctly
 */
export function generateLineChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  axisConfig?: ValueAxisConfig,
  lineConfig?: LineChartConfig
): ChartContent {
  const { minVal, maxVal } = getValueRange(data, axisConfig);
  const valueRange = maxVal - minVal;
  const smooth = lineConfig?.smooth ?? false;
  const showMarkers = lineConfig?.marker !== false; // Default true

  const numPoints = data[0]?.values.length ?? 0;
  const xStep = chartWidth / Math.max(numPoints - 1, 1);

  // Calculate zero line position
  const zeroY = chartHeight - ((0 - minVal) / valueRange) * chartHeight;

  const elements: string[] = [];

  data.forEach((series, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];

    // Calculate all point coordinates
    const coords = series.values.map((point, i) => ({
      x: i * xStep,
      y: chartHeight - ((point.y - minVal) / valueRange) * chartHeight,
    }));

    // Build path
    const pathD = buildLinePath(coords, smooth);

    elements.push(`<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2"/>`);

    // Draw markers
    if (showMarkers) {
      coords.forEach((coord) => {
        elements.push(`<circle cx="${coord.x}" cy="${coord.y}" r="4" fill="${color}"/>`);
      });
    }

    // Draw drop lines if enabled
    // @see ECMA-376 Part 1, Section 21.2.2.53 (dropLines)
    if (lineConfig?.dropLines) {
      const dropStyle = extractDropLineStyle(lineConfig.dropLines);
      coords.forEach((coord) => {
        elements.push(
          `<line x1="${coord.x}" y1="${coord.y}" x2="${coord.x}" y2="${chartHeight}" ${toSvgStrokeAttributes(dropStyle)}/>`
        );
      });
    }
  });

  // Draw hi-low lines if enabled (connects high and low values across series)
  // @see ECMA-376 Part 1, Section 21.2.2.75 (hiLowLines)
  if (lineConfig?.hiLowLines && data.length >= 2) {
    const hiLowStyle = extractHiLowLineStyle(lineConfig.hiLowLines);
    Array.from({ length: numPoints }, (_, index) => {
      const range = resolveHiLowRange(data, index);
      const x = index * xStep;
      const topY = chartHeight - ((range.maxY - minVal) / valueRange) * chartHeight;
      const bottomY = chartHeight - ((range.minY - minVal) / valueRange) * chartHeight;
      elements.push(
        `<line x1="${x}" y1="${topY}" x2="${x}" y2="${bottomY}" ${toSvgStrokeAttributes(hiLowStyle)}/>`
      );
    });
  }

  // Draw axes with zero line
  const axes =
    `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="#333" stroke-width="1"/>` +
    `<line x1="0" y1="${zeroY}" x2="${chartWidth}" y2="${zeroY}" stroke="#333" stroke-width="1"/>`;

  // Collect category labels for external rendering (supports tickLblSkip)
  const xlabels = data[0]?.xlabels;
  const categoryLabels = Array.from({ length: numPoints }, (_, i) => safeGetLabel(xlabels, i));

  return {
    content: axes + elements.join(""),
    seriesData: data,
    valueRange: { minVal, maxVal },
    colors,
    categoryLabels,
    chartType: "line" as const,
  };
}

function buildLinePath(points: readonly { x: number; y: number }[], smooth: boolean): string {
  if (smooth && points.length >= 2) {
    const controlPoints = calculateSmoothControlPoints(points);
    const initial = `M ${points[0].x} ${points[0].y}`;
    return points.slice(1).reduce((path, point, index) => {
      const cp = controlPoints[index];
      return `${path} C ${cp.cp1x} ${cp.cp1y}, ${cp.cp2x} ${cp.cp2y}, ${point.x} ${point.y}`;
    }, initial);
  }

  return points.map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`)).join(" ");
}

function resolveHiLowRange(
  data: readonly SeriesData[],
  index: number
): { minY: number; maxY: number } {
  const initial = { minY: Infinity, maxY: -Infinity };
  return data.reduce((acc, series) => {
    const y = series.values[index]?.y ?? 0;
    return {
      minY: Math.min(acc.minY, y),
      maxY: Math.max(acc.maxY, y),
    };
  }, initial);
}
