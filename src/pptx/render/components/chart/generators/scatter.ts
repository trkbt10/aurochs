/**
 * @file Scatter chart generator
 *
 * Generates SVG content for scatter (XY) charts.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
 * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
 */

import type { ScatterStyle, Marker } from "../../../../domain/chart";
import type { SeriesData, ChartContent } from "../types";
import { getScatterRange } from "../data";
import { drawAxes } from "../axis";

/**
 * Scatter chart configuration
 *
 * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
 */
export type ScatterChartConfig = {
  /**
   * Scatter style determines line and marker rendering
   * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
   */
  readonly scatterStyle: ScatterStyle;
  /**
   * Per-series marker configurations
   * Index corresponds to series index
   */
  readonly markers?: readonly (Marker | undefined)[];
  /**
   * Per-series smooth flags (overrides scatterStyle smooth)
   */
  readonly smoothFlags?: readonly (boolean | undefined)[];
};

/**
 * Default marker size in points
 * @see ECMA-376 Part 1, Section 21.2.2.181 (size) - default is 5
 */
const DEFAULT_MARKER_SIZE = 5;

// =============================================================================
// Marker Symbol Rendering (Rule 1: Lookup Object Pattern)
// =============================================================================

/**
 * Marker rendering context passed to each renderer
 */
type MarkerContext = {
  readonly x: number;
  readonly y: number;
  readonly half: number;
  readonly size: number;
  readonly fill: string;
};

/**
 * Marker symbol renderer function type
 */
type MarkerRenderer = (ctx: MarkerContext) => string;

/**
 * Generate 5-pointed star polygon points
 */
function generateStarPoints(x: number, y: number, outerR: number, innerR: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    return `${x + r * Math.cos(angle)},${y - r * Math.sin(angle)}`;
  }).join(" ");
}

/**
 * Marker symbol renderers indexed by symbol type
 * @see ECMA-376 Part 1, Section 21.2.3.27 (ST_MarkerStyle)
 */
const MARKER_RENDERERS: Record<Marker["symbol"], MarkerRenderer> = {
  circle: ({ x, y, half, fill }) =>
    `<circle cx="${x}" cy="${y}" r="${half}" fill="${fill}"/>`,

  square: ({ x, y, half, size, fill }) =>
    `<rect x="${x - half}" y="${y - half}" width="${size}" height="${size}" fill="${fill}"/>`,

  diamond: ({ x, y, half, fill }) =>
    `<polygon points="${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}" fill="${fill}"/>`,

  triangle: ({ x, y, half, fill }) =>
    `<polygon points="${x},${y - half} ${x + half},${y + half} ${x - half},${y + half}" fill="${fill}"/>`,

  x: ({ x, y, half, fill }) =>
    `<path d="M${x - half},${y - half} L${x + half},${y + half} M${x + half},${y - half} L${x - half},${y + half}" stroke="${fill}" stroke-width="2" fill="none"/>`,

  plus: ({ x, y, half, fill }) =>
    `<path d="M${x},${y - half} L${x},${y + half} M${x - half},${y} L${x + half},${y}" stroke="${fill}" stroke-width="2" fill="none"/>`,

  star: ({ x, y, half, fill }) =>
    `<polygon points="${generateStarPoints(x, y, half, half * 0.4)}" fill="${fill}"/>`,

  dash: ({ x, y, half, fill }) =>
    `<line x1="${x - half}" y1="${y}" x2="${x + half}" y2="${y}" stroke="${fill}" stroke-width="2"/>`,

  dot: ({ x, y, half, fill }) =>
    `<circle cx="${x}" cy="${y}" r="${Math.max(1, half * 0.4)}" fill="${fill}"/>`,

  none: () => "",

  // Picture markers require image embedding - fall back to circle
  picture: ({ x, y, half, fill }) =>
    `<circle cx="${x}" cy="${y}" r="${half}" fill="${fill}"/>`,
};

/**
 * Render a marker symbol at the given position
 *
 * @see ECMA-376 Part 1, Section 21.2.3.27 (ST_MarkerStyle)
 */
function renderMarkerSymbol(
  x: number,
  y: number,
  symbol: Marker["symbol"],
  size: number,
  fill: string
): string {
  const ctx: MarkerContext = { x, y, half: size / 2, size, fill };
  const renderer = MARKER_RENDERERS[symbol] ?? MARKER_RENDERERS.circle;
  return renderer(ctx);
}

// =============================================================================
// Scatter Style Configuration (Rule 1.1: Consolidated Handler Pattern)
// =============================================================================

/**
 * Scatter style rendering configuration
 * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
 */
type ScatterStyleConfig = {
  readonly renderLines: boolean;
  readonly renderMarkers: boolean;
  readonly useSmooth: boolean;
};

/**
 * Scatter style configurations indexed by style type
 * Consolidates all style-based decisions into a single lookup
 */
const SCATTER_STYLE_CONFIG: Record<ScatterStyle, ScatterStyleConfig> = {
  none: { renderLines: false, renderMarkers: false, useSmooth: false },
  line: { renderLines: true, renderMarkers: false, useSmooth: false },
  lineMarker: { renderLines: true, renderMarkers: true, useSmooth: false },
  marker: { renderLines: false, renderMarkers: true, useSmooth: false },
  smooth: { renderLines: true, renderMarkers: false, useSmooth: true },
  smoothMarker: { renderLines: true, renderMarkers: true, useSmooth: true },
};

/**
 * Get scatter style configuration with optional per-series smooth override
 */
function getScatterStyleConfig(style: ScatterStyle, seriesSmooth?: boolean): ScatterStyleConfig {
  const config = SCATTER_STYLE_CONFIG[style] ?? SCATTER_STYLE_CONFIG.marker;
  // Per-series smooth attribute overrides style
  if (seriesSmooth === undefined) {
    return config;
  }
  return { ...config, useSmooth: seriesSmooth };
}

// =============================================================================
// Smooth Curve Generation
// =============================================================================

/**
 * Generate smooth Bezier curve path through points
 *
 * Uses Catmull-Rom spline converted to cubic Bezier for smooth interpolation.
 * This matches PowerPoint's smooth curve rendering.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.185 (smooth)
 */
function generateSmoothPath(
  points: readonly { x: number; y: number }[],
  tension: number = 0.5
): string {
  if (points.length < 2) {
    return "";
  }
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  const segments = Array.from({ length: points.length - 1 }, (_, i) => {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Bezier control points
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

    return `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  });

  return [`M${points[0].x},${points[0].y}`, ...segments].join(" ");
}

// =============================================================================
// Series Rendering Helpers
// =============================================================================

/**
 * Calculate screen coordinates from data points
 */
function calculateScreenPoints(
  values: readonly { x: number | string; y: number }[],
  chartWidth: number,
  chartHeight: number,
  range: { minX: number; maxX: number; minY: number; maxY: number }
): { x: number; y: number }[] {
  const { minX, maxX, minY, maxY } = range;
  return values.map((point) => {
    const xVal = typeof point.x === "number" ? point.x : parseFloat(point.x);
    return {
      x: ((xVal - minX) / (maxX - minX)) * chartWidth,
      y: chartHeight - ((point.y - minY) / (maxY - minY)) * chartHeight,
    };
  });
}

/**
 * Render line connecting points (polyline or smooth curve)
 */
function renderLine(
  screenPoints: readonly { x: number; y: number }[],
  color: string,
  useSmooth: boolean
): string {
  if (screenPoints.length < 2) {
    return "";
  }
  if (useSmooth) {
    return `<path d="${generateSmoothPath(screenPoints)}" stroke="${color}" stroke-width="2" fill="none"/>`;
  }
  const linePoints = screenPoints.map((p) => `${p.x},${p.y}`).join(" ");
  return `<polyline points="${linePoints}" stroke="${color}" stroke-width="2" fill="none"/>`;
}

/**
 * Render markers at each point
 */
function renderMarkers(
  screenPoints: readonly { x: number; y: number }[],
  marker: Marker | undefined,
  color: string
): string[] {
  const symbol = marker?.symbol ?? "circle";
  // Marker size is in points, convert to pixels (approx 1.33)
  const markerSize = (marker?.size ?? DEFAULT_MARKER_SIZE) * 1.33;
  return screenPoints.map((pt) => renderMarkerSymbol(pt.x, pt.y, symbol, markerSize, color));
}

// =============================================================================
// Main Generator
// =============================================================================

/**
 * Generate scatter chart content
 *
 * Renders scatter chart based on scatterStyle:
 * - none: No visual elements
 * - line: Connecting lines only
 * - lineMarker: Lines with markers at data points
 * - marker: Markers only (no connecting lines)
 * - smooth: Smooth Bezier curves
 * - smoothMarker: Smooth curves with markers
 *
 * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
 * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
 */
export function generateScatterChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  config?: ScatterChartConfig
): ChartContent {
  const scatterStyle = config?.scatterStyle ?? "marker";
  const range = getScatterRange(data);
  const { minX, maxX, minY, maxY } = range;

  // Build result object (shared across all code paths)
  const buildResult = (content: string): ChartContent => ({
    content,
    seriesData: data,
    colors,
    chartType: "scatter" as const,
    valueRange: { minVal: minY, maxVal: maxY },
    xValueRange: { minVal: minX, maxVal: maxX },
    categoryLabels: extractCategoryLabels(data),
  });

  // Handle "none" style - axes only
  const baseStyleConfig = SCATTER_STYLE_CONFIG[scatterStyle];
  if (!baseStyleConfig.renderLines && !baseStyleConfig.renderMarkers) {
    return buildResult(drawAxes(chartWidth, chartHeight));
  }

  // Render each series
  const elements: string[] = [];
  data.forEach((series, seriesIndex) => {
    const color = colors[seriesIndex % colors.length];
    const styleConfig = getScatterStyleConfig(scatterStyle, config?.smoothFlags?.[seriesIndex]);
    const screenPoints = calculateScreenPoints(series.values, chartWidth, chartHeight, range);

    if (styleConfig.renderLines) {
      elements.push(renderLine(screenPoints, color, styleConfig.useSmooth));
    }
    if (styleConfig.renderMarkers) {
      elements.push(...renderMarkers(screenPoints, config?.markers?.[seriesIndex], color));
    }
  });

  return buildResult(drawAxes(chartWidth, chartHeight) + elements.join(""));
}

/**
 * Extract category labels from series data (for X-axis)
 */
function extractCategoryLabels(data: readonly SeriesData[]): readonly string[] | undefined {
  // Use xlabels from first series that has them
  for (const series of data) {
    if (series.xlabels && Object.keys(series.xlabels).length > 0) {
      // Convert labels object to array ordered by index
      const indices = Object.keys(series.xlabels).map(Number).sort((a, b) => a - b);
      return indices.map((i) => series.xlabels![String(i)]);
    }
  }
  return undefined;
}
