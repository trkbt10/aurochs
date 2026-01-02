/**
 * @file Pie chart series parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.137 (pieChart)
 * @see ECMA-376 Part 1, Section 21.2.2.138 (pieSer)
 * @see ECMA-376 Part 1, Section 21.2.2.107 (ofPieChart)
 */

import type {
  PieSeries,
  PieChartSeries,
  OfPieChartSeries,
  OfPieType,
  OfPieSplitType,
} from "../../../domain/chart";
import { getChild, getChildren, getAttr, type XmlElement } from "../../../../xml";
import { getIntAttr, getFloatAttr, getBoolAttr } from "../../primitive";
import { deg } from "../../../domain/types";
import { parseSeriesText, parseDataReference } from "../data-reference";
import { parseChartShapeProperties, parseChartLines } from "../shape-properties";
import { parseDataPoints, parseDataLabels } from "../components";
import { getChartPercentAttr } from "../percent";

/**
 * Parse pie series (c:ser in c:pieChart)
 * @see ECMA-376 Part 1, Section 21.2.2.138 (pieSer)
 * @see ECMA-376 Part 1, Section 21.2.2.188 (spPr)
 */
export function parsePieSeries(ser: XmlElement): PieSeries | undefined {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");
  const explosionEl = getChild(ser, "c:explosion");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
    dataPoints: parseDataPoints(ser),
    categories: parseDataReference(getChild(ser, "c:cat")),
    values: parseDataReference(getChild(ser, "c:val")),
    explosion: getChartPercentAttr(explosionEl, "val"),
  };
}

/**
 * Parse pie chart (c:pieChart)
 * @see ECMA-376 Part 1, Section 21.2.2.137 (pieChart)
 */
export function parsePieChart(
  pieChart: XmlElement,
  index: number,
  type: "pieChart" | "pie3DChart" | "doughnutChart"
): PieChartSeries {
  const varyColorsEl = getChild(pieChart, "c:varyColors");
  const firstSliceAngEl = getChild(pieChart, "c:firstSliceAng");
  const holeSizeEl = getChild(pieChart, "c:holeSize");

  const series: PieSeries[] = [];
  for (const ser of getChildren(pieChart, "c:ser")) {
    const s = parsePieSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type,
    index,
    order: index,
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    firstSliceAng: firstSliceAngEl ? deg(getIntAttr(firstSliceAngEl, "val") ?? 0) : undefined,
    holeSize: getChartPercentAttr(holeSizeEl, "val"),
    series,
    dataLabels: parseDataLabels(getChild(pieChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(pieChart, "c:spPr")),
  };
}

/**
 * Parse pie-of-pie or bar-of-pie chart (c:ofPieChart)
 *
 * These charts show a primary pie with a secondary pie or bar
 * that "explodes" a portion of the data for more detail.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.107 (ofPieChart)
 */
export function parseOfPieChart(ofPieChart: XmlElement, index: number): OfPieChartSeries {
  // Parse ofPieType (pie or bar)
  const ofPieTypeEl = getChild(ofPieChart, "c:ofPieType");
  const ofPieTypeVal = ofPieTypeEl ? getAttr(ofPieTypeEl, "val") : "pie";
  const ofPieType: OfPieType = ofPieTypeVal === "bar" ? "bar" : "pie";

  const varyColorsEl = getChild(ofPieChart, "c:varyColors");
  const gapWidthEl = getChild(ofPieChart, "c:gapWidth");
  const splitTypeEl = getChild(ofPieChart, "c:splitType");
  const splitPosEl = getChild(ofPieChart, "c:splitPos");
  const secondPieSizeEl = getChild(ofPieChart, "c:secondPieSize");

  // Parse split type
  const splitType = parseOfPieSplitType(splitTypeEl);

  // Parse custom split points
  const custSplitEl = getChild(ofPieChart, "c:custSplit");
  const custSplit = parseCustomSplit(custSplitEl);

  // Parse series
  const series: PieSeries[] = [];
  for (const ser of getChildren(ofPieChart, "c:ser")) {
    const s = parsePieSeries(ser);
    if (s) {series.push(s);}
  }

  // Parse series lines (connector lines between primary and secondary)
  const serLinesEl = getChild(ofPieChart, "c:serLines");
  const serLines = serLinesEl ? parseChartLines(serLinesEl) : undefined;

  return {
    type: "ofPieChart",
    index,
    order: index,
    ofPieType,
    varyColors: varyColorsEl ? getBoolAttr(varyColorsEl, "val") : undefined,
    gapWidth: getChartPercentAttr(gapWidthEl, "val"),
    splitType,
    splitPos: splitPosEl ? getFloatAttr(splitPosEl, "val") : undefined,
    custSplit: custSplit && custSplit.length > 0 ? custSplit : undefined,
    secondPieSize: getChartPercentAttr(secondPieSizeEl, "val"),
    serLines,
    series,
    dataLabels: parseDataLabels(getChild(ofPieChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(ofPieChart, "c:spPr")),
  };
}

function parseOfPieSplitType(element: XmlElement | undefined): OfPieSplitType | undefined {
  if (!element) {return undefined;}
  const val = getAttr(element, "val");
  if (val === "auto" || val === "cust" || val === "percent" || val === "pos" || val === "val") {
    return val;
  }
  return undefined;
}

function parseCustomSplit(element: XmlElement | undefined): number[] | undefined {
  if (!element) {return undefined;}
  const values = getChildren(element, "c:secondPiePt")
    .map((secondPiePt) => getIntAttr(secondPiePt, "val"))
    .filter((value): value is number => value !== undefined);
  return values.length > 0 ? values : undefined;
}
