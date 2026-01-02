/**
 * @file OOXML to Domain mapping functions for charts
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { Marker, DataLabels, Legend } from "../../domain/chart";

/**
 * Map OOXML marker symbol to domain marker symbol
 * @see ECMA-376 Part 1, Section 21.2.3.27 (ST_MarkerStyle)
 */
export function mapMarkerSymbol(val: string | undefined): Marker["symbol"] | undefined {
  switch (val) {
    case "circle": return "circle";
    case "dash": return "dash";
    case "diamond": return "diamond";
    case "dot": return "dot";
    case "none": return "none";
    case "picture": return "picture";
    case "plus": return "plus";
    case "square": return "square";
    case "star": return "star";
    case "triangle": return "triangle";
    case "x": return "x";
    default: return undefined;
  }
}

/**
 * Map OOXML data label position to domain position
 * @see ECMA-376 Part 1, Section 21.2.3.8 (ST_DLblPos)
 */
export function mapDataLabelPosition(val: string | undefined): DataLabels["position"] {
  switch (val) {
    case "bestFit": return "bestFit";
    case "b": return "b";
    case "ctr": return "ctr";
    case "inBase": return "inBase";
    case "inEnd": return "inEnd";
    case "l": return "l";
    case "outEnd": return "outEnd";
    case "r": return "r";
    case "t": return "t";
    default: return undefined;
  }
}

/**
 * Map OOXML legend position to domain legend position
 * @see ECMA-376 Part 1, Section 21.2.3.24 (ST_LegendPos)
 */
export function mapLegendPosition(val: string | undefined): Legend["position"] {
  switch (val) {
    case "b": return "b";
    case "l": return "l";
    case "r": return "r";
    case "t": return "t";
    case "tr": return "tr";
    default: return "r";
  }
}

/**
 * Map trendline type string to TrendlineType
 * @see ECMA-376 Part 1, Section 21.2.3.51 (ST_TrendlineType)
 */
export type TrendlineType = "exp" | "linear" | "log" | "movingAvg" | "poly" | "power";






/**
 * Map trendline type string to TrendlineType.
 */
export function mapTrendlineType(val: string | undefined): TrendlineType {
  switch (val) {
    case "exp": return "exp";
    case "linear": return "linear";
    case "log": return "log";
    case "movingAvg": return "movingAvg";
    case "poly": return "poly";
    case "power": return "power";
    default: return "linear";
  }
}

/**
 * Map error bar direction string to ErrorBarDirection
 * @see ECMA-376 Part 1, Section 21.2.3.17 (ST_ErrDir)
 */
export type ErrorBarDirection = "x" | "y";






/**
 * Map error bar direction string to ErrorBarDirection.
 */
export function mapErrorBarDirection(val: string | undefined): ErrorBarDirection | undefined {
  switch (val) {
    case "x": return "x";
    case "y": return "y";
    default: return undefined;
  }
}

/**
 * Map error bar type string to ErrorBarType
 * @see ECMA-376 Part 1, Section 21.2.3.18 (ST_ErrBarType)
 */
export type ErrorBarType = "both" | "minus" | "plus";






/**
 * Map error bar type string to ErrorBarType.
 */
export function mapErrorBarType(val: string | undefined): ErrorBarType {
  switch (val) {
    case "both": return "both";
    case "minus": return "minus";
    case "plus": return "plus";
    default: return "both";
  }
}

/**
 * Map error value type string to ErrorValueType
 * @see ECMA-376 Part 1, Section 21.2.3.19 (ST_ErrValType)
 */
export type ErrorValueType = "cust" | "fixedVal" | "percentage" | "stdDev" | "stdErr";






/**
 * Map error value type string to ErrorValueType.
 */
export function mapErrorValueType(val: string | undefined): ErrorValueType {
  switch (val) {
    case "cust": return "cust";
    case "fixedVal": return "fixedVal";
    case "percentage": return "percentage";
    case "stdDev": return "stdDev";
    case "stdErr": return "stdErr";
    default: return "fixedVal";
  }
}
