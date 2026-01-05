/**
 * @file Chart data extraction utilities
 *
 * Functions for extracting and transforming chart data from domain objects.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type {
  DataReference,
  BarSeries,
  LineSeries,
  PieSeries,
  ScatterSeries,
  AreaSeries,
  RadarSeries,
  BubbleSeries,
  Axis,
  ValueAxis,
} from "../../../domain/chart";
import type { BubbleSeriesData } from "./generators/bubble";
import type { DataPoint, SeriesData, ValueAxisConfig } from "./types";

// =============================================================================
// Data Extraction Utilities
// =============================================================================

/**
 * Get numeric values from data reference
 */
export function getNumericValues(dataRef: DataReference): readonly number[] {
  const cache = dataRef.numRef?.cache;
  if (!cache) {return [];}

  return cache.points.map((p) => p.value);
}

/**
 * Get category labels from data reference
 *
 * For multi-level categories, returns the innermost level (level 0)
 * which contains the primary labels.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 */
export function getCategoryLabels(dataRef: DataReference): Record<string, string> {
  const labels: Record<string, string> = {};

  // Try multi-level string cache first (use innermost level)
  const multiLvlCache = dataRef.multiLvlStrRef?.cache;
  if (multiLvlCache && multiLvlCache.levels.length > 0) {
    // Level 0 is the innermost (most detailed) level
    const innerLevel = multiLvlCache.levels[0];
    for (const pt of innerLevel.points) {
      labels[String(pt.idx)] = pt.value;
    }
    return labels;
  }

  // Try string cache
  const strCache = dataRef.strRef?.cache;
  if (strCache) {
    for (const pt of strCache.points) {
      labels[String(pt.idx)] = pt.value;
    }
    return labels;
  }

  // Fall back to numeric cache
  const numCache = dataRef.numRef?.cache;
  if (numCache) {
    for (const pt of numCache.points) {
      labels[String(pt.idx)] = String(pt.value);
    }
  }

  return labels;
}

/**
 * Multi-level category data structure
 *
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 */
export type MultiLevelCategories = {
  /** Number of data points */
  readonly count: number;
  /** Category levels (level 0 = innermost, higher = outer) */
  readonly levels: readonly {
    /** Labels indexed by point index */
    readonly labels: Record<string, string>;
  }[];
};

/**
 * Get multi-level category labels from data reference
 *
 * Returns all levels of category hierarchy for multi-level axis rendering.
 * Level 0 is the innermost (most detailed) level (e.g., "Q1", "Q2").
 * Higher levels are outer grouping levels (e.g., "2023", "2024").
 *
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (lvl)
 */
export function getMultiLevelCategoryLabels(dataRef: DataReference): MultiLevelCategories | undefined {
  const multiLvlCache = dataRef.multiLvlStrRef?.cache;
  if (!multiLvlCache || multiLvlCache.levels.length === 0) {
    return undefined;
  }

  const levels = multiLvlCache.levels.map((level) => {
    const labels: Record<string, string> = {};
    for (const pt of level.points) {
      labels[String(pt.idx)] = pt.value;
    }
    return { labels };
  });

  return {
    count: multiLvlCache.count,
    levels,
  };
}

/**
 * Extract bar series data
 *
 * Includes trendlines and error bars from series definition.
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function extractBarSeriesData(series: readonly BarSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const numValues = getNumericValues(ser.values);
    const labels = getCategoryLabels(ser.categories);
    const values = buildIndexValues(numValues);

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels: Object.keys(labels).length > 0 ? labels : undefined,
      trendlines: ser.trendlines,
      errorBars: ser.errorBars,
    };
  });
}

/**
 * Extract line series data
 *
 * Includes trendlines and error bars from series definition.
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function extractLineSeriesData(series: readonly LineSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const numValues = getNumericValues(ser.values);
    const labels = getCategoryLabels(ser.categories);
    const values = buildIndexValues(numValues);

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels: Object.keys(labels).length > 0 ? labels : undefined,
      trendlines: ser.trendlines,
      errorBars: ser.errorBars,
    };
  });
}

/**
 * Extract pie series data
 */
export function extractPieSeriesData(series: readonly PieSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const numValues = getNumericValues(ser.values);
    const labels = getCategoryLabels(ser.categories);
    const values = buildIndexValues(numValues);

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels: Object.keys(labels).length > 0 ? labels : undefined,
    };
  });
}

/**
 * Extract explosion values from pie series
 *
 * Per ECMA-376, explosion can be defined at:
 * - Series level (c:ser/c:explosion) - applies to all slices
 * - Data point level (c:dPt/c:explosion) - overrides series level for specific slice
 *
 * @see ECMA-376 Part 1, Section 21.2.2.65 (explosion)
 * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt)
 */
export function extractPieExplosions(series: PieSeries): readonly number[] {
  const numDataPoints = series.values.numRef?.cache?.points.length ?? 0;
  const seriesExplosion = series.explosion ?? 0;
  return Array.from({ length: numDataPoints }, (_, i) => {
    const dataPoint = series.dataPoints?.find((dp) => dp.idx === i);
    return dataPoint?.explosion ?? seriesExplosion;
  });
}

/**
 * Get X values from scatter series data reference
 *
 * Per ECMA-376 Part 1, Section 21.2.2.234 (xVal):
 * xVal can contain either:
 * - numRef: Numeric reference with actual x coordinates
 * - strRef: String reference where index positions are used as x values
 *
 * When strRef is used (e.g., category labels like "Q1", "Q2"),
 * the points are treated as equally spaced along the x-axis.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.234 (xVal)
 */
function getScatterXValues(dataRef: DataReference): readonly number[] {
  // Try numeric reference first
  const numCache = dataRef.numRef?.cache;
  if (numCache && numCache.points.length > 0) {
    return numCache.points.map((p) => p.value);
  }

  // Fall back to string reference - use index as x value
  // Per ECMA-376, string categories are treated as equally spaced
  const strCache = dataRef.strRef?.cache;
  if (strCache && strCache.points.length > 0) {
    return strCache.points.map((p) => p.idx);
  }

  return [];
}

/**
 * Get category labels from scatter X values (for axis labeling)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.234 (xVal)
 */
function getScatterXLabels(dataRef: DataReference): Record<string, string> | undefined {
  const strCache = dataRef.strRef?.cache;
  if (!strCache || strCache.points.length === 0) {
    return undefined;
  }

  return strCache.points.reduce<Record<string, string>>((acc, point) => {
    acc[String(point.idx)] = point.value;
    return acc;
  }, {});
}

/**
 * Extract scatter series data
 *
 * Handles both numeric and string-based x values per ECMA-376.
 * Includes trendlines and error bars from series definition.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 * @see ECMA-376 Part 1, Section 21.2.2.234 (xVal)
 */
export function extractScatterSeriesData(series: readonly ScatterSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const xValues = getScatterXValues(ser.xValues);
    const yValues = getNumericValues(ser.yValues);
    const xlabels = getScatterXLabels(ser.xValues);
    const count = Math.min(xValues.length, yValues.length);
    const values = Array.from({ length: count }, (_, i) => ({ x: xValues[i], y: yValues[i] }));

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels,
      trendlines: ser.trendlines,
      errorBars: ser.errorBars,
    };
  });
}

/**
 * Extract area series data
 *
 * Includes trendlines and error bars from series definition.
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function extractAreaSeriesData(series: readonly AreaSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const numValues = getNumericValues(ser.values);
    const labels = getCategoryLabels(ser.categories);
    const values = buildIndexValues(numValues);

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels: Object.keys(labels).length > 0 ? labels : undefined,
      trendlines: ser.trendlines,
      errorBars: ser.errorBars,
    };
  });
}

/**
 * Extract radar series data
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 */
export function extractRadarSeriesData(series: readonly RadarSeries[]): readonly SeriesData[] {
  return series.map((ser, index) => {
    const numValues = getNumericValues(ser.values);
    const labels = getCategoryLabels(ser.categories);
    const values = buildIndexValues(numValues);

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
      xlabels: Object.keys(labels).length > 0 ? labels : undefined,
    };
  });
}

/**
 * Extract bubble series data
 * @see ECMA-376 Part 1, Section 21.2.2.20 (bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.19 (bubbleSer)
 */
export function extractBubbleSeriesData(series: readonly BubbleSeries[]): readonly BubbleSeriesData[] {
  return series.map((ser, index) => {
    const xValues = getNumericValues(ser.xValues);
    const yValues = getNumericValues(ser.yValues);
    const sizeValues = getNumericValues(ser.bubbleSize);

    const count = Math.min(xValues.length, yValues.length, sizeValues.length);
    const values = Array.from({ length: count }, (_, i) => ({
      x: xValues[i],
      y: yValues[i],
      size: sizeValues[i],
    }));

    return {
      key: ser.tx?.value ?? `Series ${index + 1}`,
      values,
    };
  });
}

function buildIndexValues(values: readonly number[]): DataPoint[] {
  return values.map((value, index) => ({ x: String(index), y: value }));
}

// =============================================================================
// Value Range Calculation
// =============================================================================

/**
 * Find value range across all series
 *
 * Per ECMA-376:
 * - Use explicit min/max from axis configuration if specified
 * - Otherwise calculate from actual data values
 * - For crosses="autoZero", ensure 0 is included in the range
 *
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.3.13 (ST_Crosses)
 */
export function getValueRange(
  data: readonly SeriesData[],
  axisConfig?: ValueAxisConfig
): { minVal: number; maxVal: number } {
  const dataExtent = resolveDataExtent(data);
  const axisRange = resolveAxisRange(axisConfig, dataExtent);
  if (axisConfig?.crosses === "autoZero" || axisConfig?.crosses === undefined) {
    return applyAutoZero(axisRange);
  }
  return axisRange;
}

/**
 * Calculate scatter chart range with padding (implementation-defined)
 *
 * ECMA-376 allows explicit min/max via c:scaling (21.2.2.159), but when
 * not specified, applications auto-scale with padding for visual clarity.
 *
 * The 5% padding is implementation-defined to prevent data points from
 * touching the chart edges.
 */
export function getScatterRange(data: readonly SeriesData[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const extent = resolveScatterExtent(data);

  // 5% padding (implementation-defined for visual clarity)
  const xRange = Math.max(extent.maxX - extent.minX, 1);
  const yRange = Math.max(extent.maxY - extent.minY, 1);

  return {
    minX: extent.minX - xRange * 0.05,
    maxX: extent.maxX + xRange * 0.05,
    minY: extent.minY - yRange * 0.05,
    maxY: extent.maxY + yRange * 0.05,
  };
}

function resolveDataExtent(data: readonly SeriesData[]): { minVal: number; maxVal: number } {
  const initial = { minVal: Infinity, maxVal: -Infinity };
  const extent = data.reduce((acc, series) => {
    return series.values.reduce((seriesAcc, point) => {
      return {
        minVal: Math.min(seriesAcc.minVal, point.y),
        maxVal: Math.max(seriesAcc.maxVal, point.y),
      };
    }, acc);
  }, initial);

  if (extent.minVal === Infinity) {
    return { minVal: 0, maxVal: 1 };
  }

  return extent;
}

function resolveAxisRange(
  axisConfig: ValueAxisConfig | undefined,
  dataExtent: { minVal: number; maxVal: number }
): { minVal: number; maxVal: number } {
  return {
    minVal: axisConfig?.min ?? dataExtent.minVal,
    maxVal: axisConfig?.max ?? dataExtent.maxVal,
  };
}

function applyAutoZero(range: { minVal: number; maxVal: number }): { minVal: number; maxVal: number } {
  const minVal = range.minVal > 0 ? 0 : range.minVal;
  const maxVal = range.maxVal < 0 ? 0 : range.maxVal;
  return { minVal, maxVal };
}

function resolveScatterExtent(data: readonly SeriesData[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const initial = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  return data.reduce((acc, series) => {
    return series.values.reduce((seriesAcc, point) => {
      const xVal = typeof point.x === "number" ? point.x : parseFloat(point.x);
      return {
        minX: Math.min(seriesAcc.minX, xVal),
        maxX: Math.max(seriesAcc.maxX, xVal),
        minY: Math.min(seriesAcc.minY, point.y),
        maxY: Math.max(seriesAcc.maxY, point.y),
      };
    }, acc);
  }, initial);
}

/**
 * Extract value axis configuration from axes array
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 */
export function extractValueAxisConfig(axes: readonly Axis[]): ValueAxisConfig | undefined {
  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  if (!valAxis) {return undefined;}

  return {
    min: valAxis.min,
    max: valAxis.max,
    majorUnit: valAxis.majorUnit,
    crosses: valAxis.crosses,
  };
}
