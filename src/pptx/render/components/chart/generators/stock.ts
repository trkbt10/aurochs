/**
 * @file Stock chart generator
 *
 * Generates SVG for stock (OHLC) charts.
 * Stock charts display Open-High-Low-Close data for financial analysis.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.200 (stockChart)
 */

import type { ChartContent, SeriesData, ValueAxisConfig } from "../types";
import { getValueRange, getCategoryLabels, getNumericValues } from "../data";
import type { LineSeries, UpDownBars, ChartLines } from "../../../../domain/chart";
import {
  extractDropLineStyle,
  extractHiLowLineStyle,
  toSvgStrokeAttributes,
} from "../line-style";

export type StockChartConfig = {
  dropLines?: ChartLines;
  hiLowLines?: ChartLines;
  upDownBars?: UpDownBars;
};

/**
 * Extract stock series data from LineSeries
 *
 * Stock charts typically have 3 or 4 series representing:
 * - High-Low-Close (3 series)
 * - Open-High-Low-Close (4 series)
 */
export function extractStockSeriesData(series: readonly LineSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const numValues = getNumericValues(ser.values);
    const labels = getCategoryLabels(ser.categories);

    const values = numValues.map((val, i) => ({
      x: String(i),
      y: val,
    }));

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels: Object.keys(labels).length > 0 ? labels : undefined,
    };
  });
}

/**
 * Generate stock chart SVG
 *
 * Stock charts render OHLC data with:
 * - Hi-Low lines showing the range between high and low values
 * - Up-Down bars showing the difference between open and close
 * - Optional drop lines from data points to the category axis
 *
 * @see ECMA-376 Part 1, Section 21.2.2.200 (stockChart)
 */
export function generateStockChart(
  data: readonly SeriesData[],
  chartWidth: number,
  chartHeight: number,
  colors: readonly string[],
  axisConfig: ValueAxisConfig | undefined,
  config: StockChartConfig
): ChartContent {
  if (data.length === 0) {
    return {
      content: "",
      seriesData: [],
      colors: [...colors],
    };
  }

  // Stock charts need at least 3 series (High, Low, Close) or 4 (Open, High, Low, Close)
  const seriesCount = data.length;
  const isOHLC = seriesCount >= 4;

  // Get data point count from first series
  const pointCount = data[0]?.values.length ?? 0;
  if (pointCount === 0) {
    return {
      content: "",
      seriesData: [...data],
      colors: [...colors],
    };
  }

  // Calculate value range across all series
  const { minVal, maxVal } = getValueRange(data, axisConfig);
  const rawRange = maxVal - minVal;
  const valueRange = rawRange === 0 ? 1 : rawRange;

  // Calculate dimensions
  const barWidth = Math.max(4, Math.min(20, (chartWidth * 0.6) / pointCount));
  const groupWidth = chartWidth / pointCount;

  const svgParts: string[] = [];

  // Helper to convert value to Y coordinate
  const valueToY = (value: number): number => {
    return chartHeight - ((value - minVal) / valueRange) * chartHeight;
  };

  // Render each data point
  Array.from({ length: pointCount }, (_, i) => {
    const x = groupWidth * i + groupWidth / 2;
    const pointValues = resolveStockPointValues(data, i, isOHLC);

    // Render hi-low line if enabled
    // @see ECMA-376 Part 1, Section 21.2.2.75 (hiLowLines)
    if (config.hiLowLines) {
      const highY = valueToY(pointValues.high);
      const lowY = valueToY(pointValues.low);
      const hiLowStyle = extractHiLowLineStyle(config.hiLowLines);
      svgParts.push(
        `<line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" ${toSvgStrokeAttributes(hiLowStyle)}/>`
      );
    }

    // Render up-down bars if enabled and we have OHLC data
    if (config.upDownBars && pointValues.open !== undefined) {
      const openY = valueToY(pointValues.open);
      const closeY = valueToY(pointValues.close);
      const isUp = pointValues.close >= pointValues.open;

      const barTop = Math.min(openY, closeY);
      const rawBarHeight = Math.abs(closeY - openY);
      const barHeight = rawBarHeight === 0 ? 1 : rawBarHeight;

      // Up bars are typically white/hollow, down bars are typically black/filled
      const fillColor = isUp ? "#FFFFFF" : "#000000";
      const strokeColor = "#000000";

      svgParts.push(
        `<rect x="${x - barWidth / 2}" y="${barTop}" width="${barWidth}" height="${barHeight}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"/>`
      );
    } else if (!config.upDownBars) {
      // Without up-down bars, render tick marks for close (and open if available)
      const closeY = valueToY(pointValues.close);
      // Right tick for close
      svgParts.push(
        `<line x1="${x}" y1="${closeY}" x2="${x + barWidth / 2}" y2="${closeY}" stroke="#000000" stroke-width="1"/>`
      );

      if (pointValues.open !== undefined) {
        const openY = valueToY(pointValues.open);
        // Left tick for open
        svgParts.push(
          `<line x1="${x - barWidth / 2}" y1="${openY}" x2="${x}" y2="${openY}" stroke="#000000" stroke-width="1"/>`
        );
      }
    }

    // Render drop lines if enabled
    // @see ECMA-376 Part 1, Section 21.2.2.53 (dropLines)
    if (config.dropLines) {
      const lowY = valueToY(pointValues.low);
      const dropStyle = extractDropLineStyle(config.dropLines);
      svgParts.push(
        `<line x1="${x}" y1="${lowY}" x2="${x}" y2="${chartHeight}" ${toSvgStrokeAttributes(dropStyle)}/>`
      );
    }
  });

  // Get category labels from first series - convert Record to array
  const xlabels = data[0]?.xlabels ?? {};
  const categoryLabels = Array.from({ length: pointCount }, (_, i) => xlabels[String(i)] ?? String(i + 1));

  return {
    content: `<g class="stock-chart">${svgParts.join("")}</g>`,
    seriesData: [...data],
    colors: [...colors],
    chartType: "stock",
    valueRange: { minVal, maxVal },
    categoryLabels,
    isHorizontal: false,
  };
}

function resolveStockPointValues(
  data: readonly SeriesData[],
  index: number,
  isOHLC: boolean
): { open: number | undefined; high: number; low: number; close: number } {
  if (isOHLC) {
    return {
      open: data[0]?.values[index]?.y,
      high: data[1]?.values[index]?.y ?? 0,
      low: data[2]?.values[index]?.y ?? 0,
      close: data[3]?.values[index]?.y ?? 0,
    };
  }

  return {
    open: undefined,
    high: data[0]?.values[index]?.y ?? 0,
    low: data[1]?.values[index]?.y ?? 0,
    close: data[2]?.values[index]?.y ?? 0,
  };
}
