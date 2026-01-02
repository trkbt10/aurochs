/**
 * @file Chart axis utilities
 *
 * Rendering functions for chart axes, gridlines, and axis labels.
 *
 * Text styling is extracted from c:txPr following ECMA-376 resolution order
 * using shared text-props utilities.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 */

import type { Axis, CategoryAxis, ValueAxis, DateAxis, ChartTitle, TickMark, DisplayUnits } from "../../../domain/chart";
import type { TextBody } from "../../../domain/text";
import type { MultiLevelCategories } from "./data";
import { escapeHtml } from "../../html/index";
import { extractFontSize, extractBold, resolveTextStyle, toSvgTextAttributes } from "./text-props";
import { formatAxisValue } from "./number-format";
import { extractLineStyle, toSvgStrokeAttributes } from "./line-style";

// =============================================================================
// Display Units Utilities
// =============================================================================

/**
 * Built-in unit multipliers
 *
 * @see ECMA-376 Part 1, Section 21.2.2.21 (builtInUnit)
 */
const DISPLAY_UNIT_MULTIPLIERS: Record<NonNullable<DisplayUnits["builtInUnit"]>, number> = {
  hundreds: 100,
  thousands: 1000,
  tenThousands: 10000,
  hundredThousands: 100000,
  millions: 1000000,
  tenMillions: 10000000,
  hundredMillions: 100000000,
  billions: 1000000000,
  trillions: 1000000000000,
};

/**
 * Built-in unit display labels
 */
const DISPLAY_UNIT_LABELS: Record<NonNullable<DisplayUnits["builtInUnit"]>, string> = {
  hundreds: "Hundreds",
  thousands: "Thousands",
  tenThousands: "10 Thousands",
  hundredThousands: "100 Thousands",
  millions: "Millions",
  tenMillions: "10 Millions",
  hundredMillions: "100 Millions",
  billions: "Billions",
  trillions: "Trillions",
};

/**
 * Get the multiplier for display units
 *
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dispUnits)
 */
export function getDisplayUnitMultiplier(dispUnits: DisplayUnits | undefined): number {
  if (!dispUnits) {
    return 1;
  }

  if (dispUnits.builtInUnit) {
    return DISPLAY_UNIT_MULTIPLIERS[dispUnits.builtInUnit];
  }

  if (dispUnits.customUnit !== undefined && dispUnits.customUnit > 0) {
    return dispUnits.customUnit;
  }

  return 1;
}

/**
 * Get display unit label text
 *
 * Returns the label from dispUnitsLbl if provided, otherwise uses built-in label.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.48 (dispUnitsLbl)
 */
function getDisplayUnitLabel(dispUnits: DisplayUnits | undefined): string | undefined {
  if (!dispUnits) {
    return undefined;
  }

  // If custom label is provided, extract text from it
  if (dispUnits.dispUnitsLbl?.textBody) {
    const paragraphs = dispUnits.dispUnitsLbl.textBody.paragraphs ?? [];
    const textParts: string[] = [];
    for (const p of paragraphs) {
      for (const run of p.runs) {
        const text = getTextRunValue(run);
        if (text) {
          textParts.push(text);
        }
      }
    }
    if (textParts.length > 0) {
      return textParts.join("");
    }
  }

  // Use built-in label
  if (dispUnits.builtInUnit) {
    return DISPLAY_UNIT_LABELS[dispUnits.builtInUnit];
  }

  // For custom unit without label, show the multiplier
  if (dispUnits.customUnit !== undefined && dispUnits.customUnit > 0) {
    return `×${dispUnits.customUnit.toLocaleString()}`;
  }

  return undefined;
}

// =============================================================================
// Date Axis Utilities
// =============================================================================

/**
 * Time unit type for date axes
 *
 * @see ECMA-376 Part 1, Section 21.2.3.48 (ST_TimeUnit)
 */
type TimeUnit = "days" | "months" | "years";

/**
 * Month names for date formatting
 */
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function getTextRunValue(run: TextBody["paragraphs"][number]["runs"][number]): string | undefined {
  if ("text" in run) {
    return run.text;
  }
  return undefined;
}

function selectNiceUnit(residual: number): number {
  if (residual <= 1.5) {
    return 1;
  }
  if (residual <= 3) {
    return 2;
  }
  if (residual <= 7) {
    return 5;
  }
  return 10;
}

function getValueAxisLabelPosition(
  position: ValueAxis["tickLabelPosition"],
  chartWidth?: number
): { xPos: number; textAnchor: string } {
  switch (position) {
    case "high":
      // Labels at high end (right side for vertical axis)
      return { xPos: (chartWidth ?? 0) + 5, textAnchor: "start" };
    case "low":
      // Labels at low end (left side, further away)
      return { xPos: -15, textAnchor: "end" };
    case "nextTo":
    default:
      // Labels next to axis (default position)
      return { xPos: -5, textAnchor: "end" };
  }
}

function getCategoryLabelX(
  alignment: "l" | "r" | "ctr",
  index: number,
  categoryWidth: number
): number {
  switch (alignment) {
    case "l":
      return index * categoryWidth + 5;
    case "r":
      return (index + 1) * categoryWidth - 5;
    default:
      return index * categoryWidth + categoryWidth / 2;
  }
}

function resolveDateFromNumericValue(dateValue: number): Date {
  if (dateValue > 25569 && dateValue < 100000) {
    // Likely an Excel serial date
    // Excel serial date: days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
  }
  if (dateValue > 100000000) {
    // Unix timestamp in milliseconds
    return new Date(dateValue);
  }
  // Assume Unix timestamp in seconds
  return new Date(dateValue * 1000);
}

/**
 * Format a date label based on the time unit
 *
 * Formats date strings according to the specified time unit:
 * - days: "Jan 15, 2024" or "15 Jan 2024"
 * - months: "Jan 2024"
 * - years: "2024"
 *
 * @see ECMA-376 Part 1, Section 21.2.2.14 (baseTimeUnit)
 * @see ECMA-376 Part 1, Section 21.2.2.92 (majorTimeUnit)
 */
export function formatDateLabel(
  dateValue: string | number,
  timeUnit: TimeUnit | undefined
): string {
  // If already a formatted string, try to reformat based on time unit
  if (typeof dateValue === "string") {
    // Try to parse as a date
    const parsed = Date.parse(dateValue);
    if (isNaN(parsed)) {
      // Not a valid date, return as-is
      return dateValue;
    }
    dateValue = parsed;
  }

  // Excel serial date (days since 1899-12-30) or Unix timestamp
  const date = resolveDateFromNumericValue(dateValue);

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (timeUnit) {
    case "years":
      return String(year);
    case "months":
      return `${MONTH_NAMES[month]} ${year}`;
    case "days":
    default:
      return `${MONTH_NAMES[month]} ${day}, ${year}`;
  }
}

/**
 * Render display units label for value axis
 *
 * The label is typically positioned near the axis to indicate the scale.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dispUnits)
 * @see ECMA-376 Part 1, Section 21.2.2.48 (dispUnitsLbl)
 */
export function renderDisplayUnitsLabel(
  axes: readonly Axis[]
): string {
  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  if (!valAxis?.dispUnits || valAxis.delete) {
    return "";
  }

  const label = getDisplayUnitLabel(valAxis.dispUnits);
  if (!label) {
    return "";
  }

  // Position the label at the top of the axis, rotated
  const x = -45;
  const y = 15;

  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="#666" transform="rotate(-90, ${x}, ${y})">${escapeHtml(label)}</text>`;
}

// =============================================================================
// Logarithmic Scale Utilities
// =============================================================================

/**
 * Check if an axis uses logarithmic scaling
 *
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase)
 */
export function isLogScale(axis: ValueAxis | undefined): boolean {
  return axis?.logBase !== undefined && axis.logBase > 0;
}

/**
 * Convert a value to logarithmic position
 *
 * Per ECMA-376 Part 1, Section 21.2.2.90, logBase specifies the base
 * of the logarithm for the axis (typically 10 for log10 scale).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase)
 */
export function toLogPosition(
  value: number,
  minVal: number,
  maxVal: number,
  logBase: number,
  chartSize: number
): number {
  // Clamp to positive values for log scale
  const safeValue = Math.max(value, Number.EPSILON);
  const safeMin = Math.max(minVal, Number.EPSILON);
  const safeMax = Math.max(maxVal, safeMin);

  const logMin = Math.log(safeMin) / Math.log(logBase);
  const logMax = Math.log(safeMax) / Math.log(logBase);
  const logVal = Math.log(safeValue) / Math.log(logBase);

  const logRange = logMax - logMin;
  if (logRange === 0) {
    return chartSize / 2;
  }

  return ((logVal - logMin) / logRange) * chartSize;
}

/**
 * Calculate major unit for logarithmic scale
 *
 * For log scales, major gridlines typically appear at each power of the base
 * (e.g., 1, 10, 100, 1000 for base 10).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase)
 */
function calculateLogMajorValues(
  minVal: number,
  maxVal: number,
  logBase: number
): number[] {
  const safeMin = Math.max(minVal, Number.EPSILON);
  const safeMax = Math.max(maxVal, safeMin);

  const logMin = Math.log(safeMin) / Math.log(logBase);
  const logMax = Math.log(safeMax) / Math.log(logBase);

  const values: number[] = [];

  // Start from the floor of logMin and go to ceiling of logMax
  const startPow = Math.floor(logMin);
  const endPow = Math.ceil(logMax);

  for (let pow = startPow; pow <= endPow; pow++) {
    const value = Math.pow(logBase, pow);
    if (value >= safeMin && value <= safeMax) {
      values.push(value);
    }
  }

  return values;
}

// =============================================================================
// Axis Title Rendering
// =============================================================================

/**
 * Extract plain text from ChartTitle
 */
function getAxisTitleText(title: ChartTitle | undefined): string | undefined {
  if (!title?.textBody) {
    return undefined;
  }

  // Extract text from paragraphs
  const paragraphs = title.textBody.paragraphs ?? [];
  const textParts: string[] = [];

  for (const p of paragraphs) {
    for (const run of p.runs) {
      const text = getTextRunValue(run);
      if (text) {
        textParts.push(text);
      }
    }
  }

  if (textParts.length === 0) {
    return undefined;
  }
  return textParts.join("");
}

/**
 * Render axis titles with text property support
 *
 * Applies text styling from c:title/c:txPr following ECMA-376.
 * The title element contains:
 * - c:tx: The title text (or c:strRef for referenced text)
 * - c:layout: Optional manual positioning
 * - c:overlay: Whether title overlays the plot area
 * - c:spPr: Shape properties for the title
 * - c:txPr: Text properties for styling
 *
 * @see ECMA-376 Part 1, Section 21.2.2.211 (title)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
 */
export function renderAxisTitles(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number
): string {
  const titles: string[] = [];

  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  const catAxis = axes.find((ax): ax is CategoryAxis => ax.type === "catAx");

  // Value axis title (typically on left, rotated 90 degrees)
  if (valAxis?.title && !valAxis.delete) {
    const titleText = getAxisTitleText(valAxis.title);
    if (titleText) {
      // Position to the left of the chart, rotated
      const x = -45;
      const y = chartHeight / 2;

      // Resolve text style from c:txPr
      // @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
      const style = resolveTextStyle(valAxis.title.textBody);
      const styleAttrs = toSvgTextAttributes(style);

      titles.push(
        `<text x="${x}" y="${y}" text-anchor="middle" ${styleAttrs} fill="#333" transform="rotate(-90, ${x}, ${y})">${escapeHtml(titleText)}</text>`
      );
    }
  }

  // Category axis title (typically at bottom, horizontal)
  if (catAxis?.title && !catAxis.delete) {
    const titleText = getAxisTitleText(catAxis.title);
    if (titleText) {
      const x = chartWidth / 2;
      const y = chartHeight + 35;

      // Resolve text style from c:txPr
      // @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
      const style = resolveTextStyle(catAxis.title.textBody);
      const styleAttrs = toSvgTextAttributes(style);

      titles.push(
        `<text x="${x}" y="${y}" text-anchor="middle" ${styleAttrs} fill="#333">${escapeHtml(titleText)}</text>`
      );
    }
  }

  return titles.join("");
}

// =============================================================================
// Axis Rendering Utilities
// =============================================================================

/**
 * Default axis line styling
 *
 * Per ECMA-376, axis line styling is defined by spPr child element.
 * When not specified, implementation-defined defaults are used.
 */
const DEFAULT_AXIS_STROKE = "#333";
const DEFAULT_AXIS_STROKE_WIDTH = 1;

/**
 * Get axis line styling from shapeProperties
 *
 * Extracts line styling from the axis's spPr element.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
function getAxisLineStyle(axis: Axis | undefined): { stroke: string; strokeWidth: number; strokeAttrs: string } {
  if (!axis?.shapeProperties?.line) {
    return {
      stroke: DEFAULT_AXIS_STROKE,
      strokeWidth: DEFAULT_AXIS_STROKE_WIDTH,
      strokeAttrs: `stroke="${DEFAULT_AXIS_STROKE}" stroke-width="${DEFAULT_AXIS_STROKE_WIDTH}"`,
    };
  }

  const lineStyle = extractLineStyle(axis.shapeProperties);
  return {
    stroke: lineStyle.color,
    strokeWidth: lineStyle.width,
    strokeAttrs: toSvgStrokeAttributes(lineStyle),
  };
}

/**
 * Generate chart axes lines with spPr styling support
 *
 * Draws the category axis (horizontal) and value axis (vertical) lines
 * using styling from each axis's shapeProperties.
 *
 * @param chartWidth - Chart width in pixels
 * @param chartHeight - Chart height in pixels
 * @param axes - Optional array of axis definitions for styling
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */
export function drawAxes(
  chartWidth: number,
  chartHeight: number,
  axes?: readonly Axis[]
): string {
  // Find category and value axes for styling
  const catAxis = axes?.find((ax): ax is CategoryAxis => ax.type === "catAx");
  const valAxis = axes?.find((ax): ax is ValueAxis => ax.type === "valAx");

  // Get styling for each axis
  const catStyle = getAxisLineStyle(catAxis);
  const valStyle = getAxisLineStyle(valAxis);

  const lines: string[] = [];

  // Category axis (horizontal line at bottom)
  // Only render if not deleted
  if (!catAxis?.delete) {
    lines.push(
      `<line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" ${catStyle.strokeAttrs}/>`
    );
  }

  // Value axis (vertical line on left)
  // Only render if not deleted
  if (!valAxis?.delete) {
    lines.push(
      `<line x1="0" y1="0" x2="0" y2="${chartHeight}" ${valStyle.strokeAttrs}/>`
    );
  }

  return lines.join("");
}

/**
 * Safely get label from xlabels record
 */
export function safeGetLabel(
  xlabels: Record<string, string> | undefined,
  index: number
): string {
  if (!xlabels) {
    return String(index + 1);
  }
  return xlabels[String(index)] ?? String(index + 1);
}

// =============================================================================
// Gridlines Rendering
// =============================================================================

/**
 * Calculate appropriate major unit for gridlines (implementation-defined)
 *
 * ECMA-376 specifies c:majorUnit (21.2.2.96) for explicit axis intervals,
 * but when not provided, the application chooses a "nice" interval.
 *
 * This uses the "nice number" algorithm to select human-friendly intervals
 * (1, 2, 5 multiples) that produce approximately 5 gridlines.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.96 (majorUnit) - when explicit
 */
export function calculateMajorUnit(range: number): number {
  const roughUnit = range / 5; // Aim for ~5 gridlines (implementation choice)
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughUnit)));
  const residual = roughUnit / magnitude;

  // "Nice" numbers: 1, 2, 5, 10
  const niceUnit = selectNiceUnit(residual);

  return niceUnit * magnitude;
}

/**
 * Render major gridlines for value axis
 *
 * Supports both linear and logarithmic scales.
 * For log scale, gridlines appear at each power of the base.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.87 (majorGridlines)
 * @see ECMA-376 Part 1, Section 21.2.2.50 (delete) - axis visibility
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase) - logarithmic scale
 */
export function renderGridlines(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number }
): string {
  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  // Check for delete flag - hidden axes should not render gridlines
  if (!valAxis?.majorGridlines || valAxis.delete) {
    return "";
  }

  const { minVal, maxVal } = valueRange;
  const lines: string[] = [];

  // Handle logarithmic scale
  if (isLogScale(valAxis)) {
    const logBase = valAxis.logBase!;
    const majorValues = calculateLogMajorValues(minVal, maxVal, logBase);

    for (const val of majorValues) {
      const y = chartHeight - toLogPosition(val, minVal, maxVal, logBase, chartHeight);
      lines.push(
        `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#ddd" stroke-width="1"/>`
      );
    }
  } else {
    // Linear scale
    const range = maxVal - minVal;
    const majorUnit = valAxis.majorUnit ?? calculateMajorUnit(range);

    // Draw horizontal gridlines (for value axis on left)
    for (
      let val = Math.ceil(minVal / majorUnit) * majorUnit;
      val <= maxVal;
      val += majorUnit
    ) {
      const y = chartHeight - ((val - minVal) / range) * chartHeight;
      lines.push(
        `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#ddd" stroke-width="1"/>`
      );
    }
  }

  return lines.join("");
}

/**
 * Calculate minor gridline values for logarithmic scale
 *
 * For log scales, minor gridlines appear at intermediate values between
 * major gridlines (powers of the base). For example, with base 10 and
 * range [1, 100], minor gridlines appear at 2, 3, 4, 5, 6, 7, 8, 9
 * between 1 and 10, and 20, 30, 40, 50, 60, 70, 80, 90 between 10 and 100.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase)
 */
function calculateLogMinorValues(
  minVal: number,
  maxVal: number,
  logBase: number
): number[] {
  const safeMin = Math.max(minVal, Number.EPSILON);
  const safeMax = Math.max(maxVal, safeMin);

  const logMin = Math.log(safeMin) / Math.log(logBase);
  const logMax = Math.log(safeMax) / Math.log(logBase);

  const values: number[] = [];

  // Iterate through each decade/cycle
  const startPow = Math.floor(logMin);
  const endPow = Math.ceil(logMax);

  for (let pow = startPow; pow < endPow; pow++) {
    const baseValue = Math.pow(logBase, pow);
    const nextBase = Math.pow(logBase, pow + 1);

    // Add minor gridlines between major gridlines
    // For base 10: 2, 3, 4, 5, 6, 7, 8, 9
    // For base 2: 1.5 (approximately halfway in log space)
    if (logBase === 10) {
      // Standard minor gridlines at 2, 3, 4, 5, 6, 7, 8, 9 times the base
      for (let mult = 2; mult < 10; mult++) {
        const value = baseValue * mult;
        if (value >= safeMin && value <= safeMax) {
          values.push(value);
        }
      }
    } else if (logBase === 2) {
      // For base 2, add gridlines at 1.5 times
      const value = baseValue * 1.5;
      if (value >= safeMin && value <= safeMax && value < nextBase) {
        values.push(value);
      }
    } else {
      // For other bases, add (logBase - 1) minor gridlines evenly spaced in log space
      const numMinor = Math.min(9, Math.floor(logBase) - 1);
      for (let i = 1; i <= numMinor; i++) {
        const logValue = pow + i / (numMinor + 1);
        const value = Math.pow(logBase, logValue);
        if (value >= safeMin && value <= safeMax) {
          values.push(value);
        }
      }
    }
  }

  return values;
}

/**
 * Render minor gridlines for value axis
 *
 * Minor gridlines appear between major gridlines for finer visual reference.
 * Supports both linear and logarithmic scales.
 *
 * For log scale, minor gridlines appear at intermediate values between
 * powers of the base (e.g., 2-9 between 10^0 and 10^1 for base 10).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.99 (minorGridlines)
 * @see ECMA-376 Part 1, Section 21.2.2.100 (minorUnit)
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase) - logarithmic scale
 */
export function renderMinorGridlines(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number }
): string {
  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  // Check for minor gridlines presence and delete flag
  if (!valAxis?.minorGridlines || valAxis.delete) {
    return "";
  }

  const { minVal, maxVal } = valueRange;
  const lines: string[] = [];

  // Handle logarithmic scale
  if (isLogScale(valAxis)) {
    const logBase = valAxis.logBase!;
    const minorValues = calculateLogMinorValues(minVal, maxVal, logBase);

    for (const val of minorValues) {
      const y = chartHeight - toLogPosition(val, minVal, maxVal, logBase, chartHeight);
      lines.push(
        `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#eee" stroke-width="0.5"/>`
      );
    }
  } else {
    // Linear scale
    const range = maxVal - minVal;
    // Calculate minor unit - typically 1/5 of major unit
    const majorUnit = valAxis.majorUnit ?? calculateMajorUnit(range);
    const minorUnit = valAxis.minorUnit ?? majorUnit / 5;

    // Draw horizontal minor gridlines
    for (
      let val = Math.ceil(minVal / minorUnit) * minorUnit;
      val <= maxVal;
      val += minorUnit
    ) {
      // Skip if this would overlap with a major gridline
      const isMajor =
        Math.abs(val % majorUnit) < minorUnit / 2 ||
        Math.abs((val % majorUnit) - majorUnit) < minorUnit / 2;
      if (isMajor && valAxis.majorGridlines) {
        continue;
      }

      const y = chartHeight - ((val - minVal) / range) * chartHeight;
      lines.push(
        `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#eee" stroke-width="0.5"/>`
      );
    }
  }

  return lines.join("");
}

// =============================================================================
// Tick Marks Rendering
// =============================================================================

/**
 * Default tick mark size in pixels
 */
const TICK_MARK_SIZE = 5;

/**
 * Render tick mark based on style
 *
 * @see ECMA-376 Part 1, Section 21.2.3.43 (ST_TickMark)
 * - none: No tick marks
 * - in: Inside the chart area
 * - out: Outside the chart area
 * - cross: Both inside and outside
 */
function renderTickMark(
  tickMarkStyle: TickMark,
  position: "left" | "bottom",
  x: number,
  y: number
): string {
  if (tickMarkStyle === "none") {
    return "";
  }

  const size = TICK_MARK_SIZE;
  const elements: string[] = [];

  if (position === "left") {
    // Vertical axis (left side)
    if (tickMarkStyle === "out" || tickMarkStyle === "cross") {
      elements.push(`<line x1="${x - size}" y1="${y}" x2="${x}" y2="${y}" stroke="#333" stroke-width="1"/>`);
    }
    if (tickMarkStyle === "in" || tickMarkStyle === "cross") {
      elements.push(`<line x1="${x}" y1="${y}" x2="${x + size}" y2="${y}" stroke="#333" stroke-width="1"/>`);
    }
  } else {
    // Horizontal axis (bottom)
    if (tickMarkStyle === "out" || tickMarkStyle === "cross") {
      elements.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + size}" stroke="#333" stroke-width="1"/>`);
    }
    if (tickMarkStyle === "in" || tickMarkStyle === "cross") {
      elements.push(`<line x1="${x}" y1="${y - size}" x2="${x}" y2="${y}" stroke="#333" stroke-width="1"/>`);
    }
  }

  return elements.join("");
}

/**
 * Render value axis tick marks
 *
 * Supports logarithmic scale when logBase is specified.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.88 (majorTickMark)
 * @see ECMA-376 Part 1, Section 21.2.2.100 (minorTickMark)
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase) - logarithmic scale
 */
export function renderValueAxisTickMarks(
  axes: readonly Axis[],
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number }
): string {
  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  if (!valAxis || valAxis.delete) {
    return "";
  }

  const { minVal, maxVal } = valueRange;
  const marks: string[] = [];

  // Handle logarithmic scale
  if (isLogScale(valAxis)) {
    const logBase = valAxis.logBase!;
    const majorValues = calculateLogMajorValues(minVal, maxVal, logBase);

    // Render major tick marks at log scale positions
    if (valAxis.majorTickMark !== "none") {
      for (const val of majorValues) {
        const y = chartHeight - toLogPosition(val, minVal, maxVal, logBase, chartHeight);
        marks.push(renderTickMark(valAxis.majorTickMark, "left", 0, y));
      }
    }
    // Note: Minor tick marks on log scale would appear between each power
    // This is a simplified implementation - minor ticks not rendered for log scale
  } else {
    // Linear scale
    const range = maxVal - minVal;
    const majorUnit = valAxis.majorUnit ?? calculateMajorUnit(range);
    const minorUnit = valAxis.minorUnit ?? majorUnit / 5;

    // Render major tick marks
    if (valAxis.majorTickMark !== "none") {
      for (
        let val = Math.ceil(minVal / majorUnit) * majorUnit;
        val <= maxVal;
        val += majorUnit
      ) {
        const y = chartHeight - ((val - minVal) / range) * chartHeight;
        marks.push(renderTickMark(valAxis.majorTickMark, "left", 0, y));
      }
    }

    // Render minor tick marks
    if (valAxis.minorTickMark !== "none") {
      for (
        let val = Math.ceil(minVal / minorUnit) * minorUnit;
        val <= maxVal;
        val += minorUnit
      ) {
        // Skip if this would overlap with a major tick
        const isMajor =
          Math.abs(val % majorUnit) < minorUnit / 2 ||
          Math.abs((val % majorUnit) - majorUnit) < minorUnit / 2;
        if (isMajor) {
          continue;
        }

        const y = chartHeight - ((val - minVal) / range) * chartHeight;
        // Minor tick marks are smaller
        const size = TICK_MARK_SIZE / 2;
        if (valAxis.minorTickMark === "out" || valAxis.minorTickMark === "cross") {
          marks.push(`<line x1="${-size}" y1="${y}" x2="0" y2="${y}" stroke="#333" stroke-width="0.5"/>`);
        }
        if (valAxis.minorTickMark === "in" || valAxis.minorTickMark === "cross") {
          marks.push(`<line x1="0" y1="${y}" x2="${size}" y2="${y}" stroke="#333" stroke-width="0.5"/>`);
        }
      }
    }
  }

  return marks.join("");
}

/**
 * Render category axis tick marks
 *
 * @see ECMA-376 Part 1, Section 21.2.2.88 (majorTickMark)
 * @see ECMA-376 Part 1, Section 21.2.2.100 (minorTickMark)
 */
export function renderCategoryAxisTickMarks(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number,
  numCategories: number
): string {
  const catAxis = axes.find((ax): ax is CategoryAxis => ax.type === "catAx");
  if (!catAxis) {
    return "";
  }
  if (catAxis.delete) {
    return "";
  }
  if (numCategories === 0) {
    return "";
  }

  const categoryWidth = chartWidth / numCategories;
  const tickMarkSkip = catAxis.tickMarkSkip ?? 1;
  const marks: string[] = [];

  // Render major tick marks at category positions
  if (catAxis.majorTickMark !== "none") {
    for (let i = 0; i <= numCategories; i++) {
      if (i % tickMarkSkip !== 0) {
        continue;
      }

      const x = i * categoryWidth;
      marks.push(renderTickMark(catAxis.majorTickMark, "bottom", x, chartHeight));
    }
  }

  return marks.join("");
}

// =============================================================================
// Value Axis Labels
// =============================================================================

/**
 * Render value axis tick labels
 *
 * Applies font size and weight from c:txPr (text properties).
 * Supports tickLabelPosition for different label placements.
 * Supports logarithmic scale when logBase is specified.
 * Supports display units (dispUnits) for scaling values.
 *
 * @see ECMA-376 Part 1, Section 21.2.3.44 (ST_TickLblPos)
 *   - high: Labels at maximum end of axis
 *   - low: Labels at minimum end of axis
 *   - nextTo: Labels next to the axis line (default)
 *   - none: No labels
 * @see ECMA-376 Part 1, Section 21.2.2.50 (delete) - axis visibility
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase) - logarithmic scale
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dispUnits) - display units
 */
export function renderValueAxisLabels(
  axes: readonly Axis[],
  chartHeight: number,
  valueRange: { minVal: number; maxVal: number },
  chartWidth?: number
): string {
  const valAxis = axes.find((ax): ax is ValueAxis => ax.type === "valAx");
  // Check for delete flag and tickLabelPosition
  if (!valAxis || valAxis.tickLabelPosition === "none" || valAxis.delete) {
    return "";
  }

  const { minVal, maxVal } = valueRange;
  const labels: string[] = [];

  // Get font style from textProperties (c:txPr)
  const fontSize = extractFontSize(valAxis.textProperties);
  const isBold = extractBold(valAxis.textProperties);
  const fontWeight = isBold ? ' font-weight="bold"' : "";

  // Get display unit multiplier
  // @see ECMA-376 Part 1, Section 21.2.2.47 (dispUnits)
  const displayUnitMultiplier = getDisplayUnitMultiplier(valAxis.dispUnits);

  // Determine label position based on tickLabelPosition
  // @see ECMA-376 Part 1, Section 21.2.3.44 (ST_TickLblPos)
  const position = valAxis.tickLabelPosition;
  const { xPos, textAnchor } = getValueAxisLabelPosition(position, chartWidth);

  // Format number based on axis numFormat, divided by display unit multiplier
  // @see ECMA-376 Part 1, Section 21.2.2.121 (numFmt)
  const numFormat = valAxis.numFormat;
  const formatValue = (val: number): string => formatAxisValue(val / displayUnitMultiplier, numFormat);

  // Handle logarithmic scale
  if (isLogScale(valAxis)) {
    const logBase = valAxis.logBase!;
    const majorValues = calculateLogMajorValues(minVal, maxVal, logBase);

    for (const val of majorValues) {
      const y = chartHeight - toLogPosition(val, minVal, maxVal, logBase, chartHeight);
      labels.push(
        `<text x="${xPos}" y="${y + 4}" text-anchor="${textAnchor}" font-size="${fontSize}"${fontWeight} fill="#666">${formatValue(val)}</text>`
      );
    }
  } else {
    // Linear scale
    const range = maxVal - minVal;
    const majorUnit = valAxis.majorUnit ?? calculateMajorUnit(range);

    // Draw labels at determined position
    for (
      let val = Math.ceil(minVal / majorUnit) * majorUnit;
      val <= maxVal;
      val += majorUnit
    ) {
      const y = chartHeight - ((val - minVal) / range) * chartHeight;
      labels.push(
        `<text x="${xPos}" y="${y + 4}" text-anchor="${textAnchor}" font-size="${fontSize}"${fontWeight} fill="#666">${formatValue(val)}</text>`
      );
    }
  }

  return labels.join("");
}

// =============================================================================
// Category Axis Labels
// =============================================================================

/**
 * Default label offset in percentage
 * @see ECMA-376 Part 1, Section 21.2.2.78 (lblOffset) - default is 100%
 */
const DEFAULT_LABEL_OFFSET_PERCENT = 100;

/**
 * Render category axis tick labels
 *
 * Applies font size and weight from c:txPr (text properties).
 * Supports label offset, alignment, and skip options.
 * Also handles date axes with time unit-based formatting.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 * @see ECMA-376 Part 1, Section 21.2.2.204 (tickLblSkip) - skip every nth label
 * @see ECMA-376 Part 1, Section 21.2.2.50 (delete) - axis visibility
 * @see ECMA-376 Part 1, Section 21.2.2.82 (lblAlgn) - label alignment
 * @see ECMA-376 Part 1, Section 21.2.2.78 (lblOffset) - distance from axis (0-1000%)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 * @see ECMA-376 Part 1, Section 21.2.2.14 (baseTimeUnit) - date axis time unit
 */
export function renderCategoryAxisLabels(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number,
  categoryLabels: readonly string[]
): string {
  // Find category axis or date axis (date axis functions similarly to category axis)
  const catAxis = axes.find((ax): ax is CategoryAxis => ax.type === "catAx");
  const dateAxis = axes.find((ax): ax is DateAxis => ax.type === "dateAx");
  const axis = catAxis ?? dateAxis;

  // Check for delete flag and tickLabelPosition
  if (!axis || axis.tickLabelPosition === "none" || axis.delete) {
    return "";
  }
  if (categoryLabels.length === 0) {
    return "";
  }

  // Get time unit for date formatting (only applicable for date axes)
  const timeUnit = dateAxis?.majorTimeUnit ?? dateAxis?.baseTimeUnit;

  const numCategories = categoryLabels.length;
  const categoryWidth = chartWidth / numCategories;

  // tickLblSkip: skip every nth label to prevent overlap
  // Default is 1 (show all labels)
  // Note: tickLabelSkip is only on CategoryAxis, not DateAxis
  const tickLabelSkip = catAxis?.tickLabelSkip ?? 1;

  // Label alignment: ctr (center), l (left), r (right)
  // Default is center
  // Note: labelAlignment is only on CategoryAxis, not DateAxis
  const alignment = catAxis?.labelAlignment ?? "ctr";
  const textAnchor =
    alignment === "l" ? "start" : alignment === "r" ? "end" : "middle";

  // Label offset: distance from axis as percentage (default 100%)
  // @see ECMA-376 Part 1, Section 21.2.2.78
  // The offset is a percentage of the default spacing (typically ~15px)
  // Note: labelOffset is only on CategoryAxis, not DateAxis
  const labelOffsetPercent = catAxis?.labelOffset ?? DEFAULT_LABEL_OFFSET_PERCENT;
  const baseOffset = 15; // Base distance from axis line
  const labelYOffset = chartHeight + (baseOffset * labelOffsetPercent) / 100;

  // Get font style from textProperties (c:txPr)
  const fontSize = extractFontSize(axis.textProperties);
  const isBold = extractBold(axis.textProperties);
  const fontWeight = isBold ? ' font-weight="bold"' : "";

  // Determine Y position based on tickLabelPosition
  // @see ECMA-376 Part 1, Section 21.2.3.44 (ST_TickLblPos)
  const tickLblPos = axis.tickLabelPosition;
  const yPos = tickLblPos === "high" ? -5 : labelYOffset;

  const labels: string[] = [];

  for (let i = 0; i < numCategories; i++) {
    // Apply tickLabelSkip - only render every nth label
    if (i % tickLabelSkip !== 0) {
      continue;
    }

    // Get label text, applying date formatting if this is a date axis
    const rawLabelText = categoryLabels[i];
    const labelText = dateAxis && timeUnit ? formatDateLabel(rawLabelText, timeUnit) : rawLabelText;
    const x = getCategoryLabelX(alignment, i, categoryWidth);

    labels.push(
      `<text x="${x}" y="${yPos}" text-anchor="${textAnchor}" font-size="${fontSize}"${fontWeight} fill="#666">${escapeHtml(labelText)}</text>`
    );
  }

  return labels.join("");
}

// =============================================================================
// Multi-Level Category Axis Labels
// =============================================================================

/**
 * Render multi-level category axis labels
 *
 * Multi-level categories display hierarchical labels below the chart.
 * Level 0 (innermost) is displayed as primary labels.
 * Higher levels are displayed below with grouping spans.
 *
 * Example for quarters within years:
 * ```
 *   Q1   Q2   Q3   Q4   Q1   Q2   Q3   Q4
 *  |______2023______|  |______2024______|
 * ```
 *
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (lvl)
 */
export function renderMultiLevelCategoryAxisLabels(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number,
  multiLevelCategories: MultiLevelCategories
): string {
  const catAxis = axes.find((ax): ax is CategoryAxis => ax.type === "catAx");
  if (!catAxis || catAxis.tickLabelPosition === "none" || catAxis.delete) {
    return "";
  }

  const { count, levels } = multiLevelCategories;
  if (count === 0 || levels.length === 0) {
    return "";
  }

  const categoryWidth = chartWidth / count;
  const baseOffset = 15;
  const labelOffsetPercent = catAxis.labelOffset ?? DEFAULT_LABEL_OFFSET_PERCENT;

  // Get font style from textProperties (c:txPr)
  const fontSize = extractFontSize(catAxis.textProperties);
  const isBold = extractBold(catAxis.textProperties);
  const fontWeight = isBold ? ' font-weight="bold"' : "";

  const svgElements: string[] = [];

  // Render each level
  // Level 0 is innermost (primary labels)
  // Higher levels are outer (grouping labels)
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const level = levels[levelIdx];
    const levelY = chartHeight + (baseOffset * labelOffsetPercent) / 100 + levelIdx * 20;

    if (levelIdx === 0) {
      // Render level 0 as regular category labels (at each category position)
      for (let i = 0; i < count; i++) {
        const labelText = level.labels[String(i)] ?? "";
        if (!labelText) {
          continue;
        }

        const x = i * categoryWidth + categoryWidth / 2;
        svgElements.push(
          `<text x="${x}" y="${levelY}" text-anchor="middle" font-size="${fontSize}"${fontWeight} fill="#666">${escapeHtml(labelText)}</text>`
        );
      }
    } else {
      // Render higher levels as grouping labels
      // Labels at this level mark the START of each group
      // The span extends from the label position to (next label position - 1) or end
      const labelPositions: { pos: number; label: string }[] = [];
      for (let i = 0; i < count; i++) {
        const label = level.labels[String(i)];
        if (label !== undefined) {
          labelPositions.push({ pos: i, label });
        }
      }

      // Convert label positions to spans
      const spans: { start: number; end: number; label: string }[] = [];
      for (let i = 0; i < labelPositions.length; i++) {
        const current = labelPositions[i];
        const nextPos = i + 1 < labelPositions.length ? labelPositions[i + 1].pos : count;
        spans.push({
          start: current.pos,
          end: nextPos - 1,
          label: current.label,
        });
      }

      // Render each span with a label and optional grouping line
      for (const span of spans) {
        const startX = span.start * categoryWidth;
        const endX = (span.end + 1) * categoryWidth;
        const centerX = (startX + endX) / 2;

        // Render grouping bracket if span covers multiple categories
        if (span.end > span.start) {
          const bracketY = levelY - 5;
          const bracketHeight = 3;
          svgElements.push(
            `<line x1="${startX + 5}" y1="${bracketY}" x2="${endX - 5}" y2="${bracketY}" stroke="#999" stroke-width="1"/>`
          );
          // Left tick
          svgElements.push(
            `<line x1="${startX + 5}" y1="${bracketY - bracketHeight}" x2="${startX + 5}" y2="${bracketY}" stroke="#999" stroke-width="1"/>`
          );
          // Right tick
          svgElements.push(
            `<line x1="${endX - 5}" y1="${bracketY - bracketHeight}" x2="${endX - 5}" y2="${bracketY}" stroke="#999" stroke-width="1"/>`
          );
        }

        // Render label text
        svgElements.push(
          `<text x="${centerX}" y="${levelY + 10}" text-anchor="middle" font-size="${fontSize}"${fontWeight} fill="#666">${escapeHtml(span.label)}</text>`
        );
      }
    }
  }

  return svgElements.join("");
}

// =============================================================================
// Scatter Chart X-Axis Labels
// =============================================================================

/**
 * Render scatter chart X-axis labels from strRef categories
 *
 * Scatter charts use two value axes (valAx) per ECMA-376.
 * When xVal uses strRef, the labels should be rendered at
 * the corresponding index positions on the bottom X-axis.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.234 (xVal)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 */
export function renderScatterXAxisLabels(
  axes: readonly Axis[],
  chartWidth: number,
  chartHeight: number,
  categoryLabels: readonly string[],
  valueRange: { minVal: number; maxVal: number }
): string {
  if (categoryLabels.length === 0) {
    return "";
  }

  // Find the bottom value axis (X-axis for scatter)
  const bottomAxis = axes.find((ax): ax is ValueAxis =>
    ax.type === "valAx" && ax.position === "b"
  );

  // Check for delete flag and tickLabelPosition
  if (bottomAxis?.delete || bottomAxis?.tickLabelPosition === "none") {
    return "";
  }

  // Get font style from textProperties
  const fontSize = extractFontSize(bottomAxis?.textProperties);
  const isBold = bottomAxis ? extractBold(bottomAxis.textProperties) : false;
  const fontWeight = isBold ? ' font-weight="bold"' : "";

  const labels: string[] = [];
  const numLabels = categoryLabels.length;
  const yPos = chartHeight + 15;

  // Calculate X positions based on the data index
  // The categoryLabels correspond to indices 0, 1, 2, ...
  // We need to map these to the value range
  const range = valueRange.maxVal - valueRange.minVal;

  for (let i = 0; i < numLabels; i++) {
    // Map index to x position (indices are the x values)
    const xNormalized = (i - valueRange.minVal) / range;
    const x = xNormalized * chartWidth;

    labels.push(
      `<text x="${x}" y="${yPos}" text-anchor="middle" font-size="${fontSize}"${fontWeight} fill="#666">${escapeHtml(categoryLabels[i])}</text>`
    );
  }

  return labels.join("");
}
