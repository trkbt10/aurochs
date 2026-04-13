/**
 * @file Chart → ChartConversionResult
 *
 * Charts don't decompose into shapes at the domain level — the
 * chart renderer produces SVG. This module renders the chart to SVG
 * and returns both the SVG string and a bounding-box specification.
 *
 * The caller (typically pptx-to-fig) is responsible for:
 * 1. Rasterizing the SVG to a bitmap (platform-dependent: resvg on Node.js,
 *    canvas on browser)
 * 2. Registering the image in FigDesignDocument.images
 * 3. Creating a FigDesignNode with an IMAGE fill referencing the image
 *
 * This separation keeps interop-drawing-ml platform-independent while
 * ensuring charts are represented as proper Fig images rather than
 * opaque _raw data.
 */

import type { Chart } from "@aurochs-office/chart/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { renderChart } from "@aurochs-renderer/chart/svg";
import type { ChartRenderContext, FillResolver, ResolvedFill } from "@aurochs-renderer/chart/svg";
import { resolveColor, resolveAlpha } from "@aurochs-office/drawing-ml/domain";
import {
  DEFAULT_CHART_SERIES_COLORS,
  DEFAULT_CHART_AXIS_COLOR,
  DEFAULT_CHART_GRIDLINE_COLOR,
  DEFAULT_CHART_TEXT_COLOR,
  DEFAULT_CHART_TEXT_STYLE,
} from "@aurochs-office/pptx/domain";

/**
 * Result of chart-to-fig conversion.
 *
 * Contains the rendered SVG and dimensions needed to construct
 * a FigDesignNode with an IMAGE fill. The caller is responsible
 * for rasterizing the SVG and creating the node.
 */
export type ChartConversionResult = {
  /** Rendered SVG string (complete <svg> element) */
  readonly svg: string;
  /** Chart width in pixels */
  readonly width: number;
  /** Chart height in pixels */
  readonly height: number;
};

/**
 * Render a Chart domain object to SVG.
 *
 * Returns the rendered SVG and dimensions, or undefined if the chart
 * has no renderable data or rendering fails.
 *
 * @param chart - Parsed Chart domain object from ResourceStore
 * @param width - Chart frame width in pixels
 * @param height - Chart frame height in pixels
 * @param colorContext - For resolving theme colors
 * @param name - Shape name (used in warning messages)
 */
export function renderChartToSvg(
  chart: Chart,
  width: number,
  height: number,
  colorContext?: ColorContext,
  name = "Chart",
): ChartConversionResult | undefined {
  if (chart.plotArea.charts.length === 0) {
    console.warn(`[chart-to-fig] Chart "${name}" has no renderable data.`);
    return undefined;
  }

  const ctx = createDefaultChartContext(colorContext);
  const fillResolver = createDefaultFillResolver(colorContext);

  let svg: string;
  try {
    svg = renderChart({ chart, width, height, ctx, fillResolver });
  } catch (err) {
    console.warn(
      `[chart-to-fig] Failed to render chart "${name}":`,
      err instanceof Error ? err.message : err,
    );
    return undefined;
  }

  return { svg, width, height };
}

/**
 * Create a default ChartRenderContext that resolves colors via
 * the DrawingML color resolution SoT and falls back to theme defaults
 * from @aurochs-office/pptx/domain/defaults.
 */
function createDefaultChartContext(colorContext?: ColorContext): ChartRenderContext {
  return {
    getSeriesColor(index: number, explicit?: BaseFill): string {
      if (explicit && explicit.type === "solidFill") {
        const hex = resolveColor(explicit.color, colorContext);
        if (hex) return `#${hex}`;
      }
      return `#${DEFAULT_CHART_SERIES_COLORS[index % DEFAULT_CHART_SERIES_COLORS.length]}`;
    },
    getAxisColor(): string {
      return `#${DEFAULT_CHART_AXIS_COLOR}`;
    },
    getGridlineColor(): string {
      return `#${DEFAULT_CHART_GRIDLINE_COLOR}`;
    },
    getTextStyle() {
      return {
        fontFamily: DEFAULT_CHART_TEXT_STYLE.fontFamily,
        fontSize: DEFAULT_CHART_TEXT_STYLE.fontSize,
        fontWeight: DEFAULT_CHART_TEXT_STYLE.fontWeight,
        color: `#${DEFAULT_CHART_TEXT_COLOR}`,
      };
    },
    warnings: {
      add(warning) { console.warn(`[chart-to-fig] ${warning.message}`); },
      getAll() { return []; },
      hasErrors() { return false; },
    },
  };
}

/**
 * Create a FillResolver that delegates color resolution to the
 * DrawingML color resolution SoT.
 */
function createDefaultFillResolver(colorContext?: ColorContext): FillResolver {
  return {
    resolve(fill: BaseFill): ResolvedFill {
      switch (fill.type) {
        case "solidFill": {
          const hex = resolveColor(fill.color, colorContext) ?? "000000";
          const alpha = resolveAlpha(fill.color);
          return { type: "solid", color: { hex: `#${hex}`, alpha } };
        }
        case "noFill":
          return { type: "none" };
        case "gradientFill": {
          const stops = fill.stops.map((s) => {
            const sHex = resolveColor(s.color, colorContext) ?? "000000";
            const sAlpha = resolveAlpha(s.color);
            return { color: { hex: `#${sHex}`, alpha: sAlpha }, position: (s.position) / 100 };
          });
          return {
            type: "gradient",
            stops,
            angle: fill.linear ? (fill.linear.angle) : 0,
            isRadial: !!fill.path,
          };
        }
        case "patternFill":
          return { type: "pattern", preset: fill.preset };
        default:
          return { type: "none" };
      }
    },
  };
}
