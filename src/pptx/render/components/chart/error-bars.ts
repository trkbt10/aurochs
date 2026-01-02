/**
 * @file Error bars renderer for charts
 *
 * Renders error bars on chart series showing data variability.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 * @see ECMA-376 Part 1, Section 21.2.3.17 (ST_ErrDir)
 * @see ECMA-376 Part 1, Section 21.2.3.18 (ST_ErrBarType)
 * @see ECMA-376 Part 1, Section 21.2.3.19 (ST_ErrValType)
 */

import type { ErrorBars, ChartShapeProperties, DataReference } from "../../../domain/chart";
import type { SeriesData } from "./types";
import { extractLineStyle } from "./line-style";

// =============================================================================
// Data Reference Extraction
// =============================================================================

/**
 * Extract numeric values from a DataReference
 *
 * DataReference can contain values in one of these forms:
 * - numRef: Reference to external data with cached values (c:numRef/c:numCache)
 * - numLit: Literal embedded values (c:numLit)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.108 (numRef)
 * @see ECMA-376 Part 1, Section 21.2.2.107 (numLit)
 * @see ECMA-376 Part 1, Section 21.2.2.140 (plus)
 * @see ECMA-376 Part 1, Section 21.2.2.101 (minus)
 */
function extractDataReferenceValues(dataRef: DataReference | undefined, count: number): number[] {
  const values: number[] = new Array(count).fill(0);

  if (!dataRef) {
    return values;
  }

  // Check numRef with cache first
  if (dataRef.numRef?.cache) {
    const cache = dataRef.numRef.cache;
    for (const pt of cache.points) {
      if (pt.idx >= 0 && pt.idx < count) {
        values[pt.idx] = pt.value;
      }
    }
    return values;
  }

  // Check numLit (literal embedded values)
  if (dataRef.numLit) {
    for (const pt of dataRef.numLit.points) {
      if (pt.idx >= 0 && pt.idx < count) {
        values[pt.idx] = pt.value;
      }
    }
    return values;
  }

  return values;
}

// =============================================================================
// Error Calculation Functions
// =============================================================================

/**
 * Calculate standard deviation of values
 */
function calculateStdDev(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

/**
 * Calculate standard error of values
 */
function calculateStdErr(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const stdDev = calculateStdDev(values);
  return stdDev / Math.sqrt(values.length);
}

/**
 * Calculate error values for each data point
 *
 * @see ECMA-376 Part 1, Section 21.2.3.19 (ST_ErrValType)
 */
function calculateErrorValues(
  errorBars: ErrorBars,
  seriesData: SeriesData
): { plus: number[]; minus: number[] } {
  const values = seriesData.values.map((v) => v.y);
  const numPoints = values.length;
  const plus: number[] = [];
  const minus: number[] = [];

  switch (errorBars.errValType) {
    case "fixedVal": {
      // Fixed value for all points
      const val = errorBars.val ?? 0;
      for (let i = 0; i < numPoints; i++) {
        plus.push(val);
        minus.push(val);
      }
      break;
    }

    case "percentage": {
      // Percentage of each value
      const pct = (errorBars.val ?? 0) / 100;
      for (let i = 0; i < numPoints; i++) {
        const errorVal = Math.abs(values[i] * pct);
        plus.push(errorVal);
        minus.push(errorVal);
      }
      break;
    }

    case "stdDev": {
      // Standard deviation (multiplier from val)
      const multiplier = errorBars.val ?? 1;
      const stdDev = calculateStdDev(values);
      const errorVal = stdDev * multiplier;
      for (let i = 0; i < numPoints; i++) {
        plus.push(errorVal);
        minus.push(errorVal);
      }
      break;
    }

    case "stdErr": {
      // Standard error
      const stdErr = calculateStdErr(values);
      for (let i = 0; i < numPoints; i++) {
        plus.push(stdErr);
        minus.push(stdErr);
      }
      break;
    }

    case "cust": {
      // Custom values from data references
      // @see ECMA-376 Part 1, Section 21.2.2.140 (plus)
      // @see ECMA-376 Part 1, Section 21.2.2.101 (minus)
      const plusValues = extractDataReferenceValues(errorBars.plus, numPoints);
      const minusValues = extractDataReferenceValues(errorBars.minus, numPoints);

      for (let i = 0; i < numPoints; i++) {
        plus.push(plusValues[i]);
        minus.push(minusValues[i]);
      }
      break;
    }
  }

  return { plus, minus };
}

// =============================================================================
// Error Bar Rendering
// =============================================================================

/**
 * Default error bar styling
 *
 * Per ECMA-376, error bars use solid lines by default.
 */
const DEFAULT_ERROR_BAR_COLOR = "#333333";
const DEFAULT_ERROR_BAR_WIDTH = 1;
const DEFAULT_CAP_WIDTH = 6;

/**
 * Get error bar style from shape properties
 *
 * Extracts line color and width from the error bar's shape properties (c:spPr).
 * Cap width is derived from line width.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars) - spPr child
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
function getErrorBarStyle(spPr: ChartShapeProperties | undefined): {
  color: string;
  width: number;
  capWidth: number;
} {
  if (!spPr) {
    // Default error bar style when no spPr specified
    return {
      color: DEFAULT_ERROR_BAR_COLOR,
      width: DEFAULT_ERROR_BAR_WIDTH,
      capWidth: DEFAULT_CAP_WIDTH,
    };
  }

  // Extract from spPr using shared utility
  const lineStyle = extractLineStyle(spPr);

  // Cap width scales with line width (6x is a reasonable ratio)
  const capWidth = lineStyle.width * 6;

  return {
    color: lineStyle.color,
    width: lineStyle.width,
    capWidth,
  };
}

/**
 * Render error bars for Y-axis (vertical)
 */
function renderYErrorBar(
  x: number,
  y: number,
  plusError: number,
  minusError: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number },
  style: { color: string; width: number; capWidth: number },
  errBarType: ErrorBars["errBarType"],
  noEndCap: boolean
): string {
  const range = valueRange.maxVal - valueRange.minVal;
  const elements: string[] = [];

  // Convert error values to pixel coordinates
  const plusPixels = (plusError / range) * chartHeight;
  const minusPixels = (minusError / range) * chartHeight;

  // Determine which directions to draw
  const showPlus = errBarType === "both" || errBarType === "plus";
  const showMinus = errBarType === "both" || errBarType === "minus";

  // Draw vertical line
  const yTop = showPlus ? y - plusPixels : y;
  const yBottom = showMinus ? y + minusPixels : y;

  elements.push(
    `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBottom}" ` +
      `stroke="${style.color}" stroke-width="${style.width}"/>`
  );

  // Draw end caps
  if (!noEndCap) {
    const halfCap = style.capWidth / 2;

    if (showPlus) {
      elements.push(
        `<line x1="${x - halfCap}" y1="${yTop}" x2="${x + halfCap}" y2="${yTop}" ` +
          `stroke="${style.color}" stroke-width="${style.width}"/>`
      );
    }

    if (showMinus) {
      elements.push(
        `<line x1="${x - halfCap}" y1="${yBottom}" x2="${x + halfCap}" y2="${yBottom}" ` +
          `stroke="${style.color}" stroke-width="${style.width}"/>`
      );
    }
  }

  return elements.join("");
}

/**
 * Render error bars for X-axis (horizontal)
 */
function renderXErrorBar(
  x: number,
  y: number,
  plusError: number,
  minusError: number,
  chartWidth: number,
  xRange: { min: number; max: number },
  style: { color: string; width: number; capWidth: number },
  errBarType: ErrorBars["errBarType"],
  noEndCap: boolean
): string {
  const range = xRange.max - xRange.min;
  const elements: string[] = [];

  // Convert error values to pixel coordinates
  const plusPixels = (plusError / range) * chartWidth;
  const minusPixels = (minusError / range) * chartWidth;

  // Determine which directions to draw
  const showPlus = errBarType === "both" || errBarType === "plus";
  const showMinus = errBarType === "both" || errBarType === "minus";

  // Draw horizontal line
  const xLeft = showMinus ? x - minusPixels : x;
  const xRight = showPlus ? x + plusPixels : x;

  elements.push(
    `<line x1="${xLeft}" y1="${y}" x2="${xRight}" y2="${y}" ` +
      `stroke="${style.color}" stroke-width="${style.width}"/>`
  );

  // Draw end caps
  if (!noEndCap) {
    const halfCap = style.capWidth / 2;

    if (showMinus) {
      elements.push(
        `<line x1="${xLeft}" y1="${y - halfCap}" x2="${xLeft}" y2="${y + halfCap}" ` +
          `stroke="${style.color}" stroke-width="${style.width}"/>`
      );
    }

    if (showPlus) {
      elements.push(
        `<line x1="${xRight}" y1="${y - halfCap}" x2="${xRight}" y2="${y + halfCap}" ` +
          `stroke="${style.color}" stroke-width="${style.width}"/>`
      );
    }
  }

  return elements.join("");
}

/**
 * Render error bars for a series
 *
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */
export function renderErrorBars(
  errorBars: ErrorBars,
  seriesData: SeriesData,
  chartWidth: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number }
): string {
  const points = seriesData.values;
  if (points.length === 0) {
    return "";
  }

  const { plus, minus } = calculateErrorValues(errorBars, seriesData);
  const style = getErrorBarStyle(errorBars.shapeProperties);
  const noEndCap = errorBars.noEndCap ?? false;
  const errDir = errorBars.errDir ?? "y";

  const numPoints = points.length;
  const elements: string[] = [];

  // Calculate point positions
  if (errDir === "y") {
    // Vertical error bars
    const xStep = chartWidth / Math.max(numPoints - 1, 1);
    const range = valueRange.maxVal - valueRange.minVal;

    for (let i = 0; i < numPoints; i++) {
      const point = points[i];
      const x = i * xStep;
      const y = chartHeight - ((point.y - valueRange.minVal) / range) * chartHeight;

      elements.push(
        renderYErrorBar(
          x,
          y,
          plus[i],
          minus[i],
          chartHeight,
          valueRange,
          style,
          errorBars.errBarType,
          noEndCap
        )
      );
    }
  } else {
    // Horizontal error bars (typically for scatter charts)
    const xStep = chartWidth / Math.max(numPoints - 1, 1);
    const range = valueRange.maxVal - valueRange.minVal;

    for (let i = 0; i < numPoints; i++) {
      const point = points[i];
      const x = i * xStep;
      const y = chartHeight - ((point.y - valueRange.minVal) / range) * chartHeight;

      // For X error bars, we need the X range
      // Use the point index as a simple approximation
      const xRange = { min: 0, max: numPoints - 1 };

      elements.push(
        renderXErrorBar(
          x,
          y,
          plus[i],
          minus[i],
          chartWidth,
          xRange,
          style,
          errorBars.errBarType,
          noEndCap
        )
      );
    }
  }

  return elements.join("");
}

/**
 * Render all error bars for a series
 *
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */
export function renderAllErrorBars(
  errorBarsArray: readonly ErrorBars[] | undefined,
  seriesData: SeriesData,
  chartWidth: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number },
): string {
  if (!errorBarsArray) {
    return "";
  }
  if (errorBarsArray.length === 0) {
    return "";
  }

  return errorBarsArray
    .map((eb) => renderErrorBars(eb, seriesData, chartWidth, chartHeight, valueRange))
    .join("");
}
