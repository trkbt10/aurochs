/**
 * @file Chart legend utilities
 *
 * Rendering functions for chart legends.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.3.24 (ST_LegendPos)
 */

import type { Legend, LegendEntry, ChartShapeProperties, Layout } from "../../../domain/chart";
import type { Fill } from "../../../domain/color";
import type { TextBody } from "../../../domain/text";
import type { SeriesData } from "./types";
import { escapeHtml } from "../../html/index";
import { LEGEND_ITEM_HEIGHT, LEGEND_ITEM_PADDING, calculateLegendDimensions } from "./layout";
import { extractFontSize, extractBold, extractItalic } from "./text-props";
import { resolveColor } from "../../../core/dml/render/color";

// =============================================================================
// Legend Entry Utilities
// =============================================================================

/**
 * Check if a legend entry should be hidden
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 */
function isEntryDeleted(entries: readonly LegendEntry[] | undefined, idx: number): boolean {
  if (!entries) {return false;}
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
function getEntryTextProperties(
  entries: readonly LegendEntry[] | undefined,
  idx: number
): TextBody | undefined {
  if (!entries) {return undefined;}
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

/**
 * Extract fill color from ChartShapeProperties
 *
 * @see ECMA-376 Part 1, Section 20.1.8.54 (a:solidFill)
 */
function extractFillColor(spPr: ChartShapeProperties | undefined): string | undefined {
  if (!spPr?.fill) {return undefined;}

  return resolveSolidFillColor(spPr.fill);
}

/**
 * Extract line (border) properties from ChartShapeProperties
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
function extractBorderStyle(spPr: ChartShapeProperties | undefined): {
  color: string | undefined;
  width: number | undefined;
} {
  if (!spPr?.line) {return { color: undefined, width: undefined };}

  const color = resolveSolidFillColor(spPr.line.fill);

  return {
    color,
    width: spPr.line.width,
  };
}

function resolveSolidFillColor(fill: Fill | undefined): string | undefined {
  if (!fill) {
    return undefined;
  }
  if (fill.type === "solidFill") {
    const hex = resolveColor(fill.color);
    return hex ? `#${hex}` : undefined;
  }
  if (fill.type === "gradientFill" && fill.stops.length > 0) {
    const hex = resolveColor(fill.stops[0].color);
    return hex ? `#${hex}` : undefined;
  }
  return undefined;
}

/**
 * Render legend background and border from shape properties
 *
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */
function renderLegendBackground(
  x: number,
  y: number,
  width: number,
  height: number,
  spPr: ChartShapeProperties | undefined
): string {
  const fillColor = extractFillColor(spPr) ?? DEFAULT_LEGEND_BACKGROUND;
  const border = extractBorderStyle(spPr);
  const borderColor = border.color ?? DEFAULT_LEGEND_BORDER_COLOR;
  const borderWidth = border.width ?? DEFAULT_LEGEND_BORDER_WIDTH;

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `fill="${fillColor}" stroke="${borderColor}" stroke-width="${borderWidth}" rx="3"/>`;
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
export function calculateLegendPosition(
  position: Legend["position"],
  chartWidth: number,
  chartHeight: number,
  legendWidth: number,
  legendHeight: number
): LegendPosition {
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
export function renderLegend(
  legend: Legend | undefined,
  seriesData: readonly SeriesData[],
  colors: readonly string[],
  chartWidth: number,
  chartHeight: number
): string {
  if (!legend) {return "";}

  const itemHeight = 20;
  const itemPadding = 5;
  const colorBoxSize = 12;
  const legendDims = calculateLegendDimensions(seriesData.length);
  const legendWidth = legendDims.width;
  const legendHeight = legendDims.height;

  const pos = calculateLegendPosition(
    legend.position,
    chartWidth,
    chartHeight,
    legendWidth,
    legendHeight
  );

  // Get font style from textProperties (c:txPr)
  const fontSize = extractFontSize(legend.textProperties);
  const isBold = extractBold(legend.textProperties);
  const isItalic = extractItalic(legend.textProperties);
  const fontWeight = isBold ? ' font-weight="bold"' : "";
  const fontStyle = isItalic ? ' font-style="italic"' : "";

  const items: string[] = [];

  // Render background with shape properties
  items.push(renderLegendBackground(pos.x, pos.y, legendWidth, legendHeight, legend.shapeProperties));

  seriesData.forEach((series, index) => {
    const color = colors[index % colors.length];
    const y = pos.y + DEFAULT_LEGEND_PADDING + index * (itemHeight + itemPadding);

    // Color box
    items.push(
      `<rect x="${pos.x + DEFAULT_LEGEND_PADDING}" y="${y + (itemHeight - colorBoxSize) / 2}" ` +
        `width="${colorBoxSize}" height="${colorBoxSize}" fill="${color}"/>`
    );

    // Series name
    items.push(
      `<text x="${pos.x + DEFAULT_LEGEND_PADDING + colorBoxSize + 5}" y="${y + itemHeight / 2 + 4}" ` +
        `font-size="${fontSize}"${fontWeight}${fontStyle} fill="#333">${escapeHtml(series.key)}</text>`
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
export function renderLegendAtPosition(
  legend: Legend | undefined,
  seriesData: readonly SeriesData[],
  colors: readonly string[],
  pos: { x: number; y: number },
  chartDimensions?: { width: number; height: number }
): string {
  if (!legend || seriesData.length === 0) {return "";}

  const itemPadding = LEGEND_ITEM_PADDING;
  const colorBoxSize = 12;

  // Filter out deleted entries
  // @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry delete attribute)
  const visibleSeries = resolveVisibleSeries(seriesData, colors, legend.entries);

  if (visibleSeries.length === 0) {return "";}

  // Calculate legend dimensions based on visible series count
  // Use manual layout dimensions if available, otherwise auto-calculate
  const { width: legendWidth, height: legendHeight } = resolveLegendDimensions(
    visibleSeries.length,
    legend.layout?.manualLayout,
    chartDimensions
  );

  // Get default font style from legend textProperties (c:txPr)
  const defaultFontSize = extractFontSize(legend.textProperties);
  const defaultBold = extractBold(legend.textProperties);
  const defaultItalic = extractItalic(legend.textProperties);

  const items: string[] = [];

  // Render background with shape properties
  items.push(renderLegendBackground(pos.x, pos.y, legendWidth, legendHeight, legend.shapeProperties));

  visibleSeries.forEach((seriesItem, index) => {
    const { data: series, color, idx } = seriesItem;
    const y = pos.y + DEFAULT_LEGEND_PADDING + index * (LEGEND_ITEM_HEIGHT + itemPadding);

    // Get entry-specific text properties if available
    // @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry txPr)
    const entryTextProps = getEntryTextProperties(legend.entries, idx);

    // Use entry-specific styling if available, otherwise use legend defaults
    const fontSize = entryTextProps ? extractFontSize(entryTextProps) : defaultFontSize;
    const isBold = entryTextProps ? extractBold(entryTextProps) : defaultBold;
    const isItalic = entryTextProps ? extractItalic(entryTextProps) : defaultItalic;
    const fontWeight = isBold ? ' font-weight="bold"' : "";
    const fontStyle = isItalic ? ' font-style="italic"' : "";

    // Color box
    items.push(
      `<rect x="${pos.x + DEFAULT_LEGEND_PADDING}" y="${y + (LEGEND_ITEM_HEIGHT - colorBoxSize) / 2}" ` +
        `width="${colorBoxSize}" height="${colorBoxSize}" fill="${color}"/>`
    );

    // Series name with entry-specific styling
    items.push(
      `<text x="${pos.x + DEFAULT_LEGEND_PADDING + colorBoxSize + 5}" y="${y + LEGEND_ITEM_HEIGHT / 2 + 4}" ` +
        `font-size="${fontSize}"${fontWeight}${fontStyle} fill="#333">${escapeHtml(series.key)}</text>`
    );
  });

  return items.join("");
}

function resolveVisibleSeries(
  seriesData: readonly SeriesData[],
  colors: readonly string[],
  entries: Legend["entries"]
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
  chartDimensions: { width: number; height: number } | undefined
): { width: number; height: number } {
  if (hasManualLegendDimensions(manualLayout, chartDimensions)) {
    return {
      width: manualLayout.w * chartDimensions.width,
      height: manualLayout.h * chartDimensions.height,
    };
  }

  return calculateLegendDimensions(seriesCount);
}

function hasManualLegendDimensions(
  manualLayout: Layout["manualLayout"] | undefined,
  chartDimensions: { width: number; height: number } | undefined
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
