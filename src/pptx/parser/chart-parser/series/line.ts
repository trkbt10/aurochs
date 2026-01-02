/**
 * @file Line chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (lineChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { LineSeries, LineChartSeries, Grouping } from "../../../domain/chart";
import { getChild, getChildren, getAttr as xmlGetAttr, type XmlElement } from "../../../../xml";
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
import { getChartPercentAttr } from "../percent";

/**
 * Parse line series (c:ser in c:lineChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function parseLineSeries(ser: XmlElement): LineSeries | undefined {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
    marker: parseMarker(getChild(ser, "c:marker")),
    dataPoints: parseDataPoints(ser),
    categories: parseDataReference(getChild(ser, "c:cat")),
    values: parseDataReference(getChild(ser, "c:val")),
    smooth: getBoolAttr(getChild(ser, "c:smooth"), "val"),
    trendlines: parseTrendlines(ser),
    errorBars: parseErrorBars(ser),
  };
}

/**
 * Parse line chart (c:lineChart)
 * @see ECMA-376 Part 1, Section 21.2.2.92 (lineChart)
 */
export function parseLineChart(lineChart: XmlElement, index: number): LineChartSeries {
  const groupingEl = getChild(lineChart, "c:grouping");
  const varyColorsEl = getChild(lineChart, "c:varyColors");
  const markerEl = getChild(lineChart, "c:marker");
  const smoothEl = getChild(lineChart, "c:smooth");
  const gapDepthEl = getChild(lineChart, "c:gapDepth");

  const series: LineSeries[] = [];
  for (const ser of getChildren(lineChart, "c:ser")) {
    const s = parseLineSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "lineChart",
    index,
    order: index,
    grouping: (getAttr(groupingEl, "val") as Grouping) ?? "standard",
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    gapDepth: getChartPercentAttr(gapDepthEl, "val"),
    marker: markerEl ? getBoolAttr(markerEl, "val") : undefined,
    smooth: smoothEl ? getBoolAttr(smoothEl, "val") : undefined,
    series,
    dataLabels: parseDataLabels(getChild(lineChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(lineChart, "c:spPr")),
  };
}
