/**
 * @file Bar chart generator
 *
 * Generates SVG content for bar charts (both horizontal and vertical).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.16 (barChart)
 * @see ECMA-376 Part 1, Section 21.2.3.3 (ST_BarDir) - bar=horizontal, col=vertical
 */

import type { SeriesData, ValueAxisConfig, ChartContent, BarChartConfig } from "../types";
import { getValueRange } from "../data";
import { safeGetLabel } from "../axis";

/**
 * Invert a hex color (for invertIfNegative feature)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.77 (invertIfNegative)
 */
function invertColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Invert by subtracting from 255
  const invertedR = (255 - r).toString(16).padStart(2, "0");
  const invertedG = (255 - g).toString(16).padStart(2, "0");
  const invertedB = (255 - b).toString(16).padStart(2, "0");

  return `#${invertedR}${invertedG}${invertedB}`;
}

/**
 * Generate bar chart content
 *
 * Handles both positive and negative values correctly:
 * - Positive values extend upward from the zero line (col) or right from zero (bar)
 * - Negative values extend downward from the zero line (col) or left from zero (bar)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.16 (barChart)
 * @see ECMA-376 Part 1, Section 21.2.3.3 (ST_BarDir) - bar=horizontal, col=vertical
 * @see ECMA-376 Part 1, Section 21.2.2.37 (crosses) - autoZero means axis crosses at 0
 * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt) - data point styling overrides
 * @see ECMA-376 Part 1, Section 21.2.2.77 (invertIfNegative) - invert colors for negative values
 */
export function generateBarChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  axisConfig?: ValueAxisConfig,
  barConfig?: BarChartConfig,
  pointColors?: readonly (readonly string[])[],
  invertIfNegativeFlags?: readonly boolean[]
): ChartContent {
  const isHorizontal = barConfig?.barDir === "bar";
  const grouping = barConfig?.grouping ?? "clustered";
  const isStacked = grouping === "stacked" || grouping === "percentStacked";
  const isPercentStacked = grouping === "percentStacked";

  const numCategories = data[0]?.values.length ?? 0;
  const numSeries = data.length;
  const xlabels = data[0]?.xlabels;

  // For stacked/percentStacked, calculate cumulative values per category
  // Also calculate category totals for percentStacked normalization
  const categoryTotals = isStacked ? buildCategoryTotals(data, numCategories) : [];

  // Calculate value range
  const { minVal, maxVal } = resolveBarValueRange(
    data,
    axisConfig,
    numCategories,
    isStacked,
    isPercentStacked
  );

  const valueRange = maxVal - minVal;

  const renderResult = resolveBarRenderResult(isHorizontal, {
    data,
    chartWidth,
    chartHeight,
    colors,
    numCategories,
    numSeries,
    valueRange,
    minVal,
    isStacked,
    isPercentStacked,
    categoryTotals,
    pointColors,
    invertIfNegativeFlags,
  });

  // Collect category labels for external rendering (supports tickLblSkip)
  const categoryLabels = Array.from({ length: numCategories }, (_, i) => safeGetLabel(xlabels, i));

  return {
    content: renderResult.axes + renderResult.bars.join(""),
    seriesData: data,
    valueRange: { minVal, maxVal },
    colors,
    categoryLabels,
    chartType: "bar" as const,
    isHorizontal,
  };
}

type BarRenderResult = { bars: string[]; axes: string };

function buildCategoryTotals(data: readonly SeriesData[], numCategories: number): number[] {
  return Array.from({ length: numCategories }, (_, i) => {
    const total = data.reduce((sum, series) => {
      const value = series.values[i]?.y;
      if (value === undefined) {
        return sum;
      }
      return sum + Math.abs(value);
    }, 0);
    return total === 0 ? 1 : total;
  });
}

function resolveBarValueRange(
  data: readonly SeriesData[],
  axisConfig: ValueAxisConfig | undefined,
  numCategories: number,
  isStacked: boolean,
  isPercentStacked: boolean
): { minVal: number; maxVal: number } {
  if (isPercentStacked) {
    return { minVal: 0, maxVal: 100 };
  }

  if (isStacked) {
    const stacked = Array.from({ length: numCategories }, (_, i) => {
      return data.reduce(
        (acc, series) => {
          const value = series.values[i]?.y;
          if (value === undefined) {
            return acc;
          }
          if (value >= 0) {
            return { pos: acc.pos + value, neg: acc.neg };
          }
          return { pos: acc.pos, neg: acc.neg + value };
        },
        { pos: 0, neg: 0 }
      );
    });

    const stackedMax = stacked.reduce((max, entry) => Math.max(max, entry.pos), 0);
    const stackedMin = stacked.reduce((min, entry) => Math.min(min, entry.neg), 0);
    const range = getValueRange(
      [{ key: "", values: [{ x: 0, y: stackedMin }, { x: 1, y: stackedMax }] }],
      axisConfig
    );
    return { minVal: range.minVal, maxVal: range.maxVal };
  }

  return getValueRange(data, axisConfig);
}

function resolveBarColor(baseColor: string, shouldInvert: boolean, value: number): string {
  if (shouldInvert && value < 0) {
    return invertColor(baseColor);
  }
  return baseColor;
}

function normalizeValue(value: number, isPercentStacked: boolean, total: number | undefined): number {
  if (!isPercentStacked) {
    return value;
  }
  const safeTotal = total === undefined ? 1 : total;
  const sign = value === 0 ? 1 : Math.sign(value);
  return (Math.abs(value) / safeTotal) * 100 * sign;
}

function resolveHorizontalBarY(
  index: number,
  seriesIndex: number,
  categoryHeight: number,
  barGap: number,
  barHeight: number,
  isStacked: boolean
): number {
  if (isStacked) {
    return index * categoryHeight + barGap;
  }
  return index * categoryHeight + barGap * (seriesIndex + 1) + barHeight * seriesIndex;
}

function resolveVerticalBarX(
  index: number,
  seriesIndex: number,
  categoryWidth: number,
  barGap: number,
  barWidth: number,
  isStacked: boolean
): number {
  if (isStacked) {
    return index * categoryWidth + barGap;
  }
  return index * categoryWidth + barGap * (seriesIndex + 1) + barWidth * seriesIndex;
}

function renderHorizontalBars(params: {
  data: readonly SeriesData[];
  chartWidth: number;
  chartHeight: number;
  colors: readonly string[];
  numCategories: number;
  numSeries: number;
  valueRange: number;
  minVal: number;
  isStacked: boolean;
  isPercentStacked: boolean;
  categoryTotals: number[];
  pointColors?: readonly (readonly string[])[];
  invertIfNegativeFlags?: readonly boolean[];
}): BarRenderResult {
  const bars: string[] = [];
  const zeroX = ((0 - params.minVal) / params.valueRange) * params.chartWidth;
  const categoryHeight = params.chartHeight / params.numCategories;
  const barHeight = resolveBarSize(categoryHeight, params.numSeries, params.isStacked);
  const barGap = resolveBarGap(categoryHeight, params.numSeries, params.isStacked);

  const positiveCumulative = new Array(params.numCategories).fill(0);
  const negativeCumulative = new Array(params.numCategories).fill(0);

  params.data.forEach((series, seriesIndex) => {
    const seriesColor = params.colors[seriesIndex % params.colors.length];
    const shouldInvert = params.invertIfNegativeFlags?.[seriesIndex] ?? false;
    series.values.forEach((point, pointIndex) => {
      const baseColor = params.pointColors?.[seriesIndex]?.[pointIndex] ?? seriesColor;
      const color = resolveBarColor(baseColor, shouldInvert, point.y);
      const value = normalizeValue(point.y, params.isPercentStacked, params.categoryTotals[pointIndex]);
      const y = resolveHorizontalBarY(
        pointIndex,
        seriesIndex,
        categoryHeight,
        barGap,
        barHeight,
        params.isStacked
      );

      if (params.isStacked) {
        const valueWidth = (Math.abs(value) / params.valueRange) * params.chartWidth;
        if (value >= 0) {
          const startX = zeroX + (positiveCumulative[pointIndex] / params.valueRange) * params.chartWidth;
          bars.push(
            `<rect x="${startX}" y="${y}" width="${valueWidth}" height="${barHeight}" fill="${color}" />`
          );
          positiveCumulative[pointIndex] = positiveCumulative[pointIndex] + value;
        } else {
          const nextNegative = negativeCumulative[pointIndex] + value;
          negativeCumulative[pointIndex] = nextNegative;
          const startX = zeroX + (nextNegative / params.valueRange) * params.chartWidth;
          bars.push(
            `<rect x="${startX}" y="${y}" width="${valueWidth}" height="${barHeight}" fill="${color}" />`
          );
        }
        return;
      }

      const valueWidth = (Math.abs(value) / params.valueRange) * params.chartWidth;
      if (value >= 0) {
        bars.push(
          `<rect x="${zeroX}" y="${y}" width="${valueWidth}" height="${barHeight}" fill="${color}" />`
        );
      } else {
        bars.push(
          `<rect x="${zeroX - valueWidth}" y="${y}" width="${valueWidth}" height="${barHeight}" fill="${color}" />`
        );
      }
    });
  });

  const axes =
    `<line x1="0" y1="${params.chartHeight}" x2="${params.chartWidth}" y2="${params.chartHeight}" stroke="#333" stroke-width="1"/>` +
    `<line x1="${zeroX}" y1="0" x2="${zeroX}" y2="${params.chartHeight}" stroke="#333" stroke-width="1"/>`;

  return { bars, axes };
}

function renderVerticalBars(params: {
  data: readonly SeriesData[];
  chartWidth: number;
  chartHeight: number;
  colors: readonly string[];
  numCategories: number;
  numSeries: number;
  valueRange: number;
  minVal: number;
  isStacked: boolean;
  isPercentStacked: boolean;
  categoryTotals: number[];
  pointColors?: readonly (readonly string[])[];
  invertIfNegativeFlags?: readonly boolean[];
}): BarRenderResult {
  const bars: string[] = [];
  const zeroY = params.chartHeight - ((0 - params.minVal) / params.valueRange) * params.chartHeight;
  const categoryWidth = params.chartWidth / params.numCategories;
  const barWidth = resolveBarSize(categoryWidth, params.numSeries, params.isStacked);
  const barGap = resolveBarGap(categoryWidth, params.numSeries, params.isStacked);

  const positiveCumulative = new Array(params.numCategories).fill(0);
  const negativeCumulative = new Array(params.numCategories).fill(0);

  params.data.forEach((series, seriesIndex) => {
    const seriesColor = params.colors[seriesIndex % params.colors.length];
    const shouldInvert = params.invertIfNegativeFlags?.[seriesIndex] ?? false;
    series.values.forEach((point, pointIndex) => {
      const baseColor = params.pointColors?.[seriesIndex]?.[pointIndex] ?? seriesColor;
      const color = resolveBarColor(baseColor, shouldInvert, point.y);
      const value = normalizeValue(point.y, params.isPercentStacked, params.categoryTotals[pointIndex]);
      const x = resolveVerticalBarX(
        pointIndex,
        seriesIndex,
        categoryWidth,
        barGap,
        barWidth,
        params.isStacked
      );

      if (params.isStacked) {
        const valueHeight = (Math.abs(value) / params.valueRange) * params.chartHeight;
        if (value >= 0) {
          const startY =
            zeroY - (positiveCumulative[pointIndex] / params.valueRange) * params.chartHeight - valueHeight;
          bars.push(
            `<rect x="${x}" y="${startY}" width="${barWidth}" height="${valueHeight}" fill="${color}" />`
          );
          positiveCumulative[pointIndex] = positiveCumulative[pointIndex] + value;
        } else {
          const startY =
            zeroY + (Math.abs(negativeCumulative[pointIndex]) / params.valueRange) * params.chartHeight;
          bars.push(
            `<rect x="${x}" y="${startY}" width="${barWidth}" height="${valueHeight}" fill="${color}" />`
          );
          negativeCumulative[pointIndex] = negativeCumulative[pointIndex] + value;
        }
        return;
      }

      const valueHeight = (Math.abs(value) / params.valueRange) * params.chartHeight;
      if (value >= 0) {
        const y = zeroY - valueHeight;
        bars.push(
          `<rect x="${x}" y="${y}" width="${barWidth}" height="${valueHeight}" fill="${color}" />`
        );
      } else {
        bars.push(
          `<rect x="${x}" y="${zeroY}" width="${barWidth}" height="${valueHeight}" fill="${color}" />`
        );
      }
    });
  });

  const axes =
    `<line x1="0" y1="0" x2="0" y2="${params.chartHeight}" stroke="#333" stroke-width="1"/>` +
    `<line x1="0" y1="${zeroY}" x2="${params.chartWidth}" y2="${zeroY}" stroke="#333" stroke-width="1"/>`;

  return { bars, axes };
}

function resolveBarRenderResult(
  isHorizontal: boolean,
  params: {
    data: readonly SeriesData[];
    chartWidth: number;
    chartHeight: number;
    colors: readonly string[];
    numCategories: number;
    numSeries: number;
    valueRange: number;
    minVal: number;
    isStacked: boolean;
    isPercentStacked: boolean;
    categoryTotals: number[];
    pointColors?: readonly (readonly string[])[];
    invertIfNegativeFlags?: readonly boolean[];
  }
): BarRenderResult {
  if (isHorizontal) {
    return renderHorizontalBars(params);
  }
  return renderVerticalBars(params);
}

function resolveBarSize(categorySize: number, numSeries: number, isStacked: boolean): number {
  if (isStacked) {
    return categorySize * 0.8;
  }
  return (categorySize * 0.8) / numSeries;
}

function resolveBarGap(categorySize: number, numSeries: number, isStacked: boolean): number {
  if (isStacked) {
    return categorySize * 0.1;
  }
  return (categorySize * 0.2) / (numSeries + 1);
}
