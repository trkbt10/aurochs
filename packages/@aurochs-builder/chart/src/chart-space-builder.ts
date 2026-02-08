/**
 * @file Chart space XML builder
 *
 * Builds chartSpace XML elements using createElement instead of string templates.
 * This provides a type-safe alternative to XML string concatenation.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.27 (chartSpace)
 */

import { createElement, type XmlDocument, type XmlElement } from "@aurochs/xml";

/**
 * Supported chart types for building new charts
 * @see ECMA-376 Part 1, Section 21.2.2 (chart element types)
 */
export type BuildableChartType =
  | "areaChart"
  | "area3DChart"
  | "barChart"
  | "bar3DChart"
  | "bubbleChart"
  | "doughnutChart"
  | "lineChart"
  | "line3DChart"
  | "ofPieChart"
  | "pieChart"
  | "pie3DChart"
  | "radarChart"
  | "scatterChart"
  | "stockChart"
  | "surfaceChart"
  | "surface3DChart";

/**
 * Grouping style for line/area charts
 * @see ECMA-376 Part 1, Section 21.2.3.17 (ST_Grouping)
 */
export type Grouping = "percentStacked" | "stacked" | "standard";

/**
 * Grouping style for bar charts
 * @see ECMA-376 Part 1, Section 21.2.3.4 (ST_BarGrouping)
 */
export type BarGrouping = "clustered" | "stacked" | "percentStacked" | "standard";

/**
 * Scatter chart style
 * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
 */
export type ScatterStyle = "line" | "lineMarker" | "marker" | "none" | "smooth" | "smoothMarker";

/**
 * Radar chart style
 * @see ECMA-376 Part 1, Section 21.2.3.32 (ST_RadarStyle)
 */
export type RadarStyle = "standard" | "marker" | "filled";

/**
 * Pie-of-pie or bar-of-pie type
 * @see ECMA-376 Part 1, Section 21.2.3.28 (ST_OfPieType)
 */
export type OfPieType = "pie" | "bar";

/**
 * Options for building a chart space element
 */
export type ChartSpaceOptions = {
  /**
   * Bar direction (column or bar). Applicable for barChart/bar3DChart.
   * @default "col"
   */
  readonly barDirection?: "col" | "bar";

  /**
   * Grouping style for bar charts.
   * @default "clustered"
   */
  readonly barGrouping?: BarGrouping;

  /**
   * Grouping style for line/area charts.
   * @default "standard"
   */
  readonly grouping?: Grouping;

  /**
   * Style for scatter charts.
   * @default "lineMarker"
   */
  readonly scatterStyle?: ScatterStyle;

  /**
   * Style for radar charts.
   * @default "standard"
   */
  readonly radarStyle?: RadarStyle;

  /**
   * Hole size for doughnut charts (0-90 percent).
   * @default 50
   */
  readonly holeSize?: number;

  /**
   * Type for of-pie charts (pie-of-pie or bar-of-pie).
   * @default "pie"
   */
  readonly ofPieType?: OfPieType;

  /**
   * Scale for bubble charts (percent).
   * @default 100
   */
  readonly bubbleScale?: number;

  /**
   * What bubble size represents.
   * @default "area"
   */
  readonly sizeRepresents?: "area" | "w";

  /**
   * Whether surface chart is wireframe.
   * @default false
   */
  readonly wireframe?: boolean;
};

const CHART_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";

/**
 * Build default series element with placeholder data
 */
function buildDefaultSeries(): XmlElement {
  return createElement("c:ser", {}, [
    createElement("c:idx", { val: "0" }),
    createElement("c:order", { val: "0" }),
    createElement("c:tx", {}, [createElement("c:v", {}, [{ type: "text", value: "Series 1" }])]),
    createElement("c:cat", {}, [
      createElement("c:strLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "A" }])]),
      ]),
    ]),
    createElement("c:val", {}, [
      createElement("c:numLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "1" }])]),
      ]),
    ]),
  ]);
}

/**
 * Build default scatter series with xVal/yVal
 */
function buildDefaultScatterSeries(): XmlElement {
  return createElement("c:ser", {}, [
    createElement("c:idx", { val: "0" }),
    createElement("c:order", { val: "0" }),
    createElement("c:tx", {}, [createElement("c:v", {}, [{ type: "text", value: "Series 1" }])]),
    createElement("c:xVal", {}, [
      createElement("c:numLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "1" }])]),
      ]),
    ]),
    createElement("c:yVal", {}, [
      createElement("c:numLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "1" }])]),
      ]),
    ]),
  ]);
}

/**
 * Build default bubble series with xVal/yVal/bubbleSize
 */
function buildDefaultBubbleSeries(): XmlElement {
  return createElement("c:ser", {}, [
    createElement("c:idx", { val: "0" }),
    createElement("c:order", { val: "0" }),
    createElement("c:tx", {}, [createElement("c:v", {}, [{ type: "text", value: "Series 1" }])]),
    createElement("c:xVal", {}, [
      createElement("c:numLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "1" }])]),
      ]),
    ]),
    createElement("c:yVal", {}, [
      createElement("c:numLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "1" }])]),
      ]),
    ]),
    createElement("c:bubbleSize", {}, [
      createElement("c:numLit", {}, [
        createElement("c:ptCount", { val: "1" }),
        createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "10" }])]),
      ]),
    ]),
  ]);
}

/**
 * Build a bar chart element
 */
function buildBarChart(barDirection: "col" | "bar", grouping: BarGrouping): XmlElement {
  return createElement("c:barChart", {}, [
    createElement("c:barDir", { val: barDirection }),
    createElement("c:grouping", { val: grouping }),
    buildDefaultSeries(),
  ]);
}

/**
 * Build a 3D bar chart element
 */
function buildBar3DChart(barDirection: "col" | "bar", grouping: BarGrouping): XmlElement {
  return createElement("c:bar3DChart", {}, [
    createElement("c:barDir", { val: barDirection }),
    createElement("c:grouping", { val: grouping }),
    buildDefaultSeries(),
  ]);
}

/**
 * Build a line chart element
 */
function buildLineChart(grouping: Grouping): XmlElement {
  return createElement("c:lineChart", {}, [createElement("c:grouping", { val: grouping }), buildDefaultSeries()]);
}

/**
 * Build a 3D line chart element
 */
function buildLine3DChart(grouping: Grouping): XmlElement {
  return createElement("c:line3DChart", {}, [createElement("c:grouping", { val: grouping }), buildDefaultSeries()]);
}

/**
 * Build a pie chart element
 */
function buildPieChart(): XmlElement {
  return createElement("c:pieChart", {}, [createElement("c:varyColors", { val: "1" }), buildDefaultSeries()]);
}

/**
 * Build a 3D pie chart element
 */
function buildPie3DChart(): XmlElement {
  return createElement("c:pie3DChart", {}, [createElement("c:varyColors", { val: "1" }), buildDefaultSeries()]);
}

/**
 * Build a doughnut chart element
 */
function buildDoughnutChart(holeSize: number): XmlElement {
  return createElement("c:doughnutChart", {}, [
    createElement("c:varyColors", { val: "1" }),
    buildDefaultSeries(),
    createElement("c:holeSize", { val: String(holeSize) }),
  ]);
}

/**
 * Build an area chart element
 */
function buildAreaChart(grouping: Grouping): XmlElement {
  return createElement("c:areaChart", {}, [createElement("c:grouping", { val: grouping }), buildDefaultSeries()]);
}

/**
 * Build a 3D area chart element
 */
function buildArea3DChart(grouping: Grouping): XmlElement {
  return createElement("c:area3DChart", {}, [createElement("c:grouping", { val: grouping }), buildDefaultSeries()]);
}

/**
 * Build a scatter chart element
 */
function buildScatterChart(scatterStyle: ScatterStyle): XmlElement {
  return createElement("c:scatterChart", {}, [
    createElement("c:scatterStyle", { val: scatterStyle }),
    buildDefaultScatterSeries(),
  ]);
}

/**
 * Build a radar chart element
 */
function buildRadarChart(radarStyle: RadarStyle): XmlElement {
  return createElement("c:radarChart", {}, [createElement("c:radarStyle", { val: radarStyle }), buildDefaultSeries()]);
}

/**
 * Build a bubble chart element
 */
function buildBubbleChart(bubbleScale: number, sizeRepresents: "area" | "w"): XmlElement {
  return createElement("c:bubbleChart", {}, [
    createElement("c:varyColors", { val: "0" }),
    buildDefaultBubbleSeries(),
    createElement("c:bubbleScale", { val: String(bubbleScale) }),
    createElement("c:sizeRepresents", { val: sizeRepresents }),
  ]);
}

/**
 * Build an of-pie chart element (pie-of-pie or bar-of-pie)
 */
function buildOfPieChart(ofPieType: OfPieType): XmlElement {
  return createElement("c:ofPieChart", {}, [
    createElement("c:ofPieType", { val: ofPieType }),
    createElement("c:varyColors", { val: "1" }),
    buildDefaultSeries(),
  ]);
}

/**
 * Build a stock chart element (requires 4 series: open, high, low, close)
 */
function buildStockChart(): XmlElement {
  const buildStockSeries = (idx: number, name: string): XmlElement =>
    createElement("c:ser", {}, [
      createElement("c:idx", { val: String(idx) }),
      createElement("c:order", { val: String(idx) }),
      createElement("c:tx", {}, [createElement("c:v", {}, [{ type: "text", value: name }])]),
      createElement("c:cat", {}, [
        createElement("c:strLit", {}, [
          createElement("c:ptCount", { val: "1" }),
          createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "Day 1" }])]),
        ]),
      ]),
      createElement("c:val", {}, [
        createElement("c:numLit", {}, [
          createElement("c:ptCount", { val: "1" }),
          createElement("c:pt", { idx: "0" }, [createElement("c:v", {}, [{ type: "text", value: "100" }])]),
        ]),
      ]),
    ]);

  return createElement("c:stockChart", {}, [
    buildStockSeries(0, "Open"),
    buildStockSeries(1, "High"),
    buildStockSeries(2, "Low"),
    buildStockSeries(3, "Close"),
  ]);
}

/**
 * Build a surface chart element
 */
function buildSurfaceChart(wireframe: boolean): XmlElement {
  return createElement("c:surfaceChart", {}, [
    createElement("c:wireframe", { val: wireframe ? "1" : "0" }),
    buildDefaultSeries(),
  ]);
}

/**
 * Build a 3D surface chart element
 */
function buildSurface3DChart(wireframe: boolean): XmlElement {
  return createElement("c:surface3DChart", {}, [
    createElement("c:wireframe", { val: wireframe ? "1" : "0" }),
    buildDefaultSeries(),
  ]);
}

/**
 * Build a chart type element based on the specified type
 */
function buildChartTypeElement(chartType: BuildableChartType, options?: ChartSpaceOptions): XmlElement {
  switch (chartType) {
    case "areaChart":
      return buildAreaChart(options?.grouping ?? "standard");
    case "area3DChart":
      return buildArea3DChart(options?.grouping ?? "standard");
    case "barChart":
      return buildBarChart(options?.barDirection ?? "col", options?.barGrouping ?? "clustered");
    case "bar3DChart":
      return buildBar3DChart(options?.barDirection ?? "col", options?.barGrouping ?? "clustered");
    case "bubbleChart":
      return buildBubbleChart(options?.bubbleScale ?? 100, options?.sizeRepresents ?? "area");
    case "doughnutChart":
      return buildDoughnutChart(options?.holeSize ?? 50);
    case "lineChart":
      return buildLineChart(options?.grouping ?? "standard");
    case "line3DChart":
      return buildLine3DChart(options?.grouping ?? "standard");
    case "ofPieChart":
      return buildOfPieChart(options?.ofPieType ?? "pie");
    case "pieChart":
      return buildPieChart();
    case "pie3DChart":
      return buildPie3DChart();
    case "radarChart":
      return buildRadarChart(options?.radarStyle ?? "standard");
    case "scatterChart":
      return buildScatterChart(options?.scatterStyle ?? "lineMarker");
    case "stockChart":
      return buildStockChart();
    case "surfaceChart":
      return buildSurfaceChart(options?.wireframe ?? false);
    case "surface3DChart":
      return buildSurface3DChart(options?.wireframe ?? false);
  }
}

/**
 * Build a complete chartSpace XML element.
 *
 * This creates a minimal chartSpace structure with:
 * - A single chart with plot area
 * - One default series with placeholder data
 *
 * The resulting element can be patched with patchChartData, patchChartTitle,
 * and patchChartStyle to customize the chart.
 *
 * @param chartType - Type of chart to create
 * @param options - Optional configuration
 * @returns XmlElement representing the chartSpace
 *
 * @example
 * ```typescript
 * const chartEl = buildChartSpaceElement("barChart", { barDirection: "col" });
 * const doc: XmlDocument = { declaration: { version: "1.0", encoding: "UTF-8", standalone: "yes" }, root: chartEl };
 * ```
 */
export function buildChartSpaceElement(chartType: BuildableChartType, options?: ChartSpaceOptions): XmlElement {
  const chartTypeEl = buildChartTypeElement(chartType, options);

  return createElement(
    "c:chartSpace",
    {
      "xmlns:c": CHART_NS,
      "xmlns:a": DRAWING_NS,
    },
    [createElement("c:chart", {}, [createElement("c:plotArea", {}, [chartTypeEl])])],
  );
}

/**
 * Build a complete chartSpace XML document.
 *
 * This is a convenience function that wraps buildChartSpaceElement
 * and returns a complete XmlDocument ready for serialization.
 *
 * @param chartType - Type of chart to create
 * @param options - Optional configuration
 * @returns XmlDocument ready for serialization
 *
 * @example
 * ```typescript
 * const doc = buildChartSpaceDocument("lineChart");
 * const xml = serializeDocument(doc, { declaration: true, standalone: true });
 * ```
 */
export function buildChartSpaceDocument(chartType: BuildableChartType, options?: ChartSpaceOptions): XmlDocument {
  return {
    children: [buildChartSpaceElement(chartType, options)],
  };
}
