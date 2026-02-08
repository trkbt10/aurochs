/**
 * @file Chart data table renderer
 *
 * Renders the data table that can appear below the chart plot area.
 * The data table displays the chart data in a tabular format.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
 */

import type { DataTable, ChartShapeProperties } from "@aurochs-office/chart/domain";
import type { SeriesData } from "./render-types";
import { escapeHtml } from "./escape-html";
import { extractLineStyle, toSvgStrokeAttributes } from "./line-style";
import type { FillResolver } from "./types";

// =============================================================================
// Constants (implementation-defined)
// =============================================================================

/** Default data table row height in pixels */
const DATA_TABLE_ROW_HEIGHT = 20;

/** Default data table cell padding in pixels */
const DATA_TABLE_CELL_PADDING = 4;

/** Default data table font size in pixels */
const DATA_TABLE_FONT_SIZE = 10;

/** Width of the legend key box when showKeys is true */
const LEGEND_KEY_SIZE = 12;

/** Gap between legend key and series name */
const LEGEND_KEY_GAP = 4;

// =============================================================================
// Types
// =============================================================================

/**
 * Data table layout configuration
 */
export type DataTableLayout = {
  /** Total width of the data table */
  readonly width: number;
  /** Total height of the data table (calculated based on series count) */
  readonly height: number;
  /** X position of the data table */
  readonly x: number;
  /** Y position of the data table (below plot area) */
  readonly y: number;
};

/**
 * Input data for data table rendering
 */
export type DataTableInput = {
  /** Series data containing names and values */
  readonly seriesData: readonly SeriesData[];
  /** Category labels */
  readonly categoryLabels: readonly string[];
  /** Series colors for legend keys */
  readonly colors: readonly string[];
};

// =============================================================================
// Layout Calculation
// =============================================================================

/**
 * Calculate the height needed for the data table
 */
export function calculateDataTableHeight(dataTable: DataTable | undefined, seriesCount: number): number {
  if (!dataTable) {
    return 0;
  }

  // Header row + series rows
  const rowCount = seriesCount + 1;
  return rowCount * DATA_TABLE_ROW_HEIGHT + DATA_TABLE_CELL_PADDING * 2;
}

/**
 * Calculate column widths for the data table
 */
function calculateColumnWidths(
  totalWidth: number,
  categoryCount: number,
  showKeys: boolean,
): { seriesNameWidth: number; categoryWidth: number } {
  // Series name column takes about 25% of width, or more if fewer categories
  const baseSeriesNameWidth = Math.max(80, totalWidth * 0.25);
  const seriesNameWidth = getSeriesNameColumnWidth({ baseSeriesNameWidth, showKeys });

  // Remaining width divided among category columns
  const remainingWidth = totalWidth - seriesNameWidth;
  const categoryWidth = categoryCount > 0 ? remainingWidth / categoryCount : 0;

  return { seriesNameWidth, categoryWidth };
}

function getSeriesNameColumnWidth({
  baseSeriesNameWidth,
  showKeys,
}: {
  baseSeriesNameWidth: number;
  showKeys: boolean;
}): number {
  if (showKeys) {
    return baseSeriesNameWidth;
  }
  return baseSeriesNameWidth - LEGEND_KEY_SIZE - LEGEND_KEY_GAP;
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render the data table SVG
 *
 * @param dataTable - Data table configuration from chart
 * @param input - Data to display in the table
 * @param layout - Layout configuration
 * @returns SVG string for the data table
 */
export function renderDataTable({
  dataTable,
  input,
  layout,
  fillResolver,
}: {
  dataTable: DataTable;
  input: DataTableInput;
  layout: DataTableLayout;
  fillResolver: FillResolver;
}): string {
  const { seriesData, categoryLabels, colors } = input;
  const { width, height, x, y } = layout;

  if (seriesData.length === 0) {
    return "";
  }

  const showHorzBorder = dataTable.showHorzBorder ?? true;
  const showVertBorder = dataTable.showVertBorder ?? true;
  const showOutline = dataTable.showOutline ?? true;
  const showKeys = dataTable.showKeys ?? false;

  const { seriesNameWidth, categoryWidth } = calculateColumnWidths(width, categoryLabels.length, showKeys);

  // Resolve border style from shapeProperties
  const borderStyle = resolveBorderStyle(dataTable.shapeProperties, fillResolver);

  const elements: string[] = [];

  // Render outline
  if (showOutline) {
    elements.push(renderOutline(width, height, borderStyle));
  }

  // Render header row (category labels)
  elements.push(
    renderHeaderRow({
      categoryLabels,
      seriesNameWidth,
      categoryWidth,
      showVertBorder,
      borderStyle,
    }),
  );

  // Render horizontal border after header
  if (showHorzBorder) {
    elements.push(renderHorizontalBorder(width, DATA_TABLE_ROW_HEIGHT, borderStyle));
  }

  // Render series rows
  for (let i = 0; i < seriesData.length; i++) {
    const rowY = (i + 1) * DATA_TABLE_ROW_HEIGHT;
    const series = seriesData[i];
    const color = colors[i] ?? "#000000";

    elements.push(
      renderSeriesRow({
        series,
        seriesIndex: i,
        categoryLabels,
        color,
        seriesNameWidth,
        categoryWidth,
        rowY,
        showKeys,
        showVertBorder,
        borderStyle,
      }),
    );

    // Render horizontal border after each row (except last)
    if (showHorzBorder && i < seriesData.length - 1) {
      elements.push(renderHorizontalBorder(width, rowY + DATA_TABLE_ROW_HEIGHT, borderStyle));
    }
  }

  // Wrap in group with transform
  return `<g transform="translate(${x}, ${y})">${elements.join("")}</g>`;
}

/**
 * Render the table outline
 */
function renderOutline(width: number, height: number, borderStyle: BorderStyle): string {
  return `<rect x="0" y="0" width="${width}" height="${height}" fill="none" ${borderStyle.stroke}/>`;
}

/**
 * Render the header row with category labels
 */
function renderHeaderRow({
  categoryLabels,
  seriesNameWidth,
  categoryWidth,
  showVertBorder,
  borderStyle,
}: {
  categoryLabels: readonly string[];
  seriesNameWidth: number;
  categoryWidth: number;
  showVertBorder: boolean;
  borderStyle: BorderStyle;
}): string {
  const elements: string[] = [];
  const textY = DATA_TABLE_ROW_HEIGHT / 2 + DATA_TABLE_FONT_SIZE / 3;

  // Empty cell for series name column (top-left corner)
  // Optionally add vertical border
  if (showVertBorder) {
    elements.push(renderVerticalBorder({ x: seriesNameWidth, y: 0, height: DATA_TABLE_ROW_HEIGHT, borderStyle }));
  }

  // Category labels
  for (let i = 0; i < categoryLabels.length; i++) {
    const label = categoryLabels[i];
    const cellX = seriesNameWidth + i * categoryWidth;
    const textX = cellX + categoryWidth / 2;

    elements.push(
      `<text x="${textX}" y="${textY}" font-size="${DATA_TABLE_FONT_SIZE}" text-anchor="middle" fill="#000000">${escapeHtml(label)}</text>`,
    );

    // Vertical border between cells
    if (showVertBorder && i < categoryLabels.length - 1) {
      elements.push(
        renderVerticalBorder({ x: cellX + categoryWidth, y: 0, height: DATA_TABLE_ROW_HEIGHT, borderStyle }),
      );
    }
  }

  return elements.join("");
}

/**
 * Render a series data row
 */
function renderSeriesRow({
  series,
  seriesIndex,
  categoryLabels,
  color,
  seriesNameWidth,
  categoryWidth,
  rowY,
  showKeys,
  showVertBorder,
  borderStyle,
}: {
  series: SeriesData;
  seriesIndex: number;
  categoryLabels: readonly string[];
  color: string;
  seriesNameWidth: number;
  categoryWidth: number;
  rowY: number;
  showKeys: boolean;
  showVertBorder: boolean;
  borderStyle: BorderStyle;
}): string {
  const elements: string[] = [];
  const textY = rowY + DATA_TABLE_ROW_HEIGHT / 2 + DATA_TABLE_FONT_SIZE / 3;

  // Series name cell (with optional legend key)
  if (showKeys) {
    // Render legend key (colored box)
    const keyY = rowY + (DATA_TABLE_ROW_HEIGHT - LEGEND_KEY_SIZE) / 2;
    elements.push(
      `<rect x="${DATA_TABLE_CELL_PADDING}" y="${keyY}" width="${LEGEND_KEY_SIZE}" height="${LEGEND_KEY_SIZE}" fill="${color}"/>`,
    );
  }
  const textX = showKeys ? DATA_TABLE_CELL_PADDING + LEGEND_KEY_SIZE + LEGEND_KEY_GAP : DATA_TABLE_CELL_PADDING;

  // Series name (use key from SeriesData, or generate default)
  const seriesName = series.key || `Series ${seriesIndex + 1}`;
  elements.push(
    `<text x="${textX}" y="${textY}" font-size="${DATA_TABLE_FONT_SIZE}" text-anchor="start" fill="#000000">${escapeHtml(seriesName)}</text>`,
  );

  // Vertical border after series name column
  if (showVertBorder) {
    elements.push(renderVerticalBorder({ x: seriesNameWidth, y: rowY, height: DATA_TABLE_ROW_HEIGHT, borderStyle }));
  }

  // Data values
  for (let i = 0; i < categoryLabels.length; i++) {
    const cellX = seriesNameWidth + i * categoryWidth;
    const valueCenterX = cellX + categoryWidth / 2;

    // Find value for this category (use values array from SeriesData)
    const dataPoint = series.values[i];
    const valueText = dataPoint?.y !== undefined ? formatValue(dataPoint.y) : "";

    elements.push(
      `<text x="${valueCenterX}" y="${textY}" font-size="${DATA_TABLE_FONT_SIZE}" text-anchor="middle" fill="#000000">${escapeHtml(valueText)}</text>`,
    );

    // Vertical border between cells
    if (showVertBorder && i < categoryLabels.length - 1) {
      elements.push(
        renderVerticalBorder({ x: cellX + categoryWidth, y: rowY, height: DATA_TABLE_ROW_HEIGHT, borderStyle }),
      );
    }
  }

  return elements.join("");
}

/**
 * Render a horizontal border line
 */
function renderHorizontalBorder(width: number, y: number, borderStyle: BorderStyle): string {
  return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" ${borderStyle.stroke}/>`;
}

/**
 * Render a vertical border line
 */
function renderVerticalBorder({
  x,
  y,
  height,
  borderStyle,
}: {
  x: number;
  y: number;
  height: number;
  borderStyle: BorderStyle;
}): string {
  return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + height}" ${borderStyle.stroke}/>`;
}

// =============================================================================
// Utilities
// =============================================================================

type BorderStyle = {
  readonly stroke: string;
};

/**
 * Resolve border style from shape properties
 */
function resolveBorderStyle(
  shapeProperties: ChartShapeProperties | undefined,
  fillResolver: FillResolver,
): BorderStyle {
  if (shapeProperties?.line) {
    const lineStyle = extractLineStyle(shapeProperties, fillResolver);
    const attrs = toSvgStrokeAttributes(lineStyle);
    return { stroke: attrs };
  }

  // Default border style
  return { stroke: 'stroke="#808080" stroke-width="1"' };
}

/**
 * Format a numeric value for display
 */
function formatValue(value: number): string {
  // Use reasonable precision based on value magnitude
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (Math.abs(value) >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
