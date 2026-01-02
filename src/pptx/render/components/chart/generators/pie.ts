/**
 * @file Pie chart generator
 *
 * Generates SVG content for pie and doughnut charts.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.137 (pieChart)
 * @see ECMA-376 Part 1, Section 21.2.2.51 (doughnutChart)
 */

import type { SeriesData, ChartContent, PieChartConfig } from "../types";

/**
 * Generate pie chart content
 *
 * @see ECMA-376 Part 1, Section 21.2.2.137 (pieChart)
 * @see ECMA-376 Part 1, Section 21.2.2.54 (firstSliceAng) - start angle in degrees
 * @see ECMA-376 Part 1, Section 21.2.2.72 (holeSize) - for doughnut charts
 * @see ECMA-376 Part 1, Section 21.2.2.65 (explosion) - slice offset from center
 *
 * Note: Pie charts use center-based coordinates, not padding-based
 */
export function generatePieChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  isDoughnut: boolean = false,
  config?: PieChartConfig
): ChartContent {
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  // Reserve more padding when explosions are present to prevent clipping
  const maxExplosion = config?.explosions?.reduce((max, e) => Math.max(max, e ?? 0), 0) ?? 0;
  const explosionPadding = maxExplosion > 0 ? 20 + (maxExplosion / 100) * 30 : 20;
  const radius = Math.min(chartWidth, chartHeight) / 2 - explosionPadding;

  // For doughnut: use holeSize if specified, otherwise default to 50%
  // holeSize is a percentage (0-90), we need to convert to inner radius ratio
  const holeSizePercent = config?.holeSize ?? 50;
  const innerRadius = isDoughnut ? radius * (holeSizePercent / 100) : 0;

  // Use first series only for pie chart
  const series = data[0];
  if (!series || series.values.length === 0) {
    return { content: "", seriesData: data, colors };
  }

  // Calculate total
  const total = series.values.reduce((sum, point) => sum + point.y, 0);

  const slices: string[] = [];

  // Convert firstSliceAng from degrees to radians
  // ECMA-376: 0 = right (3 o'clock), 90 = bottom (6 o'clock), etc.
  // But PowerPoint default is typically 0 which visually appears as top
  // In radians: 0 deg = 0 rad (right), we need to adjust for SVG coordinate system
  const firstSliceAngDeg = config?.firstSliceAng ?? 0;
  // Convert to radians and adjust: SVG 0 is right, subtract 90 degrees to make 0 point up
  const angleState = { currentAngle: (firstSliceAngDeg - 90) * (Math.PI / 180) };

  series.values.forEach((point, index) => {
    const currentAngle = angleState.currentAngle;
    const sliceAngle = (point.y / total) * 2 * Math.PI;
    const color = colors[index % colors.length];

    // Calculate explosion offset
    // ECMA-376 21.2.2.65: explosion is a percentage (0-100) of the radius
    const explosionPercent = config?.explosions?.[i] ?? 0;
    const explosionDistance = (explosionPercent / 100) * radius;

    // Calculate the midpoint angle of the slice for explosion direction
    const midAngle = currentAngle + sliceAngle / 2;
    const offsetX = explosionDistance * Math.cos(midAngle);
    const offsetY = explosionDistance * Math.sin(midAngle);

    // Adjusted center for this slice
    const sliceCenterX = centerX + offsetX;
    const sliceCenterY = centerY + offsetY;

    // Calculate arc points with explosion offset
    const x1 = sliceCenterX + radius * Math.cos(currentAngle);
    const y1 = sliceCenterY + radius * Math.sin(currentAngle);
    const x2 = sliceCenterX + radius * Math.cos(currentAngle + sliceAngle);
    const y2 = sliceCenterY + radius * Math.sin(currentAngle + sliceAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathD = resolvePiePath(isDoughnut, {
      sliceCenterX,
      sliceCenterY,
      radius,
      innerRadius,
      currentAngle,
      sliceAngle,
      largeArc,
      x1,
      y1,
      x2,
      y2,
    });

    slices.push(`<path d="${pathD}" fill="${color}" stroke="white" stroke-width="1"/>`);
    angleState.currentAngle = currentAngle + sliceAngle;
  });

  return {
    content: slices.join(""),
    seriesData: data,
    colors,
    chartType: "pie" as const,
  };
}

function resolvePiePath(
  isDoughnut: boolean,
  params: {
    sliceCenterX: number;
    sliceCenterY: number;
    radius: number;
    innerRadius: number;
    currentAngle: number;
    sliceAngle: number;
    largeArc: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
): string {
  if (isDoughnut) {
    return buildDoughnutPath(params);
  }
  return buildPieSlicePath(params);
}

function buildPieSlicePath(params: {
  sliceCenterX: number;
  sliceCenterY: number;
  radius: number;
  largeArc: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): string {
  return `M ${params.sliceCenterX} ${params.sliceCenterY} L ${params.x1} ${params.y1} A ${params.radius} ${params.radius} 0 ${params.largeArc} 1 ${params.x2} ${params.y2} Z`;
}

function buildDoughnutPath(params: {
  sliceCenterX: number;
  sliceCenterY: number;
  radius: number;
  innerRadius: number;
  currentAngle: number;
  sliceAngle: number;
  largeArc: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): string {
  const ix1 = params.sliceCenterX + params.innerRadius * Math.cos(params.currentAngle);
  const iy1 = params.sliceCenterY + params.innerRadius * Math.sin(params.currentAngle);
  const ix2 = params.sliceCenterX + params.innerRadius * Math.cos(params.currentAngle + params.sliceAngle);
  const iy2 = params.sliceCenterY + params.innerRadius * Math.sin(params.currentAngle + params.sliceAngle);

  return (
    `M ${params.x1} ${params.y1} A ${params.radius} ${params.radius} 0 ${params.largeArc} 1 ${params.x2} ${params.y2} ` +
    `L ${ix2} ${iy2} A ${params.innerRadius} ${params.innerRadius} 0 ${params.largeArc} 0 ${ix1} ${iy1} Z`
  );
}
