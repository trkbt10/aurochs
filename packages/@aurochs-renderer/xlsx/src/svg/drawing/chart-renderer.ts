/**
 * @file Chart renderer for XLSX drawings
 *
 * Renders XlsxChartFrame elements to SVG by delegating to the chart renderer.
 */

import type { XlsxChartFrame } from "@aurochs-office/xlsx/domain/drawing/types";
import type { Chart } from "@aurochs-office/chart/domain";
import { renderChart } from "@aurochs-renderer/chart/svg";
import type { ChartRenderContext, FillResolver, ResolvedFill, ResolvedTextStyle } from "@aurochs-renderer/chart/svg";
import type { WarningCollector } from "@aurochs-office/ooxml";
import type { DrawingBounds } from "../drawing-layout";
import type { WarningsCollector } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Chart resolver function type.
 * Returns a Chart object for the given relationship ID or path.
 */
export type ChartResolver = (relIdOrPath: string) => Chart | undefined;

/**
 * Options for rendering a chart frame.
 */
export type RenderChartFrameOptions = {
  /** The chart frame element to render */
  readonly chartFrame: XlsxChartFrame;
  /** Calculated pixel bounds */
  readonly bounds: DrawingBounds;
  /** Function to resolve chart relationship ID or path to Chart object */
  readonly resolveChart?: ChartResolver;
  /** Warnings collector */
  readonly warnings?: WarningsCollector;
};

// =============================================================================
// Default Context Factory
// =============================================================================

/**
 * Default color palette for chart series.
 * Matches Excel's default color scheme.
 */
const DEFAULT_SERIES_COLORS = [
  "#4472C4", // Blue
  "#ED7D31", // Orange
  "#A5A5A5", // Gray
  "#FFC000", // Yellow
  "#5B9BD5", // Light Blue
  "#70AD47", // Green
  "#264478", // Dark Blue
  "#9E480E", // Dark Orange
  "#636363", // Dark Gray
  "#997300", // Dark Yellow
];

/**
 * Create a default chart render context for XLSX charts.
 */
function createDefaultChartRenderContext(warnings?: WarningsCollector): ChartRenderContext {
  const warningCollector: WarningCollector = {
    add: (warning) => {
      warnings?.add(`Chart warning: ${warning.message}`);
    },
    getAll: () => [],
    hasErrors: () => false,
  };

  return {
    getSeriesColor: (index: number) => {
      return DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];
    },
    getAxisColor: () => "#595959",
    getGridlineColor: () => "#D9D9D9",
    getTextStyle: (): ResolvedTextStyle => ({
      fontFamily: "Calibri, sans-serif",
      fontSize: 11,
      fontWeight: "normal",
      color: "#404040",
    }),
    warnings: warningCollector,
  };
}

/**
 * Resolve hex color from Color spec.
 */
function resolveColorHex(color: { readonly spec: { readonly type: string; readonly value?: string } }): string {
  const spec = color.spec;
  if (spec.type === "srgb" && spec.value) {
    return `#${spec.value}`;
  }
  if (spec.type === "scheme" && spec.value) {
    // Map common scheme colors to defaults
    const schemeColorMap: Record<string, string> = {
      dk1: "#000000",
      dk2: "#44546A",
      lt1: "#FFFFFF",
      lt2: "#E7E6E6",
      accent1: "#4472C4",
      accent2: "#ED7D31",
      accent3: "#A5A5A5",
      accent4: "#FFC000",
      accent5: "#5B9BD5",
      accent6: "#70AD47",
      tx1: "#000000",
      tx2: "#44546A",
      bg1: "#FFFFFF",
      bg2: "#E7E6E6",
    };
    return schemeColorMap[spec.value] ?? "#000000";
  }
  return "#000000";
}

/**
 * Create a default fill resolver for XLSX charts.
 */
function createDefaultFillResolver(): FillResolver {
  return {
    resolve: (fill): ResolvedFill => {
      if (!fill) {
        return { type: "none" };
      }

      // Handle solid fill
      if (fill.type === "solidFill") {
        const color = fill.color;
        if (!color) {
          return { type: "none" };
        }

        return {
          type: "solid",
          color: {
            hex: resolveColorHex(color),
            alpha: 1,
          },
        };
      }

      // Handle gradient fill
      if (fill.type === "gradientFill") {
        const stops = fill.stops.map((stop) => ({
          color: {
            hex: resolveColorHex(stop.color),
            alpha: 1,
          },
          position: stop.position / 100,
        }));

        const angle = fill.linear?.angle ?? 0;
        const isRadial = fill.path !== undefined;

        return {
          type: "gradient",
          stops,
          angle,
          isRadial,
        };
      }

      // Handle noFill
      if (fill.type === "noFill") {
        return { type: "none" };
      }

      // Handle groupFill
      if (fill.type === "groupFill") {
        return { type: "none" };
      }

      // Handle patternFill
      if (fill.type === "patternFill") {
        return { type: "pattern", preset: fill.preset };
      }

      // Handle blip fill
      if (fill.type === "blip") {
        return { type: "unresolved", originalType: "blip" };
      }

      return { type: "unresolved" };
    },
  };
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render a chart frame element to SVG.
 *
 * @param options - Render options
 * @returns SVG string for the chart
 */
export function renderChartFrame(options: RenderChartFrameOptions): string {
  const { chartFrame, bounds, resolveChart, warnings } = options;

  // Skip if no bounds
  if (bounds.width <= 0 || bounds.height <= 0) {
    return "";
  }

  // Resolve chart
  let chart: Chart | undefined;

  if (chartFrame.chartPath && resolveChart) {
    chart = resolveChart(chartFrame.chartPath);
  } else if (chartFrame.chartRelId && resolveChart) {
    chart = resolveChart(chartFrame.chartRelId);
  }

  if (!chart) {
    warnings?.add(`Chart not found: ${chartFrame.nvGraphicFramePr.name || chartFrame.chartRelId || "unknown"}`);
    return renderPlaceholder(bounds, "Chart");
  }

  // Create chart render context
  const ctx = createDefaultChartRenderContext(warnings);
  const fillResolver = createDefaultFillResolver();

  // Render chart
  const chartSvg = renderChart({
    chart,
    width: bounds.width,
    height: bounds.height,
    ctx,
    fillResolver,
  });

  // Wrap in positioned group
  return `<g transform="translate(${bounds.x}, ${bounds.y})">${chartSvg}</g>`;
}

/**
 * Render a placeholder when chart is not available.
 */
function renderPlaceholder(bounds: DrawingBounds, label: string): string {
  const { x, y, width, height } = bounds;

  return `<g class="chart-placeholder">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f5f5f5" stroke="#ccc" stroke-width="1"/>
    <text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="#999">${label}</text>
  </g>`;
}
