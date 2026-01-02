/**
 * @file Bubble chart generator
 *
 * Generates SVG content for bubble charts.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.20 (bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.19 (bubbleSer)
 */

import type { Percent } from "../../../../domain/types";
import type { ChartContent } from "../types";
import { drawAxes } from "../axis";

/**
 * Bubble data point with size
 */
export type BubbleDataPoint = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
};

/**
 * Bubble series data
 */
export type BubbleSeriesData = {
  readonly key: string;
  readonly values: readonly BubbleDataPoint[];
};

/**
 * Bubble chart configuration
 */
export type BubbleChartConfig = {
  /**
   * Scale factor for bubble sizes (0-300%)
   * @see ECMA-376 Part 1, Section 21.2.2.18 (bubbleScale)
   */
  readonly bubbleScale?: Percent;
  /**
   * Whether to show negative bubbles
   * @see ECMA-376 Part 1, Section 21.2.2.176 (showNegBubbles)
   */
  readonly showNegBubbles?: boolean;
  /**
   * What bubble size represents
   * - "area": size value represents area (default)
   * - "w": size value represents width/diameter
   * @see ECMA-376 Part 1, Section 21.2.2.183 (sizeRepresents)
   */
  readonly sizeRepresents?: "area" | "w";
};

/**
 * Calculate bubble radius from size value
 *
 * Per ECMA-376 21.2.2.183:
 * - "area": radius = sqrt(size / π) * scale
 * - "w": radius = size / 2 * scale
 */
function calculateBubbleRadius(
  size: number,
  maxSize: number,
  maxRadius: number,
  sizeRepresents: "area" | "w",
  scale: number
): number {
  if (maxSize === 0) {return 0;}

  const normalizedSize = Math.abs(size) / maxSize;

  if (sizeRepresents === "w") {
    // Size represents diameter
    return (normalizedSize * maxRadius * scale) / 100;
  } else {
    // Size represents area (default)
    // radius = sqrt(normalizedArea) * maxRadius
    return Math.sqrt(normalizedSize) * maxRadius * (scale / 100);
  }
}

/**
 * Calculate range with padding for bubble chart
 */
function getBubbleRange(data: readonly BubbleSeriesData[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxSize: number;
} {
  const extent = resolveBubbleExtent(data);

  // Add 10% padding for bubbles
  const rawXRange = extent.maxX - extent.minX;
  const rawYRange = extent.maxY - extent.minY;
  const xRange = rawXRange === 0 ? 1 : rawXRange;
  const yRange = rawYRange === 0 ? 1 : rawYRange;
  const safeMaxSize = extent.maxSize === 0 ? 1 : extent.maxSize;

  return {
    minX: extent.minX - xRange * 0.1,
    maxX: extent.maxX + xRange * 0.1,
    minY: extent.minY - yRange * 0.1,
    maxY: extent.maxY + yRange * 0.1,
    maxSize: safeMaxSize,
  };
}

function resolveBubbleExtent(data: readonly BubbleSeriesData[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxSize: number;
} {
  const initial = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, maxSize: 0 };
  const extent = data.reduce((acc, series) => {
    return series.values.reduce((seriesAcc, point) => {
      return {
        minX: Math.min(seriesAcc.minX, point.x),
        maxX: Math.max(seriesAcc.maxX, point.x),
        minY: Math.min(seriesAcc.minY, point.y),
        maxY: Math.max(seriesAcc.maxY, point.y),
        maxSize: Math.max(seriesAcc.maxSize, Math.abs(point.size)),
      };
    }, acc);
  }, initial);

  if (extent.minX === Infinity) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, maxSize: 0 };
  }

  return extent;
}

/**
 * Generate bubble chart content
 *
 * @see ECMA-376 Part 1, Section 21.2.2.20 (bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.19 (bubbleSer)
 */
export function generateBubbleChart(
  data: readonly BubbleSeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  config?: BubbleChartConfig
): ChartContent {
  const { minX, maxX, minY, maxY, maxSize } = getBubbleRange(data);
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  const bubbleScale = config?.bubbleScale ?? 100;
  const showNegBubbles = config?.showNegBubbles ?? true;
  const sizeRepresents = config?.sizeRepresents ?? "area";

  // Max bubble radius - limit to reasonable size
  const maxBubbleRadius = Math.min(chartWidth, chartHeight) * 0.15;

  const bubbles: string[] = [];

  data.forEach((series, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];

    series.values.forEach((point) => {
      // Skip negative bubbles if not shown
      if (point.size < 0 && !showNegBubbles) {
        return;
      }

      const x = ((point.x - minX) / xRange) * chartWidth;
      const y = chartHeight - ((point.y - minY) / yRange) * chartHeight;
      const radius = calculateBubbleRadius(
        point.size,
        maxSize,
        maxBubbleRadius,
        sizeRepresents,
        bubbleScale
      );

      // Negative bubbles could have different styling (e.g., outline only)
      if (point.size < 0) {
        bubbles.push(
          `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4,2"/>`
        );
      } else {
        bubbles.push(
          `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity="0.6" stroke="${color}" stroke-width="1"/>`
        );
      }
    });
  });

  const axes = drawAxes(chartWidth, chartHeight);

  // Convert BubbleSeriesData to SeriesData format for compatibility
  // Include bubbleSize for data labels with showBubbleSize
  const seriesData = data.map((s) => ({
    key: s.key,
    values: s.values.map((v) => ({ x: v.x, y: v.y, bubbleSize: v.size })),
  }));

  return {
    content: axes + bubbles.join(""),
    seriesData,
    colors,
    chartType: "bubble" as const,
    valueRange: { minVal: minY, maxVal: maxY },
  };
}
