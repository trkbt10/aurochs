/**
 * @file Bubble chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.20 (bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.19 (bubbleSer)
 */

import type { BubbleSeries, BubbleChartSeries } from "../../../domain/chart";
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
import { parseDataPoints, parseDataLabels } from "../components";
import { getChartPercentAttr } from "../percent";

/**
 * Parse bubble series (c:ser in c:bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.20 (bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.19 (bubbleSer)
 */
export function parseBubbleSeries(ser: XmlElement): BubbleSeries | undefined {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");
  const invertIfNegativeEl = getChild(ser, "c:invertIfNegative");
  const bubble3DEl = getChild(ser, "c:bubble3D");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
    invertIfNegative: invertIfNegativeEl ? getBoolAttr(invertIfNegativeEl, "val") : undefined,
    dataPoints: parseDataPoints(ser),
    xValues: parseDataReference(getChild(ser, "c:xVal")),
    yValues: parseDataReference(getChild(ser, "c:yVal")),
    bubbleSize: parseDataReference(getChild(ser, "c:bubbleSize")),
    bubble3D: bubble3DEl ? getBoolAttr(bubble3DEl, "val") : undefined,
  };
}

/**
 * Parse bubble chart (c:bubbleChart)
 * @see ECMA-376 Part 1, Section 21.2.2.20 (bubbleChart)
 */
export function parseBubbleChart(bubbleChart: XmlElement, index: number): BubbleChartSeries {
  const varyColorsEl = getChild(bubbleChart, "c:varyColors");
  const bubbleScaleEl = getChild(bubbleChart, "c:bubbleScale");
  const showNegBubblesEl = getChild(bubbleChart, "c:showNegBubbles");
  const sizeRepresentsEl = getChild(bubbleChart, "c:sizeRepresents");

  const series: BubbleSeries[] = [];
  for (const ser of getChildren(bubbleChart, "c:ser")) {
    const s = parseBubbleSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "bubbleChart",
    index,
    order: index,
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    bubbleScale: getChartPercentAttr(bubbleScaleEl, "val"),
    showNegBubbles: showNegBubblesEl ? getBoolAttr(showNegBubblesEl, "val") : undefined,
    sizeRepresents: getAttr(sizeRepresentsEl, "val") as "area" | "w" | undefined,
    series,
    dataLabels: parseDataLabels(getChild(bubbleChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(bubbleChart, "c:spPr")),
  };
}
