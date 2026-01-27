/**
 * @file Scatter chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { ScatterSeries, ScatterChartSeries, ScatterStyle } from "../../../domain/chart";
import { getChild, getChildren, getAttr as xmlGetAttr, type XmlElement } from "@oxen/xml";
import { getIntAttr, getBoolAttr } from "../../primitive";

/**
 * Safe getAttr that handles undefined elements
 */
function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}
import { parseSeriesText, parseDataReference } from "../data-reference";
import { parseChartShapeProperties } from "../shape-properties";
import { parseMarker, parseDataPoints, parseDataLabels, parseTrendlines, parseErrorBars } from "../components";

/**
 * Parse scatter series (c:ser in c:scatterChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function parseScatterSeries(ser: XmlElement): ScatterSeries | undefined {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
    marker: parseMarker(getChild(ser, "c:marker")),
    dataPoints: parseDataPoints(ser),
    xValues: parseDataReference(getChild(ser, "c:xVal")),
    yValues: parseDataReference(getChild(ser, "c:yVal")),
    smooth: getBoolAttr(getChild(ser, "c:smooth"), "val"),
    trendlines: parseTrendlines(ser),
    errorBars: parseErrorBars(ser),
  };
}

/**
 * Parse scatter chart (c:scatterChart)
 * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
 */
export function parseScatterChart(scatterChart: XmlElement, index: number): ScatterChartSeries {
  const scatterStyleEl = getChild(scatterChart, "c:scatterStyle");
  const varyColorsEl = getChild(scatterChart, "c:varyColors");

  const series: ScatterSeries[] = [];
  for (const ser of getChildren(scatterChart, "c:ser")) {
    const s = parseScatterSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "scatterChart",
    index,
    order: index,
    scatterStyle: (getAttr(scatterStyleEl, "val") as ScatterStyle) ?? "marker",
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    series,
    dataLabels: parseDataLabels(getChild(scatterChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(scatterChart, "c:spPr")),
  };
}
