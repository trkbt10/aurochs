/**
 * @file Chart (c:) namespace element types
 *
 * Chart elements define the structure of embedded charts in presentations.
 * These are referenced from p:graphicFrame elements via c:chart.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML - Charts
 * @see src/pptx/parser/simplify.ts - XML simplification process
 */

import type { OoxmlElement, OoxmlChild, OoxmlValElement, OoxmlTextElement } from "./base";


// =============================================================================
// Chart Structure
// =============================================================================

/**
 * Chart space element (c:chartSpace) - root element of chart XML.
 */
export type ChartSpaceElement = OoxmlElement & {
  /** Chart element */
  "c:chart"?: ChartElement;
  /** External data reference */
  "c:externalData"?: OoxmlElement;
  /** Print settings */
  "c:printSettings"?: OoxmlElement;
};

/**
 * Chart element (c:chart).
 */
export type ChartElement = OoxmlElement & {
  /** Chart title */
  "c:title"?: OoxmlElement;
  /** Auto title deleted flag */
  "c:autoTitleDeleted"?: OoxmlValElement;
  /** Plot area */
  "c:plotArea"?: PlotAreaElement;
  /** Legend */
  "c:legend"?: OoxmlElement;
  /** Plot visible only */
  "c:plotVisOnly"?: OoxmlValElement;
  /** Display blanks as */
  "c:dispBlanksAs"?: OoxmlValElement;
};

/**
 * Plot area element (c:plotArea) - contains chart type and axes.
 */
export type PlotAreaElement = OoxmlElement & {
  /** Layout */
  "c:layout"?: OoxmlElement;
  /** Bar chart */
  "c:barChart"?: BarChartElement;
  /** Line chart */
  "c:lineChart"?: LineChartElement;
  /** Pie chart */
  "c:pieChart"?: PieChartElement;
  /** 3D pie chart */
  "c:pie3DChart"?: PieChartElement;
  /** Area chart */
  "c:areaChart"?: AreaChartElement;
  /** Scatter chart */
  "c:scatterChart"?: ScatterChartElement;
  /** Doughnut chart */
  "c:doughnutChart"?: DoughnutChartElement;
  /** Radar chart */
  "c:radarChart"?: RadarChartElement;
  /** Bubble chart */
  "c:bubbleChart"?: BubbleChartElement;
  /** Category axis */
  "c:catAx"?: CategoryAxisElement;
  /** Value axis */
  "c:valAx"?: ValueAxisElement;
  /** Date axis */
  "c:dateAx"?: OoxmlElement;
  /** Series axis */
  "c:serAx"?: OoxmlElement;
};

// =============================================================================
// Chart Types
// =============================================================================

/**
 * Bar chart element.
 */
export type BarChartElement = OoxmlElement & {
  /** Bar direction (bar or col) */
  "c:barDir"?: OoxmlValElement;
  /** Grouping (clustered, stacked, percentStacked) */
  "c:grouping"?: OoxmlValElement;
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<ChartSeriesElement>;
  /** Axis IDs */
  "c:axId"?: OoxmlChild<OoxmlValElement>;
  /** Gap width */
  "c:gapWidth"?: OoxmlValElement;
  /** Overlap */
  "c:overlap"?: OoxmlValElement;
};

/**
 * Line chart element.
 */
export type LineChartElement = OoxmlElement & {
  /** Grouping */
  "c:grouping"?: OoxmlValElement;
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<ChartSeriesElement>;
  /** Axis IDs */
  "c:axId"?: OoxmlChild<OoxmlValElement>;
  /** Marker flag */
  "c:marker"?: OoxmlValElement;
  /** Smooth line */
  "c:smooth"?: OoxmlValElement;
};

/**
 * Pie chart element.
 */
export type PieChartElement = OoxmlElement & {
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series (usually single) */
  "c:ser"?: OoxmlChild<ChartSeriesElement>;
  /** First slice angle */
  "c:firstSliceAng"?: OoxmlValElement;
};

/**
 * Area chart element.
 */
export type AreaChartElement = OoxmlElement & {
  /** Grouping */
  "c:grouping"?: OoxmlValElement;
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<ChartSeriesElement>;
  /** Axis IDs */
  "c:axId"?: OoxmlChild<OoxmlValElement>;
};

/**
 * Scatter chart element.
 */
export type ScatterChartElement = OoxmlElement & {
  /** Scatter style */
  "c:scatterStyle"?: OoxmlValElement;
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<ScatterSeriesElement>;
  /** Axis IDs */
  "c:axId"?: OoxmlChild<OoxmlValElement>;
};

/**
 * Doughnut chart element.
 */
export type DoughnutChartElement = OoxmlElement & {
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<ChartSeriesElement>;
  /** First slice angle */
  "c:firstSliceAng"?: OoxmlValElement;
  /** Hole size */
  "c:holeSize"?: OoxmlValElement;
};

/**
 * Radar chart element.
 */
export type RadarChartElement = OoxmlElement & {
  /** Radar style */
  "c:radarStyle"?: OoxmlValElement;
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<ChartSeriesElement>;
  /** Axis IDs */
  "c:axId"?: OoxmlChild<OoxmlValElement>;
};

/**
 * Bubble chart element.
 */
export type BubbleChartElement = OoxmlElement & {
  /** Vary colors */
  "c:varyColors"?: OoxmlValElement;
  /** Series */
  "c:ser"?: OoxmlChild<BubbleSeriesElement>;
  /** Axis IDs */
  "c:axId"?: OoxmlChild<OoxmlValElement>;
  /** Bubble scale */
  "c:bubbleScale"?: OoxmlValElement;
  /** Show negative bubbles */
  "c:showNegBubbles"?: OoxmlValElement;
};

// =============================================================================
// Chart Series
// =============================================================================

/**
 * Chart series element (c:ser) - data series for most chart types.
 */
export type ChartSeriesElement = OoxmlElement & {
  /** Series index */
  "c:idx"?: OoxmlValElement;
  /** Series order */
  "c:order"?: OoxmlValElement;
  /** Series text (name) */
  "c:tx"?: SeriesTextElement;
  /** Shape properties (fill, line) */
  "c:spPr"?: OoxmlElement;
  /** Invert if negative */
  "c:invertIfNegative"?: OoxmlValElement;
  /** Category data (labels) */
  "c:cat"?: CategoryDataElement;
  /** Value data */
  "c:val"?: ValueDataElement;
  /** Data labels */
  "c:dLbls"?: OoxmlElement;
  /** Marker style */
  "c:marker"?: OoxmlElement;
  /** Smooth line */
  "c:smooth"?: OoxmlValElement;
  /**
   * Trendlines
   * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
   */
  "c:trendline"?: OoxmlChild<TrendlineElement>;
  /**
   * Error bars
   * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
   */
  "c:errBars"?: OoxmlChild<ErrorBarsElement>;
};

/**
 * Trendline element
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */
export type TrendlineElement = OoxmlElement & {
  /** Trendline name */
  "c:name"?: OoxmlTextElement | string;
  /** Shape properties (line style) */
  "c:spPr"?: OoxmlElement;
  /**
   * Trendline type
   * @see ECMA-376 Part 1, Section 21.2.3.51 (ST_TrendlineType)
   * exp=exponential, linear, log, movingAvg, poly=polynomial, power
   */
  "c:trendlineType"?: OoxmlValElement;
  /** Polynomial order (2-6, for poly type) */
  "c:order"?: OoxmlValElement;
  /** Moving average period (for movingAvg type) */
  "c:period"?: OoxmlValElement;
  /** Forecast forward distance */
  "c:forward"?: OoxmlValElement;
  /** Forecast backward distance */
  "c:backward"?: OoxmlValElement;
  /** Y-intercept value */
  "c:intercept"?: OoxmlValElement;
  /** Display R-squared value */
  "c:dispRSqr"?: OoxmlValElement;
  /** Display equation */
  "c:dispEq"?: OoxmlValElement;
  /** Trendline label */
  "c:trendlineLbl"?: OoxmlElement;
};

/**
 * Error bars element
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */
export type ErrorBarsElement = OoxmlElement & {
  /**
   * Error bar direction
   * @see ECMA-376 Part 1, Section 21.2.3.17 (ST_ErrDir)
   * x or y
   */
  "c:errDir"?: OoxmlValElement;
  /**
   * Error bar type
   * @see ECMA-376 Part 1, Section 21.2.3.18 (ST_ErrBarType)
   * both, minus, plus
   */
  "c:errBarType"?: OoxmlValElement;
  /**
   * Error value type
   * @see ECMA-376 Part 1, Section 21.2.3.19 (ST_ErrValType)
   * cust, fixedVal, percentage, stdDev, stdErr
   */
  "c:errValType"?: OoxmlValElement;
  /** No end cap */
  "c:noEndCap"?: OoxmlValElement;
  /** Plus error value (for fixedVal/percentage/stdDev) */
  "c:plus"?: ValueDataElement;
  /** Minus error value (for fixedVal/percentage/stdDev) */
  "c:minus"?: ValueDataElement;
  /** Fixed value */
  "c:val"?: OoxmlValElement;
  /** Shape properties */
  "c:spPr"?: OoxmlElement;
};

/**
 * Scatter chart series element - has xVal and yVal instead of cat and val.
 */
export type ScatterSeriesElement = OoxmlElement & {
  "c:idx"?: OoxmlValElement;
  "c:order"?: OoxmlValElement;
  "c:tx"?: SeriesTextElement;
  "c:spPr"?: OoxmlElement;
  /** X values */
  "c:xVal"?: ValueDataElement;
  /** Y values */
  "c:yVal"?: ValueDataElement;
  "c:dLbls"?: OoxmlElement;
  "c:marker"?: OoxmlElement;
  "c:smooth"?: OoxmlValElement;
};

/**
 * Bubble chart series element.
 */
export type BubbleSeriesElement = OoxmlElement & {
  "c:idx"?: OoxmlValElement;
  "c:order"?: OoxmlValElement;
  "c:tx"?: SeriesTextElement;
  "c:spPr"?: OoxmlElement;
  "c:xVal"?: ValueDataElement;
  "c:yVal"?: ValueDataElement;
  /** Bubble size */
  "c:bubbleSize"?: ValueDataElement;
  "c:dLbls"?: OoxmlElement;
};

/**
 * Series text element - series name.
 */
export type SeriesTextElement = OoxmlElement & {
  /** String reference */
  "c:strRef"?: StringReferenceElement;
  /** Inline value */
  "c:v"?: OoxmlTextElement | string;
};

// =============================================================================
// Data References
// =============================================================================

/**
 * Category data element - x-axis labels.
 */
export type CategoryDataElement = OoxmlElement & {
  /** String reference */
  "c:strRef"?: StringReferenceElement;
  /** Number reference */
  "c:numRef"?: NumberReferenceElement;
  /** Multi-level string reference */
  "c:multiLvlStrRef"?: OoxmlElement;
};

/**
 * Value data element - y-axis values.
 */
export type ValueDataElement = OoxmlElement & {
  /** Number reference */
  "c:numRef"?: NumberReferenceElement;
  /** Number literals */
  "c:numLit"?: NumberCacheElement;
};

/**
 * String reference element.
 */
export type StringReferenceElement = OoxmlElement & {
  /** Formula reference (e.g., "Sheet1!$A$2:$A$5") */
  "c:f"?: OoxmlTextElement | string;
  /** String cache */
  "c:strCache"?: StringCacheElement;
};

/**
 * Number reference element.
 */
export type NumberReferenceElement = OoxmlElement & {
  /** Formula reference */
  "c:f"?: OoxmlTextElement | string;
  /** Number cache */
  "c:numCache"?: NumberCacheElement;
};

/**
 * String cache element - cached category labels.
 */
export type StringCacheElement = OoxmlElement & {
  /** Point count */
  "c:ptCount"?: OoxmlValElement;
  /** Points */
  "c:pt"?: OoxmlChild<StringPointElement>;
};

/**
 * Number cache element - cached numeric values.
 */
export type NumberCacheElement = OoxmlElement & {
  /** Format code */
  "c:formatCode"?: OoxmlTextElement | string;
  /** Point count */
  "c:ptCount"?: OoxmlValElement;
  /** Points */
  "c:pt"?: OoxmlChild<NumberPointElement>;
};

/**
 * String point element - single label.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.153 (c:pt - String Point)
 * @see src/xml/types.ts - getXmlText for text extraction
 */
export type StringPointAttrs = {
  /** Point index */
  idx: string;
};

export type StringPointElement = OoxmlElement<StringPointAttrs> & {
  /** String value */
  "c:v"?: OoxmlTextElement | string;
};

/**
 * Number point element - single value.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.121 (c:pt - Numeric Point)
 * @see src/xml/types.ts - getXmlText for text extraction
 */
export type NumberPointAttrs = {
  /** Point index */
  idx: string;
};

export type NumberPointElement = OoxmlElement<NumberPointAttrs> & {
  /** Numeric value as string */
  "c:v"?: OoxmlTextElement | string;
};

// =============================================================================
// Axes
// =============================================================================

/**
 * Category axis element.
 */
export type CategoryAxisElement = OoxmlElement & {
  /** Axis ID */
  "c:axId"?: OoxmlValElement;
  /** Scaling */
  "c:scaling"?: OoxmlElement;
  /** Delete flag */
  "c:delete"?: OoxmlValElement;
  /** Axis position */
  "c:axPos"?: OoxmlValElement;
  /** Major gridlines */
  "c:majorGridlines"?: OoxmlElement;
  /** Minor gridlines */
  "c:minorGridlines"?: OoxmlElement;
  /** Title */
  "c:title"?: OoxmlElement;
  /** Number format */
  "c:numFmt"?: OoxmlElement;
  /** Major tick mark */
  "c:majorTickMark"?: OoxmlValElement;
  /** Minor tick mark */
  "c:minorTickMark"?: OoxmlValElement;
  /** Tick label position */
  "c:tickLblPos"?: OoxmlValElement;
  /** Crossing axis ID */
  "c:crossAx"?: OoxmlValElement;
  /** Crosses */
  "c:crosses"?: OoxmlValElement;
  /** Auto flag */
  "c:auto"?: OoxmlValElement;
  /** Label alignment */
  "c:lblAlgn"?: OoxmlValElement;
  /** Label offset */
  "c:lblOffset"?: OoxmlValElement;
};

/**
 * Value axis element.
 */
export type ValueAxisElement = OoxmlElement & {
  "c:axId"?: OoxmlValElement;
  "c:scaling"?: OoxmlElement;
  "c:delete"?: OoxmlValElement;
  "c:axPos"?: OoxmlValElement;
  "c:majorGridlines"?: OoxmlElement;
  "c:minorGridlines"?: OoxmlElement;
  "c:title"?: OoxmlElement;
  "c:numFmt"?: OoxmlElement;
  "c:majorTickMark"?: OoxmlValElement;
  "c:minorTickMark"?: OoxmlValElement;
  "c:tickLblPos"?: OoxmlValElement;
  "c:crossAx"?: OoxmlValElement;
  "c:crosses"?: OoxmlValElement;
  "c:crossBetween"?: OoxmlValElement;
  /** Major unit */
  "c:majorUnit"?: OoxmlValElement;
  /** Minor unit */
  "c:minorUnit"?: OoxmlValElement;
};

// =============================================================================
// Helper Types
// =============================================================================

/**
 * All chart type keys in plot area.
 */
export const CHART_TYPE_KEYS = [
  "c:barChart",
  "c:lineChart",
  "c:pieChart",
  "c:pie3DChart",
  "c:areaChart",
  "c:scatterChart",
  "c:doughnutChart",
  "c:radarChart",
  "c:bubbleChart",
] as const;

export type ChartTypeKey = (typeof CHART_TYPE_KEYS)[number];

/**
 * Find the chart type element in a plot area.
 */
export function findChartTypeElement(
  plotArea: PlotAreaElement | undefined,
): { key: ChartTypeKey; element: OoxmlElement } | undefined {
  if (plotArea === undefined) {return undefined;}

  for (const key of CHART_TYPE_KEYS) {
    const element = plotArea[key];
    if (element !== undefined) {
      return { key, element: element as OoxmlElement };
    }
  }
  return undefined;
}
