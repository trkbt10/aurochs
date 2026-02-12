/**
 * @file Chart Placeholder Component
 *
 * Renders a placeholder for chart drawings.
 * When parsed chart data is provided, renders the actual chart using the chart renderer.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 */

import { memo, useMemo } from "react";
import type { DocxChart } from "@aurochs-office/docx/domain/drawing";
import type { Chart } from "@aurochs-office/chart/domain";
import type { DocxDrawingRenderContext } from "../context";
import { renderChart, hasChartData } from "../../chart";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ChartPlaceholder component.
 */
export type ChartPlaceholderProps = {
  /** Chart reference data */
  readonly chart: DocxChart;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** X position in pixels */
  readonly x?: number;
  /** Y position in pixels */
  readonly y?: number;
  /** Parsed chart data (optional - when provided, renders actual chart) */
  readonly chartData?: Chart;
  /** DOCX drawing render context (required when chartData is provided) */
  readonly renderContext?: DocxDrawingRenderContext;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Extract SVG content from rendered chart HTML.
 */
function extractSvgContent(html: string): string | null {
  // Remove the outer <svg> wrapper if present
  const svgMatch = /<svg[^>]*>([\s\S]*)<\/svg>/i.exec(html);
  if (svgMatch !== null) {
    return svgMatch[1];
  }
  return html;
}

/**
 * Renders a chart placeholder as SVG elements.
 *
 * When chartData and renderContext are provided, renders the actual chart.
 * Otherwise, renders a placeholder with information about the chart reference.
 */
function ChartPlaceholderBase({
  chart,
  width,
  height,
  x = 0,
  y = 0,
  chartData,
  renderContext,
}: ChartPlaceholderProps) {
  // Try to render actual chart if data is provided
  const chartSvg = useMemo(() => {
    if (chartData === undefined || renderContext === undefined) {
      return null;
    }

    if (!hasChartData(chartData)) {
      return null;
    }

    try {
      const svg = renderChart({
        chart: chartData,
        width,
        height,
        ctx: renderContext,
      });
      return extractSvgContent(svg);
    } catch (error: unknown) {
      // Fall back to placeholder on error
      // Log error in development for debugging
      if (process.env.NODE_ENV === "development") {
        console.warn("Chart rendering failed:", error);
      }
      return null;
    }
  }, [chartData, renderContext, width, height]);

  // Render actual chart if available
  if (chartSvg !== null) {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        data-element-type="chart"
        data-chart-rid={chart.rId}
        dangerouslySetInnerHTML={{ __html: chartSvg }}
      />
    );
  }
  const fontSize = Math.min(12, width / 10);
  const iconSize = Math.min(24, Math.min(width, height) / 4);
  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-element-type="chart-placeholder"
      data-chart-rid={chart.rId}
    >
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#f8f9fa"
        stroke="#dee2e6"
        strokeWidth={1}
      />

      {/* Chart icon (simple bar chart representation) */}
      <g transform={`translate(${centerX - iconSize / 2}, ${centerY - iconSize / 2 - fontSize})`}>
        {/* Bar 1 */}
        <rect
          x={0}
          y={iconSize * 0.6}
          width={iconSize * 0.25}
          height={iconSize * 0.4}
          fill="#6c757d"
        />
        {/* Bar 2 */}
        <rect
          x={iconSize * 0.3}
          y={iconSize * 0.3}
          width={iconSize * 0.25}
          height={iconSize * 0.7}
          fill="#6c757d"
        />
        {/* Bar 3 */}
        <rect
          x={iconSize * 0.6}
          y={iconSize * 0.15}
          width={iconSize * 0.25}
          height={iconSize * 0.85}
          fill="#6c757d"
        />
        {/* Baseline */}
        <line
          x1={0}
          y1={iconSize}
          x2={iconSize}
          y2={iconSize}
          stroke="#6c757d"
          strokeWidth={2}
        />
      </g>

      {/* Label */}
      <text
        x={centerX}
        y={centerY + iconSize / 2 + fontSize}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fill="#6c757d"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Chart
      </text>

      {/* Relationship ID (smaller text) */}
      <text
        x={centerX}
        y={centerY + iconSize / 2 + fontSize * 2.2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize * 0.7}
        fill="#adb5bd"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {chart.rId}
      </text>
    </g>
  );
}

/**
 * Memoized ChartPlaceholder component.
 */
export const ChartPlaceholder = memo(ChartPlaceholderBase);
