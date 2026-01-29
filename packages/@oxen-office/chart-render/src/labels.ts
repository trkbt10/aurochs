/**
 * @file Chart data label utilities
 *
 * Rendering functions for data labels on chart data points.
 *
 * Text styling is extracted from c:txPr following ECMA-376 resolution order:
 * 1. a:pPr/a:defRPr (default run properties)
 * 2. First a:r run properties
 * 3. Implementation defaults
 *
 * @see ECMA-376 Part 1, Section 21.2.2.49 (dLbls)
 * @see ECMA-376 Part 1, Section 21.2.3.10 (ST_DLblPos)
 */

import type { DataLabels, ChartShapeProperties } from "@oxen-office/chart/domain";
import type { SeriesData, ChartContent } from "./render-types";
import { escapeHtml } from "./escape-html";
import type { ChartRenderContext, FillResolver, ResolvedFill } from "./types";
import { toSvgTextAttributes } from "./svg-text";
import { formatDataValue } from "./number-format";
import { extractDropLineStyle, toSvgStrokeAttributes } from "./line-style";

// =============================================================================
// Shape Properties for Data Labels
// =============================================================================

/**
 * Default data label shape properties (implementation-defined)
 * By default, labels have no background or border
 */
const DEFAULT_LABEL_PADDING_X = 4;
const DEFAULT_LABEL_PADDING_Y = 2;

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
    if (!first) {return undefined;}
    return normalizeHexColor(first.color.hex);
  }
  return undefined;
}

/**
 * Render data label background and border
 *
 * Per ECMA-376 Part 1, Section 21.2.2.49 (dLbls), data labels can have
 * shape properties (spPr) for background fill and border styling.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */
function renderLabelBackground(
  {
    x,
    y,
    textWidth,
    textHeight,
    textAnchor,
    spPr,
    fillResolver,
  }: {
    x: number;
    y: number;
    textWidth: number;
    textHeight: number;
    textAnchor: string;
    spPr: ChartShapeProperties | undefined;
    fillResolver: FillResolver;
  }
): string {
  const fillColor = spPr?.fill ? resolvedFillToColor(fillResolver.resolve(spPr.fill)) : undefined;
  const borderColor = spPr?.line?.fill ? resolvedFillToColor(fillResolver.resolve(spPr.line.fill)) : undefined;
  const borderWidth = spPr?.line?.width;

  // Only render background if fill or border is specified
  if (!fillColor && !borderColor) {
    return "";
  }

  const width = textWidth + DEFAULT_LABEL_PADDING_X * 2;
  const height = textHeight + DEFAULT_LABEL_PADDING_Y * 2;

  const rectX = resolveLabelRectX({ x, textWidth, width, textAnchor });

  const rectY = y - textHeight - DEFAULT_LABEL_PADDING_Y;

  const fill = fillColor ? `fill="${fillColor}"` : 'fill="none"';
  const stroke = borderColor ? `stroke="${borderColor}"` : 'stroke="none"';
  const strokeWidth = borderWidth ? `stroke-width="${borderWidth}"` : "";

  return `<rect x="${rectX}" y="${rectY}" width="${width}" height="${height}" ${fill} ${stroke} ${strokeWidth}/>`;
}

// =============================================================================
// Data Label Types
// =============================================================================

/**
 * Data label position configuration
 */
type DataLabelPosition = {
  readonly x: number;
  readonly y: number;
};

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format a data label value
 *
 * Uses ECMA-376 format codes when available.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.121 (numFmt)
 */
export function formatDataLabelValue(value: number, numFormat?: string): string {
  return formatDataValue(value, numFormat);
}

/**
 * Build data label text from components
 *
 * @see ECMA-376 Part 1, Section 21.2.2.49 (dLbls)
 * @see ECMA-376 Part 1, Section 21.2.2.179 (showBubbleSize)
 */
export function buildDataLabelText(
  {
    dataLabels,
    value,
    categoryName,
    seriesName,
    percentage,
    bubbleSize,
  }: {
    dataLabels: DataLabels;
    value: number;
    categoryName?: string;
    seriesName?: string;
    percentage?: number;
    bubbleSize?: number;
  }
): string {
  const parts: string[] = [];
  const separator = dataLabels.separator ?? ", ";

  if (dataLabels.showSerName && seriesName) {
    parts.push(seriesName);
  }
  if (dataLabels.showCatName && categoryName) {
    parts.push(categoryName);
  }
  if (dataLabels.showVal) {
    parts.push(formatDataLabelValue(value, dataLabels.numFormat));
  }
  if (dataLabels.showPercent && percentage !== undefined) {
    parts.push(`${percentage.toFixed(1)}%`);
  }
  // Show bubble size for bubble charts
  // @see ECMA-376 Part 1, Section 21.2.2.179 (showBubbleSize)
  if (dataLabels.showBubbleSize && bubbleSize !== undefined) {
    parts.push(formatDataLabelValue(bubbleSize, dataLabels.numFormat));
  }

  return parts.join(separator);
}

// =============================================================================
// Position Calculation
// =============================================================================

/**
 * Calculate data label position for bar charts
 *
 * @see ECMA-376 Part 1, Section 21.2.3.10 (ST_DLblPos)
 */
export function calculateBarDataLabelPosition(
  {
    position,
    barX,
    barY,
    barWidth,
    barHeight,
    isHorizontal,
  }: {
    position: DataLabels["position"];
    barX: number;
    barY: number;
    barWidth: number;
    barHeight: number;
    isHorizontal: boolean;
  }
): DataLabelPosition {
  const pos = position ?? "outEnd";

  if (isHorizontal) {
    // Horizontal bar - label positions are relative to bar end
    switch (pos) {
      case "inEnd":
        return { x: barX + barWidth - 5, y: barY + barHeight / 2 };
      case "inBase":
        return { x: barX + 5, y: barY + barHeight / 2 };
      case "ctr":
        return { x: barX + barWidth / 2, y: barY + barHeight / 2 };
      case "outEnd":
      default:
        return { x: barX + barWidth + 5, y: barY + barHeight / 2 };
    }
  } else {
    // Vertical bar - label positions are relative to bar top
    switch (pos) {
      case "inEnd":
        return { x: barX + barWidth / 2, y: barY + 12 };
      case "inBase":
        return { x: barX + barWidth / 2, y: barY + barHeight - 5 };
      case "ctr":
        return { x: barX + barWidth / 2, y: barY + barHeight / 2 };
      case "outEnd":
      default:
        return { x: barX + barWidth / 2, y: barY - 5 };
    }
  }
}

// =============================================================================
// Main Rendering
// =============================================================================

/**
 * Render data labels for a chart
 *
 * @see ECMA-376 Part 1, Section 21.2.2.49 (dLbls)
 * @see ECMA-376 Part 1, Section 21.2.3.10 (ST_DLblPos)
 */
export function renderDataLabels(
  {
    dataLabels,
    seriesData,
    chartType,
    chartWidth,
    chartHeight,
    ctx,
    fillResolver,
    valueRange,
    isHorizontal = false,
  }: {
    dataLabels: DataLabels | undefined;
    seriesData: readonly SeriesData[];
    chartType: ChartContent["chartType"];
    chartWidth: number;
    chartHeight: number;
    ctx: ChartRenderContext;
    fillResolver: FillResolver;
    valueRange?: { minVal: number; maxVal: number };
    isHorizontal?: boolean;
  }
): string {
  // If no data labels or nothing to show, return empty
  if (!dataLabels) {
    return "";
  }
  if (
    !dataLabels.showVal &&
    !dataLabels.showCatName &&
    !dataLabels.showSerName &&
    !dataLabels.showPercent
  ) {
    return "";
  }

  const labels: string[] = [];
  const numCategories = seriesData[0]?.values.length ?? 0;

  const textStyle = ctx.getTextStyle(dataLabels.textProperties);
  const textStyleAttrs = toSvgTextAttributes(textStyle);
  const textColor = textStyle.color;

  const total = resolvePieTotal(seriesData, dataLabels, chartType);

  seriesData.forEach((series, seriesIndex) => {
    series.values.forEach((point, pointIndex) => {
      const value = point.y;
      const categoryName = series.xlabels?.[String(pointIndex)] ?? String(pointIndex + 1);
      const percentage = total > 0 ? (value / total) * 100 : undefined;
      const bubbleSize = point.bubbleSize;

      const text = buildDataLabelText({ dataLabels, value, categoryName, seriesName: series.key, percentage, bubbleSize });
      if (!text) {
        return;
      }

      const pos = resolveDataLabelPosition({
        dataLabels,
        chartType,
        valueRange,
        isHorizontal,
        chartWidth,
        chartHeight,
        fillResolver,
        numCategories,
        seriesIndex,
        pointIndex,
        value,
        total,
        seriesData,
        labels,
      });
      if (!pos) {
        return;
      }

      const textAnchor = chartType === "bar" && isHorizontal ? "start" : "middle";

      // Estimate text dimensions for background rendering
      // Approximate width: fontSize * 0.6 * characters
      // Approximate height: fontSize * 1.2
      const fontSize = textStyle.fontSize ?? 11;
      const estimatedTextWidth = fontSize * 0.6 * text.length;
      const estimatedTextHeight = fontSize * 1.2;

      // Render background if shape properties specify fill or border
      // @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
      const bgRect = renderLabelBackground({
        x: pos.x,
        y: pos.y,
        textWidth: estimatedTextWidth,
        textHeight: estimatedTextHeight,
        textAnchor,
        spPr: dataLabels.shapeProperties,
        fillResolver,
      });

      if (bgRect) {
        labels.push(bgRect);
      }

      labels.push(
        `<text x="${pos.x}" y="${pos.y}" text-anchor="${textAnchor}" ${textStyleAttrs} fill="${textColor}">${escapeHtml(text)}</text>`
      );
    });
  });

  return labels.join("");
}

function resolveLabelRectX(
  {
    x,
    textWidth,
    width,
    textAnchor,
  }: {
    x: number;
    textWidth: number;
    width: number;
    textAnchor: string;
  }
): number {
  if (textAnchor === "middle") {
    return x - width / 2;
  }
  if (textAnchor === "end") {
    return x - textWidth - DEFAULT_LABEL_PADDING_X;
  }
  return x - DEFAULT_LABEL_PADDING_X;
}

function resolvePieTotal(
  seriesData: readonly SeriesData[],
  dataLabels: DataLabels,
  chartType: ChartContent["chartType"]
): number {
  if (!isPiePercentEnabled(dataLabels, chartType)) {
    return 0;
  }
  return seriesData.reduce((sum, series) => {
    return series.values.reduce((seriesSum, point) => seriesSum + point.y, sum);
  }, 0);
}

function isPiePercentEnabled(dataLabels: DataLabels, chartType: ChartContent["chartType"]): boolean {
  if (!dataLabels.showPercent) {
    return false;
  }
  return chartType === "pie";
}

function resolveDataLabelPosition(params: {
  dataLabels: DataLabels;
  chartType: ChartContent["chartType"];
  valueRange: { minVal: number; maxVal: number } | undefined;
  isHorizontal: boolean;
  chartWidth: number;
  chartHeight: number;
  fillResolver: FillResolver;
  numCategories: number;
  seriesIndex: number;
  pointIndex: number;
  value: number;
  total: number;
  seriesData: readonly SeriesData[];
  labels: string[];
}): DataLabelPosition | undefined {
  if (params.chartType === "bar" && params.valueRange) {
    return resolveBarLabelPosition({ ...params, valueRange: params.valueRange });
  }

  if (params.chartType === "line" && params.valueRange) {
    return resolveLineLabelPosition({ ...params, valueRange: params.valueRange });
  }

  if (params.chartType === "pie") {
    return resolvePieLabelPosition(params);
  }

  const xStep = params.chartWidth / Math.max(params.numCategories, 1);
  return { x: params.pointIndex * xStep + xStep / 2, y: params.chartHeight / 2 };
}

function resolveBarLabelPosition(params: {
  dataLabels: DataLabels;
  valueRange: { minVal: number; maxVal: number };
  isHorizontal: boolean;
  chartWidth: number;
  chartHeight: number;
  numCategories: number;
  seriesIndex: number;
  pointIndex: number;
  value: number;
  seriesData: readonly SeriesData[];
}): DataLabelPosition {
  const range = params.valueRange.maxVal - params.valueRange.minVal;
  if (params.isHorizontal) {
    const categoryHeight = params.chartHeight / params.numCategories;
    const barHeight = (categoryHeight * 0.8) / params.seriesData.length;
    const barY = params.pointIndex * categoryHeight + categoryHeight * 0.1 + params.seriesIndex * barHeight;
    const zeroX = ((0 - params.valueRange.minVal) / range) * params.chartWidth;
    const valueWidth = (Math.abs(params.value) / range) * params.chartWidth;
    const barX = params.value >= 0 ? zeroX : zeroX - valueWidth;
    return calculateBarDataLabelPosition({
      position: params.dataLabels.position,
      barX,
      barY,
      barWidth: valueWidth,
      barHeight,
      isHorizontal: true,
    });
  }

  const categoryWidth = params.chartWidth / params.numCategories;
  const barWidth = (categoryWidth * 0.8) / params.seriesData.length;
  const barX = params.pointIndex * categoryWidth + categoryWidth * 0.1 + params.seriesIndex * barWidth;
  const zeroY = params.chartHeight - ((0 - params.valueRange.minVal) / range) * params.chartHeight;
  const valueHeight = (Math.abs(params.value) / range) * params.chartHeight;
  const barY = params.value >= 0 ? zeroY - valueHeight : zeroY;
  return calculateBarDataLabelPosition({
    position: params.dataLabels.position,
    barX,
    barY,
    barWidth,
    barHeight: valueHeight,
    isHorizontal: false,
  });
}

function resolveLineLabelPosition(params: {
  valueRange: { minVal: number; maxVal: number };
  chartWidth: number;
  chartHeight: number;
  numCategories: number;
  pointIndex: number;
  value: number;
}): DataLabelPosition {
  const range = params.valueRange.maxVal - params.valueRange.minVal;
  const xStep = params.chartWidth / Math.max(params.numCategories - 1, 1);
  const x = params.pointIndex * xStep;
  const y = params.chartHeight - ((params.value - params.valueRange.minVal) / range) * params.chartHeight;
  return { x, y: y - 10 };
}

function resolvePieLabelPosition(params: {
  dataLabels: DataLabels;
  chartWidth: number;
  chartHeight: number;
  fillResolver: FillResolver;
  pointIndex: number;
  value: number;
  total: number;
  seriesData: readonly SeriesData[];
  labels: string[];
}): DataLabelPosition {
  const centerX = params.chartWidth / 2;
  const centerY = params.chartHeight / 2;
  const radius = Math.min(params.chartWidth, params.chartHeight) / 2 - 20;
  const startAngle = resolvePieStartAngle(params.seriesData[0]?.values ?? [], params.pointIndex, params.total);
  const sliceAngle = (params.value / params.total) * Math.PI;
  const labelAngle = startAngle + sliceAngle;
  const showLeader = params.dataLabels.showLeaderLines === true;
  const labelRadius = showLeader ? radius * 1.15 : radius * 0.7;
  const pos = {
    x: centerX + labelRadius * Math.cos(labelAngle),
    y: centerY + labelRadius * Math.sin(labelAngle),
  };

  if (showLeader) {
    const leaderStartRadius = radius * 0.95;
    const leaderStartX = centerX + leaderStartRadius * Math.cos(labelAngle);
    const leaderStartY = centerY + leaderStartRadius * Math.sin(labelAngle);
    const leaderStyle = extractDropLineStyle(params.dataLabels.leaderLines, params.fillResolver);
    params.labels.push(
      `<line x1="${leaderStartX}" y1="${leaderStartY}" x2="${pos.x}" y2="${pos.y}" ${toSvgStrokeAttributes(leaderStyle)}/>`
    );
  }

  return pos;
}

function resolvePieStartAngle(values: readonly { y: number }[], index: number, total: number): number {
  const baseAngle = -Math.PI / 2;
  const angles = values.slice(0, index).reduce((sum, point) => {
    return sum + (point.y / total) * 2 * Math.PI;
  }, 0);
  return baseAngle + angles;
}
