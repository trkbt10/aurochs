/**
 * @file Radar chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { RadarSeries, RadarChartSeries, RadarStyle } from "../../../domain/chart";
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
import { parseMarker, parseDataPoints, parseDataLabels } from "../components";

/**
 * Parse radar series (c:ser in c:radarChart)
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function parseRadarSeries(ser: XmlElement): RadarSeries | undefined {
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
  };
}

/**
 * Parse radar chart (c:radarChart)
 * @see ECMA-376 Part 1, Section 21.2.2.148 (radarChart)
 */
export function parseRadarChart(radarChart: XmlElement, index: number): RadarChartSeries {
  const radarStyleEl = getChild(radarChart, "c:radarStyle");
  const varyColorsEl = getChild(radarChart, "c:varyColors");

  const series: RadarSeries[] = [];
  for (const ser of getChildren(radarChart, "c:ser")) {
    const s = parseRadarSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "radarChart",
    index,
    order: index,
    radarStyle: (getAttr(radarStyleEl, "val") as RadarStyle) ?? "standard",
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    series,
    dataLabels: parseDataLabels(getChild(radarChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(radarChart, "c:spPr")),
  };
}
