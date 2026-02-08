/**
 * @file Chart legend utilities
 *
 * Rendering functions for chart legends.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.3.24 (ST_LegendPos)
 */

import type { Legend, LegendEntry, ChartShapeProperties, Layout } from "@aurochs-office/chart/domain";
import type { SeriesData } from "./render-types";
import { escapeHtml } from "./escape-html";
import { LEGEND_ITEM_HEIGHT, LEGEND_ITEM_PADDING, calculateLegendDimensions } from "./layout";
import type { ChartRenderContext, FillResolver, GenericTextBody, ResolvedFill } from "./types";
import { toSvgTextAttributes } from "./svg-text";

// =============================================================================
// Legend Entry Utilities
// =============================================================================

/**
 * Check if a legend entry should be hidden
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 */
function isEntryDeleted(entries: readonly LegendEntry[] | undefined, idx: number): boolean {
  if (!entries) {
    return false;
  }
  const entry = entries.find((e) => e.idx === idx);
  return entry?.delete === true;
}

/**
 * Get text properties for a specific legend entry
 *
 * Returns entry-specific text properties if available, otherwise returns undefined
 * (indicating default legend text properties should be used).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
 */
function getEntryTextProperties(entries: readonly LegendEntry[] | undefined, idx: number): GenericTextBody | undefined {
  if (!entries) {
    return undefined;
  }
  const entry = entries.find((e) => e.idx === idx);
  return entry?.textProperties;
}

// =============================================================================
// Shape Properties Rendering
// =============================================================================

/**
 * Default legend background (implementation-defined)
 * ECMA-376 does not specify defaults; this provides visual clarity
 */
const DEFAULT_LEGEND_BACKGROUND = "rgba(255,255,255,0.9)";
const DEFAULT_LEGEND_BORDER_COLOR = "#cccccc";
const DEFAULT_LEGEND_BORDER_WIDTH = 1;
const DEFAULT_LEGEND_PADDING = 8;

function normalizeHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}

function resolvedFillToColor(fill: ResolvedFill): string | undefined {
  if (fill.type === "solid") {
    return normalizeHexColor(fill.color.hex);
  }
  if (fill.type === "gradient") {
    const first = fill.stops[0];
    if (!first) {
      return undefined;
    }
    return normalizeHexColor(first.color.hex);
  }
  return undefined;
}

/**
 * Render legend background and border from shape properties
 *
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */
function renderLegendBackground({
  x,
  y,
  width,
  height,
  spPr,
  fillResolver,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  spPr: ChartShapeProperties | undefined;
  fillResolver: FillResolver;
}): string {
  const fillColor = resolveLegendBackgroundFillColor(spPr?.fill, fillResolver);
  const borderColor = resolveLegendBorderColor(spPr?.line?.fill, fillResolver);
  const borderWidth = spPr?.line?.width ?? DEFAULT_LEGEND_BORDER_WIDTH;

  return (
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `fill="${fillColor}" stroke="${borderColor}" stroke-width="${borderWidth}" rx="3"/>`
  );
}

function resolveLegendBackgroundFillColor(
  fill: ChartShapeProperties["fill"] | undefined,
  fillResolver: FillResolver,
): string {
  if (!fill) {
    return DEFAULT_LEGEND_BACKGROUND;
  }
  return resolvedFillToColor(fillResolver.resolve(fill)) ?? DEFAULT_LEGEND_BACKGROUND;
}

function resolveLegendBorderColor(fill: ChartShapeProperties["fill"] | undefined, fillResolver: FillResolver): string {
  if (!fill) {
    return DEFAULT_LEGEND_BORDER_COLOR;
  }
  return resolvedFillToColor(fillResolver.resolve(fill)) ?? DEFAULT_LEGEND_BORDER_COLOR;
}

// =============================================================================
// Legend Rendering
// =============================================================================

/**
 * Legend position configuration
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 */
type LegendPosition = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Calculate legend position based on ECMA-376 legendPos
 * @see ECMA-376 Part 1, Section 21.2.3.24 (ST_LegendPos)
 */
export function calculateLegendPosition({
  position,
  chartWidth,
  chartHeight,
  legendWidth,
  legendHeight,
}: {
  position: Legend["position"];
  chartWidth: number;
  chartHeight: number;
  legendWidth: number;
  legendHeight: number;
}): LegendPosition {
  switch (position) {
    case "r": // Right
      return {
        x: chartWidth - legendWidth - 10,
        y: (chartHeight - legendHeight) / 2,
        width: legendWidth,
        height: legendHeight,
      };
    case "l": // Left
      return {
        x: 10,
        y: (chartHeight - legendHeight) / 2,
        width: legendWidth,
        height: legendHeight,
      };
    case "t": // Top
      return {
        x: (chartWidth - legendWidth) / 2,
        y: 10,
        width: legendWidth,
        height: legendHeight,
      };
    case "b": // Bottom
      return {
        x: (chartWidth - legendWidth) / 2,
        y: chartHeight - legendHeight - 10,
        width: legendWidth,
        height: legendHeight,
      };
    case "tr": // Top-right
      return {
        x: chartWidth - legendWidth - 10,
        y: 10,
        width: legendWidth,
        height: legendHeight,
      };
    default:
      return {
        x: chartWidth - legendWidth - 10,
        y: (chartHeight - legendHeight) / 2,
        width: legendWidth,
        height: legendHeight,
      };
  }
}

/**
 * Render chart legend
 *
 * Applies font size and weight from c:txPr (text properties).
 * Renders background and border from c:spPr (shape properties).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr) - shape properties
 */
export function renderLegend({
  legend,
  seriesData,
  colors,
  chartWidth,
  chartHeight,
  ctx,
  fillResolver,
}: {
  legend: Legend | undefined;
  seriesData: readonly SeriesData[];
  colors: readonly string[];
  chartWidth: number;
  chartHeight: number;
  ctx: ChartRenderContext;
  fillResolver: FillResolver;
}): string {
  if (!legend) {
    return "";
  }

  const itemHeight = 20;
  const itemPadding = 5;
  const colorBoxSize = 12;
  const legendDims = calculateLegendDimensions(seriesData.length);
  const legendWidth = legendDims.width;
  const legendHeight = legendDims.height;

  const pos = calculateLegendPosition({
    position: legend.position,
    chartWidth,
    chartHeight,
    legendWidth,
    legendHeight,
  });

  const textStyle = ctx.getTextStyle(legend.textProperties);
  const textStyleAttrs = toSvgTextAttributes(textStyle);
  const textColor = textStyle.color;

  const items: string[] = [];

  // Render background with shape properties
  items.push(
    renderLegendBackground({
      x: pos.x,
      y: pos.y,
      width: legendWidth,
      height: legendHeight,
      spPr: legend.shapeProperties,
      fillResolver,
    }),
  );

  seriesData.forEach((series, index) => {
    const color = colors[index % colors.length];
    const y = pos.y + DEFAULT_LEGEND_PADDING + index * (itemHeight + itemPadding);

    // Color box
    items.push(
      `<rect x="${pos.x + DEFAULT_LEGEND_PADDING}" y="${y + (itemHeight - colorBoxSize) / 2}" ` +
        `width="${colorBoxSize}" height="${colorBoxSize}" fill="${color}"/>`,
    );

    // Series name
    items.push(
      `<text x="${pos.x + DEFAULT_LEGEND_PADDING + colorBoxSize + 5}" y="${y + itemHeight / 2 + 4}" ` +
        `${textStyleAttrs} fill="${textColor}">${escapeHtml(series.key)}</text>`,
    );
  });

  return items.join("");
}

/**
 * Render legend at a pre-calculated position
 *
 * Applies font size and weight from c:txPr (text properties).
 * Renders background and border from c:spPr (shape properties).
 * Supports manual layout dimensions from c:layout.
 * Supports per-entry formatting from c:legendEntry.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry) - per-entry formatting
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr) - shape properties
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout) - manual layout
 */
export function renderLegendAtPosition({
  legend,
  seriesData,
  colors,
  pos,
  ctx,
  fillResolver,
  chartDimensions,
}: {
  legend: Legend | undefined;
  seriesData: readonly SeriesData[];
  colors: readonly string[];
  pos: { x: number; y: number };
  ctx: ChartRenderContext;
  fillResolver: FillResolver;
  chartDimensions?: { width: number; height: number };
}): string {
  if (!legend || seriesData.length === 0) {
    return "";
  }

  const itemPadding = LEGEND_ITEM_PADDING;
  const colorBoxSize = 12;

  // Filter out deleted entries
  // @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry delete attribute)
  const visibleSeries = resolveVisibleSeries(seriesData, colors, legend.entries);

  if (visibleSeries.length === 0) {
    return "";
  }

  // Calculate legend dimensions based on visible series count
  // Use manual layout dimensions if available, otherwise auto-calculate
  const { width: legendWidth, height: legendHeight } = resolveLegendDimensions(
    visibleSeries.length,
    legend.layout?.manualLayout,
    chartDimensions,
  );

  const defaultTextStyle = ctx.getTextStyle(legend.textProperties);

  const items: string[] = [];

  // Render background with shape properties
  items.push(
    renderLegendBackground({
      x: pos.x,
      y: pos.y,
      width: legendWidth,
      height: legendHeight,
      spPr: legend.shapeProperties,
      fillResolver,
    }),
  );

  visibleSeries.forEach((seriesItem, index) => {
    const { data: series, color, idx } = seriesItem;
    const y = pos.y + DEFAULT_LEGEND_PADDING + index * (LEGEND_ITEM_HEIGHT + itemPadding);

    // Get entry-specific text properties if available
    // @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry txPr)
    const entryTextProps = getEntryTextProperties(legend.entries, idx);

    // Use entry-specific styling if available, otherwise use legend defaults
    const textStyle = entryTextProps ? ctx.getTextStyle(entryTextProps) : defaultTextStyle;
    const textStyleAttrs = toSvgTextAttributes(textStyle);
    const textColor = textStyle.color;

    // Color box
    items.push(
      `<rect x="${pos.x + DEFAULT_LEGEND_PADDING}" y="${y + (LEGEND_ITEM_HEIGHT - colorBoxSize) / 2}" ` +
        `width="${colorBoxSize}" height="${colorBoxSize}" fill="${color}"/>`,
    );

    // Series name with entry-specific styling
    items.push(
      `<text x="${pos.x + DEFAULT_LEGEND_PADDING + colorBoxSize + 5}" y="${y + LEGEND_ITEM_HEIGHT / 2 + 4}" ` +
        `${textStyleAttrs} fill="${textColor}">${escapeHtml(series.key)}</text>`,
    );
  });

  return items.join("");
}

function resolveVisibleSeries(
  seriesData: readonly SeriesData[],
  colors: readonly string[],
  entries: Legend["entries"],
): { data: SeriesData; color: string; idx: number }[] {
  const visibleSeries: { data: SeriesData; color: string; idx: number }[] = [];
  seriesData.forEach((series, idx) => {
    if (!isEntryDeleted(entries, idx)) {
      visibleSeries.push({
        data: series,
        color: colors[idx % colors.length],
        idx,
      });
    }
  });
  return visibleSeries;
}

function resolveLegendDimensions(
  seriesCount: number,
  manualLayout: Layout["manualLayout"] | undefined,
  chartDimensions: { width: number; height: number } | undefined,
): { width: number; height: number } {
  if (hasManualLegendDimensions(manualLayout, chartDimensions) && chartDimensions) {
    return {
      width: manualLayout.w * chartDimensions.width,
      height: manualLayout.h * chartDimensions.height,
    };
  }

  return calculateLegendDimensions(seriesCount);
}

function hasManualLegendDimensions(
  manualLayout: Layout["manualLayout"] | undefined,
  chartDimensions: { width: number; height: number } | undefined,
): manualLayout is { w: number; h: number } {
  if (!manualLayout) {
    return false;
  }
  if (!chartDimensions) {
    return false;
  }
  if (manualLayout.w === undefined) {
    return false;
  }
  if (manualLayout.h === undefined) {
    return false;
  }
  return true;
}

/**
 * Check if legend should overlay on the plot area
 *
 * When overlay is true, the legend is positioned on top of the plot area
 * rather than taking space from it.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.123 (overlay)
 */
export function isLegendOverlay(legend: Legend | undefined): boolean {
  return legend?.overlay === true;
}
