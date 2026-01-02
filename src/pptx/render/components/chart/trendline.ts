/**
 * @file Trendline renderer for charts
 *
 * Renders trendlines (linear, polynomial, exponential, etc.) on chart series.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 * @see ECMA-376 Part 1, Section 21.2.3.51 (ST_TrendlineType)
 */

import type { Trendline, ChartShapeProperties, Layout } from "../../../domain/chart";
import type { Fill } from "../../../domain/color";
import type { SeriesData } from "./types";
import { extractLineStyle, type ResolvedLineStyle } from "./line-style";
import { resolveTextStyle, toSvgTextAttributes } from "./text-props";
import { escapeHtml } from "../../html/index";
import { resolveColor } from "../../../core/dml/render/color";

// =============================================================================
// Trendline Calculation Functions
// =============================================================================

/**
 * Calculate linear regression coefficients (y = mx + b)
 *
 * Uses least squares method to find the best fit line.
 *
 * @see ECMA-376 Part 1, Section 21.2.3.51 - "linear" type
 */
function calculateLinearRegression(
  points: readonly { x: number; y: number }[]
): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n < 2) {return { slope: 0, intercept: 0, rSquared: 0 };}

  const sums = points.reduce(
    (acc, point) => {
      return {
        sumX: acc.sumX + point.x,
        sumY: acc.sumY + point.y,
        sumXY: acc.sumXY + point.x * point.y,
        sumX2: acc.sumX2 + point.x * point.x,
      };
    },
    { sumX: 0, sumY: 0, sumXY: 0, sumX2: 0 }
  );

  const denominator = n * sums.sumX2 - sums.sumX * sums.sumX;
  if (denominator === 0) {return { slope: 0, intercept: sums.sumY / n, rSquared: 0 };}

  const slope = (n * sums.sumXY - sums.sumX * sums.sumY) / denominator;
  const intercept = (sums.sumY - slope * sums.sumX) / n;

  // Calculate R-squared
  const yMean = sums.sumY / n;
  const squares = points.reduce(
    (acc, point) => {
      const yPred = slope * point.x + intercept;
      return {
        ssTot: acc.ssTot + (point.y - yMean) ** 2,
        ssRes: acc.ssRes + (point.y - yPred) ** 2,
      };
    },
    { ssTot: 0, ssRes: 0 }
  );
  const rSquared = squares.ssTot === 0 ? 1 : 1 - squares.ssRes / squares.ssTot;

  return { slope, intercept, rSquared };
}

/**
 * Calculate exponential regression (y = a * e^(bx))
 *
 * @see ECMA-376 Part 1, Section 21.2.3.51 - "exp" type
 */
function calculateExponentialRegression(
  points: readonly { x: number; y: number }[]
): { a: number; b: number; rSquared: number } {
  // Filter out non-positive y values (can't take log)
  const validPoints = points.filter((p) => p.y > 0);
  if (validPoints.length < 2) {return { a: 1, b: 0, rSquared: 0 };}

  // Transform: ln(y) = ln(a) + bx
  const logPoints = validPoints.map((p) => ({ x: p.x, y: Math.log(p.y) }));
  const { slope: b, intercept: lnA, rSquared } = calculateLinearRegression(logPoints);

  return { a: Math.exp(lnA), b, rSquared };
}

/**
 * Calculate logarithmic regression (y = a * ln(x) + b)
 *
 * @see ECMA-376 Part 1, Section 21.2.3.51 - "log" type
 */
function calculateLogarithmicRegression(
  points: readonly { x: number; y: number }[]
): { a: number; b: number; rSquared: number } {
  // Filter out non-positive x values (can't take log)
  const validPoints = points.filter((p) => p.x > 0);
  if (validPoints.length < 2) {return { a: 0, b: 0, rSquared: 0 };}

  // Transform: y = a * ln(x) + b
  const logPoints = validPoints.map((p) => ({ x: Math.log(p.x), y: p.y }));
  const { slope: a, intercept: b, rSquared } = calculateLinearRegression(logPoints);

  return { a, b, rSquared };
}

/**
 * Calculate power regression (y = a * x^b)
 *
 * @see ECMA-376 Part 1, Section 21.2.3.51 - "power" type
 */
function calculatePowerRegression(
  points: readonly { x: number; y: number }[]
): { a: number; b: number; rSquared: number } {
  // Filter out non-positive values
  const validPoints = points.filter((p) => p.x > 0 && p.y > 0);
  if (validPoints.length < 2) {return { a: 1, b: 1, rSquared: 0 };}

  // Transform: ln(y) = ln(a) + b * ln(x)
  const logPoints = validPoints.map((p) => ({ x: Math.log(p.x), y: Math.log(p.y) }));
  const { slope: b, intercept: lnA, rSquared } = calculateLinearRegression(logPoints);

  return { a: Math.exp(lnA), b, rSquared };
}

/**
 * Calculate polynomial regression coefficients
 *
 * Uses matrix operations to solve the system of equations.
 *
 * @see ECMA-376 Part 1, Section 21.2.3.51 - "poly" type
 * @see ECMA-376 Part 1, Section 21.2.2.209 - order element (2-6)
 */
function calculatePolynomialRegression(
  points: readonly { x: number; y: number }[],
  order: number
): { coefficients: number[]; rSquared: number } {
  const n = points.length;
  const deg = Math.min(order, n - 1, 6); // ECMA-376 limits to 2-6

  if (n < 2 || deg < 1) {
    return { coefficients: [0], rSquared: 0 };
  }

  // Build Vandermonde matrix and solve using normal equations
  // This is a simplified implementation for orders up to 6
  const degreeIndices = rangeInclusive(0, deg);
  const pointIndices = range(n);
  const X = points.map((point) => degreeIndices.map((power) => point.x ** power));
  const Y = points.map((point) => point.y);

  // Solve X^T * X * coeffs = X^T * Y using Gaussian elimination
  const XtX = degreeIndices.map((i) => {
    return degreeIndices.map((j) => {
      return pointIndices.reduce((sum, k) => sum + X[k][i] * X[k][j], 0);
    });
  });
  const XtY = degreeIndices.map((i) => {
    return pointIndices.reduce((sum, k) => sum + X[k][i] * Y[k], 0);
  });

  // Gaussian elimination with partial pivoting
  const coefficients = gaussianElimination(XtX, XtY);

  // Calculate R-squared
  const yMean = Y.reduce((a, b) => a + b, 0) / n;
  const squares = pointIndices.reduce(
    (acc, index) => {
      const yPred = degreeIndices.reduce((sum, j) => sum + coefficients[j] * X[index][j], 0);
      return {
        ssTot: acc.ssTot + (Y[index] - yMean) ** 2,
        ssRes: acc.ssRes + (Y[index] - yPred) ** 2,
      };
    },
    { ssTot: 0, ssRes: 0 }
  );
  const rSquared = squares.ssTot === 0 ? 1 : 1 - squares.ssRes / squares.ssTot;

  return { coefficients, rSquared };
}

/**
 * Gaussian elimination solver
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  range(n).forEach((i) => {
    const maxRow = findPivotRow(augmented, i, n);
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    rangeFrom(i + 1, n).forEach((k) => {
      if (augmented[i][i] !== 0) {
        const factor = augmented[k][i] / augmented[i][i];
        rangeInclusive(i, n).forEach((j) => {
          augmented[k][j] -= factor * augmented[i][j];
        });
      }
    });
  });

  // Back substitution
  const x = new Array(n).fill(0);
  rangeDescending(n - 1, 0).forEach((i) => {
    if (augmented[i][i] !== 0) {
      const sum = rangeFrom(i + 1, n).reduce((total, j) => total + augmented[i][j] * x[j], 0);
      x[i] = (augmented[i][n] - sum) / augmented[i][i];
    }
  });

  return x;
}

/**
 * Calculate moving average
 *
 * @see ECMA-376 Part 1, Section 21.2.3.51 - "movingAvg" type
 * @see ECMA-376 Part 1, Section 21.2.2.209 - period element
 */
function calculateMovingAverage(
  points: readonly { x: number; y: number }[],
  period: number
): readonly { x: number; y: number }[] {
  const p = Math.min(period, points.length);
  return rangeFrom(p - 1, points.length).map((i) => {
    const sum = range(p).reduce((total, j) => total + points[i - j].y, 0);
    return {
      x: points[i].x,
      y: sum / p,
    };
  });
}

// =============================================================================
// Trendline Rendering
// =============================================================================

/**
 * Default trendline styling
 *
 * Per ECMA-376, trendlines default to a dashed line style when
 * no spPr is specified.
 */
const DEFAULT_TRENDLINE_COLOR = "#666666";
const DEFAULT_TRENDLINE_WIDTH = 1.5;
const DEFAULT_TRENDLINE_DASH = "4,2";

/**
 * Get trendline style from shape properties
 *
 * Extracts line color, width, and dash style from the trendline's
 * shape properties (c:spPr).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline) - spPr child
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
function getTrendlineStyle(spPr: ChartShapeProperties | undefined): ResolvedLineStyle {
  if (!spPr) {
    // Default trendline style when no spPr specified
    return {
      color: DEFAULT_TRENDLINE_COLOR,
      width: DEFAULT_TRENDLINE_WIDTH,
      dashArray: DEFAULT_TRENDLINE_DASH,
    };
  }

  // Extract from spPr using shared utility
  const lineStyle = extractLineStyle(spPr);

  // Use extracted values with trendline-specific defaults
  return {
    color: lineStyle.color,
    width: lineStyle.width,
    // If solid, use no dash; if specified, use it; otherwise use default dash
    dashArray: resolveTrendlineDashArray(spPr.line?.dash, lineStyle.dashArray),
  };
}

/**
 * Generate SVG path for a trendline
 *
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */
export function renderTrendline(
  trendline: Trendline,
  seriesData: SeriesData,
  chartWidth: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number }
): string {
  const points = seriesData.values.map((v, i) => ({
    x: i,
    y: v.y,
  }));

  if (points.length < 2) {return "";}

  const { minVal, maxVal } = valueRange;
  const range = maxVal - minVal;
  const numPoints = points.length;
  const xStep = chartWidth / Math.max(numPoints - 1, 1);

  // Calculate extended range for forward/backward forecast
  const backward = trendline.backward ?? 0;
  const forward = trendline.forward ?? 0;
  const startX = -backward;
  const endX = numPoints - 1 + forward;

  const style = getTrendlineStyle(trendline.shapeProperties);
  const strokeDash = style.dashArray ? ` stroke-dasharray="${style.dashArray}"` : "";

  const trendlineState = {
    pathPoints: [] as { x: number; y: number }[],
    equation: "",
    rSquared: 0,
  };

  switch (trendline.trendlineType) {
    case "linear": {
      const { slope, intercept, rSquared: r2 } = calculateLinearRegression(points);
      trendlineState.rSquared = r2;

      // Apply intercept override if specified
      const actualIntercept = trendline.intercept ?? intercept;

      // Generate line points
      const y1 = slope * startX + actualIntercept;
      const y2 = slope * endX + actualIntercept;

      trendlineState.pathPoints = [
        { x: startX * xStep, y: chartHeight - ((y1 - minVal) / range) * chartHeight },
        { x: endX * xStep, y: chartHeight - ((y2 - minVal) / range) * chartHeight },
      ];

      trendlineState.equation = `y = ${slope.toFixed(4)}x + ${actualIntercept.toFixed(4)}`;
      break;
    }

    case "exp": {
      const { a, b, rSquared: r2 } = calculateExponentialRegression(points);
      trendlineState.rSquared = r2;

      // Generate curve points
      const numSegments = 50;
      trendlineState.pathPoints = buildCurvePoints(
        numSegments,
        startX,
        endX,
        xStep,
        chartHeight,
        minVal,
        range,
        (x) => a * Math.exp(b * x)
      );

      trendlineState.equation = `y = ${a.toFixed(4)}e^(${b.toFixed(4)}x)`;
      break;
    }

    case "log": {
      const { a, b, rSquared: r2 } = calculateLogarithmicRegression(points);
      trendlineState.rSquared = r2;

      // Generate curve points (start from x > 0)
      const numSegments = 50;
      const actualStart = Math.max(startX, 0.1);
      trendlineState.pathPoints = buildCurvePoints(
        numSegments,
        actualStart,
        endX,
        xStep,
        chartHeight,
        minVal,
        range,
        (x) => a * Math.log(x) + b
      );

      trendlineState.equation = `y = ${a.toFixed(4)}ln(x) + ${b.toFixed(4)}`;
      break;
    }

    case "power": {
      const { a, b, rSquared: r2 } = calculatePowerRegression(points);
      trendlineState.rSquared = r2;

      // Generate curve points (start from x > 0)
      const numSegments = 50;
      const actualStart = Math.max(startX, 0.1);
      trendlineState.pathPoints = buildCurvePoints(
        numSegments,
        actualStart,
        endX,
        xStep,
        chartHeight,
        minVal,
        range,
        (x) => a * x ** b
      );

      trendlineState.equation = `y = ${a.toFixed(4)}x^${b.toFixed(4)}`;
      break;
    }

    case "poly": {
      const order = trendline.order ?? 2;
      const { coefficients, rSquared: r2 } = calculatePolynomialRegression(points, order);
      trendlineState.rSquared = r2;

      // Generate curve points
      const numSegments = 50;
      trendlineState.pathPoints = buildCurvePoints(
        numSegments,
        startX,
        endX,
        xStep,
        chartHeight,
        minVal,
        range,
        (x) => coefficients.reduce((sum, coeff, index) => sum + coeff * x ** index, 0)
      );

      trendlineState.equation = `y = ${coefficients.map((c, i) => `${c.toFixed(4)}x^${i}`).join(" + ")}`;
      break;
    }

    case "movingAvg": {
      const period = trendline.period ?? 2;
      const avgPoints = calculateMovingAverage(points, period);

      trendlineState.pathPoints = avgPoints.map((p) => ({
        x: p.x * xStep,
        y: chartHeight - ((p.y - minVal) / range) * chartHeight,
      }));

      trendlineState.equation = `${period}-period moving average`;
      break;
    }
  }

  if (trendlineState.pathPoints.length < 2) {return "";}

  // Build path
  const pathD = trendlineState.pathPoints
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const elements: string[] = [];

  // Render trendline
  elements.push(
    `<path d="${pathD}" fill="none" stroke="${style.color}" stroke-width="${style.width}"${strokeDash}/>`
  );

  // Render trendline label (equation and/or R²)
  // @see ECMA-376 Part 1, Section 21.2.2.210 (trendlineLbl)
  const label = trendline.trendlineLabel;
  const hasEquation = trendline.dispEq;
  const hasRSquared = trendline.dispRSqr;

  if (hasEquation || hasRSquared) {
    // Determine label position
    // Use manual layout if available, otherwise position at the end of the trendline
    const lastPoint = trendlineState.pathPoints[trendlineState.pathPoints.length - 1];
    const labelPos = resolveTrendlineLabelPosition(lastPoint, label?.layout?.manualLayout, chartWidth, chartHeight);

    // Get text styling from trendlineLabel.txPr
    // @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
    const textStyle = label?.textProperties ? resolveTextStyle(label.textProperties) : null;
    const textAttrs = textStyle ? toSvgTextAttributes(textStyle) : `font-size="10"`;
    const textColor = style.color;

    // Build label content
    const labelParts: string[] = [];
    if (hasEquation) {
      labelParts.push(trendlineState.equation);
    }
    if (hasRSquared) {
      labelParts.push(`R² = ${trendlineState.rSquared.toFixed(4)}`);
    }

    // Render label background if spPr is specified
    // @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
    if (label?.shapeProperties) {
      const bgFill = label.shapeProperties.fill;
      const bgColor = resolveSolidFillColor(bgFill);
      if (bgColor) {
        const lineHeight = textStyle?.fontSize ?? 10;
        const padding = 4;
        const estimatedWidth = Math.max(...labelParts.map(p => p.length * 6)) + padding * 2;
        const estimatedHeight = labelParts.length * (lineHeight + 2) + padding * 2;

        elements.push(
          `<rect x="${labelPos.x - padding}" y="${labelPos.y - lineHeight - padding}" ` +
            `width="${estimatedWidth}" height="${estimatedHeight}" ` +
            `fill="${bgColor}" rx="2"/>`
        );
      }
    }

    // Render each line of the label
    labelParts.forEach((labelPart, index) => {
      const yOffset = index * ((textStyle?.fontSize ?? 10) + 2);
      elements.push(
        `<text x="${labelPos.x}" y="${labelPos.y + yOffset}" ${textAttrs} fill="${textColor}">${escapeHtml(labelPart)}</text>`
      );
    });
  }

  return elements.join("");
}

function resolveTrendlineDashArray(
  dash: ChartShapeProperties["line"] extends { dash: infer Dash } ? Dash : unknown,
  defaultDashArray: string | undefined
): string | undefined {
  if (dash === "solid") {
    return undefined;
  }
  return defaultDashArray ?? DEFAULT_TRENDLINE_DASH;
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

function buildCurvePoints(
  numSegments: number,
  startX: number,
  endX: number,
  xStep: number,
  chartHeight: number,
  minVal: number,
  range: number,
  getY: (x: number) => number
): { x: number; y: number }[] {
  return rangeInclusive(0, numSegments).map((i) => {
    const x = startX + (i / numSegments) * (endX - startX);
    const y = getY(x);
    return {
      x: x * xStep,
      y: chartHeight - ((y - minVal) / range) * chartHeight,
    };
  });
}

function resolveTrendlineLabelPosition(
  lastPoint: { x: number; y: number },
  manualLayout: Layout["manualLayout"] | undefined,
  chartWidth: number,
  chartHeight: number
): { x: number; y: number } {
  const x = manualLayout?.x !== undefined ? manualLayout.x * chartWidth : lastPoint.x;
  const y = manualLayout?.y !== undefined ? manualLayout.y * chartHeight : lastPoint.y;
  return { x, y };
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

function rangeFrom(start: number, end: number): number[] {
  const length = Math.max(end - start, 0);
  return Array.from({ length }, (_, i) => start + i);
}

function rangeInclusive(start: number, end: number): number[] {
  const length = Math.max(end - start + 1, 0);
  return Array.from({ length }, (_, i) => start + i);
}

function rangeDescending(start: number, end: number): number[] {
  const length = Math.max(start - end + 1, 0);
  return Array.from({ length }, (_, i) => start - i);
}

function findPivotRow(augmented: number[][], pivotIndex: number, n: number): number {
  return rangeFrom(pivotIndex + 1, n).reduce((maxRow, rowIndex) => {
    if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
      return rowIndex;
    }
    return maxRow;
  }, pivotIndex);
}

/**
 * Render all trendlines for a series
 *
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */
export function renderTrendlines(
  trendlines: readonly Trendline[] | undefined,
  seriesData: SeriesData,
  chartWidth: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number }
): string {
  if (!trendlines || trendlines.length === 0) {return "";}

  return trendlines
    .map((tl) => renderTrendline(tl, seriesData, chartWidth, chartHeight, valueRange))
    .join("");
}
