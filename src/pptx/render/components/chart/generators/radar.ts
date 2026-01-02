/**
 * @file Radar chart generator
 *
 * Generates SVG content for radar (spider/web) charts.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 * @see ECMA-376 Part 1, Section 21.2.3.32 (ST_RadarStyle)
 */

import type { RadarStyle } from "../../../../domain/chart";
import type { SeriesData, ChartContent } from "../types";

/**
 * Radar chart configuration
 */
export type RadarChartConfig = {
  /**
   * Radar chart style
   * - "standard": Lines connecting data points (no fill)
   * - "marker": Lines with visible data point markers
   * - "filled": Filled polygon area
   * @see ECMA-376 Part 1, Section 21.2.3.32 (ST_RadarStyle)
   */
  readonly radarStyle: RadarStyle;
};

/**
 * Calculate point position on radar chart
 * Radar charts use polar coordinates where:
 * - Angle is determined by category index (evenly distributed)
 * - Radius is determined by value (normalized 0-1)
 */
function calculateRadarPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
  value: number,
  maxValue: number
): { x: number; y: number } {
  const normalizedValue = maxValue > 0 ? value / maxValue : 0;
  const r = normalizedValue * radius;
  // Angle 0 points up (12 o'clock), going clockwise
  const adjustedAngle = angle - Math.PI / 2;
  return {
    x: centerX + r * Math.cos(adjustedAngle),
    y: centerY + r * Math.sin(adjustedAngle),
  };
}

/**
 * Generate radar chart grid (web/spider lines)
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 */
function generateRadarGrid(
  centerX: number,
  centerY: number,
  radius: number,
  numCategories: number,
  numRings: number = 5
): string {
  const elements: string[] = [];
  const angleStep = (2 * Math.PI) / numCategories;

  // Draw concentric rings (gridlines)
  Array.from({ length: numRings }, (_, ringIndex) => {
    const ring = ringIndex + 1;
    const ringRadius = (ring / numRings) * radius;
    const points = Array.from({ length: numCategories }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + ringRadius * Math.cos(angle);
      const y = centerY + ringRadius * Math.sin(angle);
      return `${x},${y}`;
    });

    elements.push(
      `<polygon points="${points.join(" ")}" fill="none" stroke="#ddd" stroke-width="1"/>`
    );
  });

  // Draw radial lines (spokes)
  Array.from({ length: numCategories }, (_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    elements.push(
      `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#ddd" stroke-width="1"/>`
    );
  });

  return elements.join("");
}

/**
 * Generate radar chart content
 *
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 * @see ECMA-376 Part 1, Section 21.2.3.32 (ST_RadarStyle)
 */
export function generateRadarChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  config?: RadarChartConfig
): ChartContent {
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  const radius = Math.min(chartWidth, chartHeight) / 2 - 40; // Padding for labels

  const radarStyle = config?.radarStyle ?? "standard";
  const showMarkers = radarStyle === "marker";
  const isFilled = radarStyle === "filled";

  // Find max value across all series for normalization
  const maxValueRaw = data.reduce((max, series) => {
    return series.values.reduce((seriesMax, point) => {
      return Math.max(seriesMax, Math.abs(point.y));
    }, max);
  }, 0);
  const maxValue = maxValueRaw === 0 ? 1 : maxValueRaw;

  const numCategories = data[0]?.values.length ?? 0;
  if (numCategories === 0) {
    return { content: "", seriesData: data, colors };
  }

  const angleStep = (2 * Math.PI) / numCategories;
  const elements: string[] = [];

  // Draw grid first (behind data)
  elements.push(generateRadarGrid(centerX, centerY, radius, numCategories));

  // Draw each series
  data.forEach((series, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];
    const points = series.values.map((point, index) => {
      const angle = index * angleStep;
      return calculateRadarPoint(centerX, centerY, radius, angle, point.y, maxValue);
    });

    // Build polygon path
    const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    if (isFilled) {
      // Filled style: semi-transparent filled polygon
      elements.push(
        `<polygon points="${polygonPoints}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`
      );
    } else {
      // Standard/marker style: lines only
      elements.push(
        `<polygon points="${polygonPoints}" fill="none" stroke="${color}" stroke-width="2"/>`
      );
    }

    // Draw markers for marker style
    if (showMarkers) {
      points.forEach((point) => {
        elements.push(`<circle cx="${point.x}" cy="${point.y}" r="4" fill="${color}"/>`);
      });
    }
  });

  // Draw category labels around the chart
  const xlabels = data[0]?.xlabels;
  Array.from({ length: numCategories }, (_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 15;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    const textAnchor = resolveRadarTextAnchor(angle);
    const label = xlabels?.[String(i)] ?? String(i + 1);
    elements.push(
      `<text x="${x}" y="${y + 4}" text-anchor="${textAnchor}" font-size="10" fill="#666">${label}</text>`
    );
  });

  return {
    content: elements.join(""),
    seriesData: data,
    colors,
    chartType: "scatter" as const, // Use scatter for data label positioning (center-based)
  };
}

function resolveRadarTextAnchor(angle: number): string {
  const cosValue = Math.cos(angle);
  if (Math.abs(cosValue) <= 0.1) {
    return "middle";
  }
  return cosValue > 0 ? "start" : "end";
}
