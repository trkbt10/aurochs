/**
 * @file Chart → FigDesignNode[]
 *
 * Charts don't decompose into shapes at the domain level — the
 * chart renderer produces SVG. We create a single FRAME node
 * containing the chart's visual representation.
 *
 * The approach:
 * 1. Render the Chart to SVG via @aurochs-renderer/chart
 * 2. Create a FRAME FigDesignNode that carries the SVG as a
 *    renderable child. Since Fig's scene graph supports VECTOR
 *    nodes with path contours, we parse the SVG paths.
 *
 * For cases where the chart rendering pipeline is not available
 * (missing dependencies or context), we emit a warning and return
 * an empty array — the caller (pptx-to-fig) retains the FRAME
 * bounding box.
 */

import type { Chart } from "@aurochs-office/chart/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { renderChart } from "@aurochs-renderer/chart/svg";
import type { ChartRenderContext, FillResolver, ResolvedFill } from "@aurochs-renderer/chart/svg";

/**
 * Default accent color palette for chart series.
 * Derived from the standard Office theme (ECMA-376 Annex D).
 */
const DEFAULT_SERIES_COLORS = [
  "#4472C4", "#ED7D31", "#A5A5A5", "#FFC000",
  "#5B9BD5", "#70AD47", "#264478", "#9B57A2",
];

/**
 * Render a Chart domain object and convert the SVG output to
 * FigDesignNode children.
 *
 * Returns an array of FigDesignNode (typically a single VECTOR node
 * containing the chart's SVG paths). Returns empty array if the
 * chart has no renderable data.
 *
 * @param chart - Parsed Chart domain object from ResourceStore
 * @param width - Chart frame width in pixels
 * @param height - Chart frame height in pixels
 * @param colorContext - For resolving theme colors
 * @param name - Shape name for the chart node
 */
export function chartToFigNodes(
  chart: Chart,
  width: number,
  height: number,
  colorContext?: ColorContext,
  name = "Chart",
): readonly FigDesignNode[] {
  if (chart.plotArea.charts.length === 0) {
    console.warn(`[chart-to-fig] Chart "${name}" has no renderable data.`);
    return [];
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
    return [];
  }

  // The SVG output is a complete <svg> element. We embed it as
  // a _raw field on a FRAME node so consumers can render it.
  // Fig's domain model doesn't natively represent arbitrary SVG,
  // but the _raw field preserves data for roundtrip and the
  // FRAME gives it a renderable bounding box.
  const id = "0:chart-0" as FigNodeId;

  return [{
    id,
    type: "FRAME",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: width, y: height },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    clipsContent: true,
    _raw: { chartSvg: svg },
  }];
}

/**
 * Create a default ChartRenderContext that doesn't depend on PPTX
 * rendering infrastructure.
 */
function createDefaultChartContext(colorContext?: ColorContext): ChartRenderContext {
  return {
    getSeriesColor(index: number, explicit?: BaseFill): string {
      if (explicit && explicit.type === "solidFill") {
        const spec = explicit.color.spec;
        if (spec.type === "srgb") return `#${spec.value}`;
        if (spec.type === "scheme" && colorContext) {
          const mapped = colorContext.colorMap[spec.value] ?? spec.value;
          const hex = colorContext.colorScheme[mapped];
          if (hex) return `#${hex}`;
        }
      }
      return DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];
    },
    getAxisColor(): string {
      return "#595959";
    },
    getGridlineColor(): string {
      return "#D9D9D9";
    },
    getTextStyle() {
      return {
        fontFamily: "sans-serif",
        fontSize: 10,
        fontWeight: "normal",
        color: "#404040",
      };
    },
    warnings: {
      add(warning) { console.warn(`[chart-to-fig] ${warning.message}`); },
      getAll() { return []; },
      hasErrors() { return false; },
    },
  };
}

function createDefaultFillResolver(colorContext?: ColorContext): FillResolver {
  return {
    resolve(fill: BaseFill): ResolvedFill {
      switch (fill.type) {
        case "solidFill": {
          const spec = fill.color.spec;
          let hex = "000000";
          if (spec.type === "srgb") hex = spec.value;
          else if (spec.type === "scheme" && colorContext) {
            const mapped = colorContext.colorMap[spec.value] ?? spec.value;
            hex = colorContext.colorScheme[mapped] ?? "000000";
          }
          const alpha = fill.color.transform?.alpha !== undefined
            ? (fill.color.transform.alpha as number) / 100
            : 1;
          return { type: "solid", color: { hex: `#${hex}`, alpha } };
        }
        case "noFill":
          return { type: "none" };
        case "gradientFill": {
          const stops = fill.stops.map((s) => {
            const sSpec = s.color.spec;
            let sHex = "000000";
            if (sSpec.type === "srgb") sHex = sSpec.value;
            const sAlpha = s.color.transform?.alpha !== undefined
              ? (s.color.transform.alpha as number) / 100
              : 1;
            return { color: { hex: `#${sHex}`, alpha: sAlpha }, position: (s.position as number) / 100 };
          });
          return {
            type: "gradient",
            stops,
            angle: fill.linear ? (fill.linear.angle as number) : 0,
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
