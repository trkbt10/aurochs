/**
 * @file Area chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.1 (areaChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { AreaSeries, AreaChartSeries, Grouping } from "../../../domain/chart";
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
import { getChartPercentAttr } from "../percent";

/**
 * Parse area series (c:ser in c:areaChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function parseAreaSeries(ser: XmlElement): AreaSeries | undefined {
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
    trendlines: parseTrendlines(ser),
    errorBars: parseErrorBars(ser),
  };
}

/**
 * Parse area chart (c:areaChart)
 * @see ECMA-376 Part 1, Section 21.2.2.1 (areaChart)
 */
export function parseAreaChart(areaChart: XmlElement, index: number): AreaChartSeries {
  const groupingEl = getChild(areaChart, "c:grouping");
  const varyColorsEl = getChild(areaChart, "c:varyColors");
  const gapDepthEl = getChild(areaChart, "c:gapDepth");

  const series: AreaSeries[] = [];
  for (const ser of getChildren(areaChart, "c:ser")) {
    const s = parseAreaSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "areaChart",
    index,
    order: index,
    grouping: (getAttr(groupingEl, "val") as Grouping) ?? "standard",
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    gapDepth: getChartPercentAttr(gapDepthEl, "val"),
    series,
    dataLabels: parseDataLabels(getChild(areaChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(areaChart, "c:spPr")),
  };
}
