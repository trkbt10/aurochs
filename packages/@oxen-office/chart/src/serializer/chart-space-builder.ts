/**
 * @file Chart space XML builder
 *
 * Builds chartSpace XML elements using createElement instead of string templates.
 * This provides a type-safe alternative to XML string concatenation.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.27 (chartSpace)
 */

import { createElement, type XmlDocument, type XmlElement } from "@oxen/xml";

/**
 * Supported chart types for building new charts
 */
export type BuildableChartType = "barChart" | "lineChart" | "pieChart";

/**
 * Options for building a chart space element
 */
export type ChartSpaceOptions = {
  /**
   * Bar direction (column or bar). Only applicable for barChart.
   * @default "col"
   */
  readonly barDirection?: "col" | "bar";
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
 * Build a bar chart element
 */
function buildBarChart(barDirection: "col" | "bar"): XmlElement {
  return createElement("c:barChart", {}, [createElement("c:barDir", { val: barDirection }), buildDefaultSeries()]);
}

/**
 * Build a line chart element
 */
function buildLineChart(): XmlElement {
  return createElement("c:lineChart", {}, [buildDefaultSeries()]);
}

/**
 * Build a pie chart element
 */
function buildPieChart(): XmlElement {
  return createElement("c:pieChart", {}, [buildDefaultSeries()]);
}

/**
 * Build a chart type element based on the specified type
 */
function buildChartTypeElement(chartType: BuildableChartType, options?: ChartSpaceOptions): XmlElement {
  switch (chartType) {
    case "barChart":
      return buildBarChart(options?.barDirection ?? "col");
    case "lineChart":
      return buildLineChart();
    case "pieChart":
      return buildPieChart();
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
