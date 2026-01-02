/**
 * @file Bar chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.16 (barChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { BarSeries, BarChartSeries, BarDirection, BarGrouping } from "../../../domain/chart";
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
import { parseDataPoints, parseDataLabels, parseTrendlines, parseErrorBars } from "../components";
import { getChartPercentAttr } from "../percent";

/**
 * Parse bar series (c:ser in c:barChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export function parseBarSeries(ser: XmlElement): BarSeries | undefined {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
    invertIfNegative: getBoolAttr(getChild(ser, "c:invertIfNegative"), "val"),
    dataPoints: parseDataPoints(ser),
    categories: parseDataReference(getChild(ser, "c:cat")),
    values: parseDataReference(getChild(ser, "c:val")),
    trendlines: parseTrendlines(ser),
    errorBars: parseErrorBars(ser),
  };
}

/**
 * Parse bar chart (c:barChart)
 * @see ECMA-376 Part 1, Section 21.2.2.16 (barChart)
 */
export function parseBarChart(barChart: XmlElement, index: number): BarChartSeries {
  const barDirEl = getChild(barChart, "c:barDir");
  const groupingEl = getChild(barChart, "c:grouping");
  const varyColorsEl = getChild(barChart, "c:varyColors");
  const gapWidthEl = getChild(barChart, "c:gapWidth");
  const gapDepthEl = getChild(barChart, "c:gapDepth");
  const shapeEl = getChild(barChart, "c:shape");
  const overlapEl = getChild(barChart, "c:overlap");

  const series: BarSeries[] = [];
  for (const ser of getChildren(barChart, "c:ser")) {
    const s = parseBarSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "barChart",
    index,
    order: index,
    barDir: (getAttr(barDirEl, "val") as BarDirection) ?? "col",
    grouping: (getAttr(groupingEl, "val") as BarGrouping) ?? "clustered",
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    gapWidth: getChartPercentAttr(gapWidthEl, "val"),
    gapDepth: getChartPercentAttr(gapDepthEl, "val"),
    shape: getAttr(shapeEl, "val") as "cone" | "coneToMax" | "box" | "cylinder" | "pyramid" | "pyramidToMax" | undefined,
    overlap: overlapEl ? getIntAttr(overlapEl, "val") : undefined,
    series,
    dataLabels: parseDataLabels(getChild(barChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(barChart, "c:spPr")),
  };
}
