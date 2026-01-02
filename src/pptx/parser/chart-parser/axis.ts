/**
 * @file Axis parsing for charts
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 * @see ECMA-376 Part 1, Section 21.2.2.175 (serAx)
 */

import type {
  Axis,
  CategoryAxis,
  ValueAxis,
  DateAxis,
  SeriesAxis,
  AxisPosition,
  AxisOrientation,
  TickMark,
  TickLabelPosition,
  ChartTitle,
} from "../../domain/chart";
import { getChild, getChildren, getAttr as xmlGetAttr, type XmlElement } from "../../../xml";
import { getIntAttr, getFloatAttr, getBoolAttr } from "../primitive";

/**
 * Safe getAttr that handles undefined elements
 */
function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}
import { parseChartShapeProperties } from "./shape-properties";
import { parseTextBody } from "../text/text-parser";
import { parseChartTitle } from "./title-legend";
import { getChartPercentAttr } from "./percent";

/**
 * Parse display units (c:dispUnits)
 *
 * Display units allow axis values to be scaled by a factor for readability.
 * For example, displaying millions as "1" instead of "1000000".
 *
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dispUnits)
 * @see ECMA-376 Part 1, Section 21.2.2.21 (builtInUnit)
 * @see ECMA-376 Part 1, Section 21.2.2.40 (custUnit)
 */
export function parseDisplayUnits(dispUnitsEl: XmlElement | undefined): {
  builtInUnit?: "hundreds" | "thousands" | "tenThousands" | "hundredThousands" | "millions" | "tenMillions" | "hundredMillions" | "billions" | "trillions";
  customUnit?: number;
  dispUnitsLbl?: ChartTitle;
} | undefined {
  if (!dispUnitsEl) {return undefined;}

  const builtInUnitEl = getChild(dispUnitsEl, "c:builtInUnit");
  const custUnitEl = getChild(dispUnitsEl, "c:custUnit");
  const dispUnitsLblEl = getChild(dispUnitsEl, "c:dispUnitsLbl");

  return {
    builtInUnit: getAttr(builtInUnitEl, "val") as "hundreds" | "thousands" | "tenThousands" | "hundredThousands" | "millions" | "tenMillions" | "hundredMillions" | "billions" | "trillions" | undefined,
    customUnit: custUnitEl ? getFloatAttr(custUnitEl, "val") : undefined,
    dispUnitsLbl: parseChartTitle(dispUnitsLblEl),
  };
}

/**
 * Parse base axis properties common to all axis types
 *
 * Parses c:txPr (text properties) for axis label styling.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 */
export function parseAxisBase(axElement: XmlElement): Omit<CategoryAxis, "type"> | undefined {
  const axIdEl = getChild(axElement, "c:axId");
  const axPosEl = getChild(axElement, "c:axPos");
  const scalingEl = getChild(axElement, "c:scaling");
  const orientationEl = scalingEl ? getChild(scalingEl, "c:orientation") : undefined;
  const deleteEl = getChild(axElement, "c:delete");
  const majorTickMarkEl = getChild(axElement, "c:majorTickMark");
  const minorTickMarkEl = getChild(axElement, "c:minorTickMark");
  const tickLblPosEl = getChild(axElement, "c:tickLblPos");
  const crossAxEl = getChild(axElement, "c:crossAx");
  const crossesEl = getChild(axElement, "c:crosses");
  const crossesAtEl = getChild(axElement, "c:crossesAt");
  const majorGridlinesEl = getChild(axElement, "c:majorGridlines");
  const minorGridlinesEl = getChild(axElement, "c:minorGridlines");
  const txPrEl = getChild(axElement, "c:txPr");

  return {
    id: axIdEl ? getIntAttr(axIdEl, "val") ?? 0 : 0,
    position: (getAttr(axPosEl, "val") as AxisPosition) ?? "b",
    orientation: (getAttr(orientationEl, "val") as AxisOrientation) ?? "minMax",
    delete: deleteEl ? getBoolAttr(deleteEl, "val") : undefined,
    majorTickMark: (getAttr(majorTickMarkEl, "val") as TickMark) ?? "none",
    minorTickMark: (getAttr(minorTickMarkEl, "val") as TickMark) ?? "none",
    tickLabelPosition: (getAttr(tickLblPosEl, "val") as TickLabelPosition) ?? "nextTo",
    crossAxisId: crossAxEl ? getIntAttr(crossAxEl, "val") ?? 0 : 0,
    crosses: getAttr(crossesEl, "val") as "autoZero" | "max" | "min" | undefined,
    crossesAt: crossesAtEl ? getFloatAttr(crossesAtEl, "val") : undefined,
    majorGridlines: majorGridlinesEl ? { shapeProperties: parseChartShapeProperties(getChild(majorGridlinesEl, "c:spPr")) } : undefined,
    minorGridlines: minorGridlinesEl ? { shapeProperties: parseChartShapeProperties(getChild(minorGridlinesEl, "c:spPr")) } : undefined,
    shapeProperties: parseChartShapeProperties(getChild(axElement, "c:spPr")),
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
  };
}

/**
 * Parse category axis (c:catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 */
export function parseCategoryAxis(catAx: XmlElement): CategoryAxis | undefined {
  const base = parseAxisBase(catAx);
  if (!base) {return undefined;}

  const autoEl = getChild(catAx, "c:auto");
  const lblAlgnEl = getChild(catAx, "c:lblAlgn");
  const lblOffsetEl = getChild(catAx, "c:lblOffset");
  const tickLblSkipEl = getChild(catAx, "c:tickLblSkip");
  const tickMarkSkipEl = getChild(catAx, "c:tickMarkSkip");
  const noMultiLvlLblEl = getChild(catAx, "c:noMultiLvlLbl");

  return {
    type: "catAx",
    ...base,
    auto: autoEl ? getBoolAttr(autoEl, "val") : undefined,
    labelAlignment: getAttr(lblAlgnEl, "val") as "ctr" | "l" | "r" | undefined,
    labelOffset: getChartPercentAttr(lblOffsetEl, "val"),
    tickLabelSkip: tickLblSkipEl ? getIntAttr(tickLblSkipEl, "val") : undefined,
    tickMarkSkip: tickMarkSkipEl ? getIntAttr(tickMarkSkipEl, "val") : undefined,
    noMultiLevelLabels: noMultiLvlLblEl ? getBoolAttr(noMultiLvlLblEl, "val") : undefined,
  };
}

/**
 * Parse value axis (c:valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 */
export function parseValueAxis(valAx: XmlElement): ValueAxis | undefined {
  const base = parseAxisBase(valAx);
  if (!base) {return undefined;}

  const crossBetweenEl = getChild(valAx, "c:crossBetween");
  const majorUnitEl = getChild(valAx, "c:majorUnit");
  const minorUnitEl = getChild(valAx, "c:minorUnit");
  const scaling = getChild(valAx, "c:scaling");
  const maxEl = scaling ? getChild(scaling, "c:max") : undefined;
  const minEl = scaling ? getChild(scaling, "c:min") : undefined;
  const logBaseEl = scaling ? getChild(scaling, "c:logBase") : undefined;
  const dispUnitsEl = getChild(valAx, "c:dispUnits");

  return {
    type: "valAx",
    ...base,
    crossBetween: getAttr(crossBetweenEl, "val") as "between" | "midCat" | undefined,
    majorUnit: majorUnitEl ? getFloatAttr(majorUnitEl, "val") : undefined,
    minorUnit: minorUnitEl ? getFloatAttr(minorUnitEl, "val") : undefined,
    max: maxEl ? getFloatAttr(maxEl, "val") : undefined,
    min: minEl ? getFloatAttr(minEl, "val") : undefined,
    logBase: logBaseEl ? getFloatAttr(logBaseEl, "val") : undefined,
    dispUnits: parseDisplayUnits(dispUnitsEl),
  };
}

/**
 * Parse date axis (c:dateAx)
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 */
export function parseDateAxis(dateAx: XmlElement): DateAxis | undefined {
  const base = parseAxisBase(dateAx);
  if (!base) {return undefined;}

  const autoEl = getChild(dateAx, "c:auto");
  const baseTimeUnitEl = getChild(dateAx, "c:baseTimeUnit");
  const majorTimeUnitEl = getChild(dateAx, "c:majorTimeUnit");
  const minorTimeUnitEl = getChild(dateAx, "c:minorTimeUnit");
  const majorUnitEl = getChild(dateAx, "c:majorUnit");
  const minorUnitEl = getChild(dateAx, "c:minorUnit");
  const scaling = getChild(dateAx, "c:scaling");
  const maxEl = scaling ? getChild(scaling, "c:max") : undefined;
  const minEl = scaling ? getChild(scaling, "c:min") : undefined;

  return {
    type: "dateAx",
    ...base,
    auto: autoEl ? getBoolAttr(autoEl, "val") : undefined,
    baseTimeUnit: getAttr(baseTimeUnitEl, "val") as "days" | "months" | "years" | undefined,
    majorTimeUnit: getAttr(majorTimeUnitEl, "val") as "days" | "months" | "years" | undefined,
    minorTimeUnit: getAttr(minorTimeUnitEl, "val") as "days" | "months" | "years" | undefined,
    majorUnit: majorUnitEl ? getFloatAttr(majorUnitEl, "val") : undefined,
    minorUnit: minorUnitEl ? getFloatAttr(minorUnitEl, "val") : undefined,
    max: maxEl ? getFloatAttr(maxEl, "val") : undefined,
    min: minEl ? getFloatAttr(minEl, "val") : undefined,
  };
}

/**
 * Parse series axis (c:serAx)
 * @see ECMA-376 Part 1, Section 21.2.2.175 (serAx)
 */
export function parseSeriesAxis(serAx: XmlElement): SeriesAxis | undefined {
  const base = parseAxisBase(serAx);
  if (!base) {return undefined;}

  const tickLblSkipEl = getChild(serAx, "c:tickLblSkip");
  const tickMarkSkipEl = getChild(serAx, "c:tickMarkSkip");

  return {
    type: "serAx",
    ...base,
    tickLabelSkip: tickLblSkipEl ? getIntAttr(tickLblSkipEl, "val") : undefined,
    tickMarkSkip: tickMarkSkipEl ? getIntAttr(tickMarkSkipEl, "val") : undefined,
  };
}

/**
 * Parse axes from plot area
 */
export function parseAxes(plotArea: XmlElement): readonly Axis[] {
  const axes: Axis[] = [];

  for (const catAx of getChildren(plotArea, "c:catAx")) {
    const axis = parseCategoryAxis(catAx);
    if (axis) {axes.push(axis);}
  }

  for (const valAx of getChildren(plotArea, "c:valAx")) {
    const axis = parseValueAxis(valAx);
    if (axis) {axes.push(axis);}
  }

  for (const dateAx of getChildren(plotArea, "c:dateAx")) {
    const axis = parseDateAxis(dateAx);
    if (axis) {axes.push(axis);}
  }

  for (const serAx of getChildren(plotArea, "c:serAx")) {
    const axis = parseSeriesAxis(serAx);
    if (axis) {axes.push(axis);}
  }

  return axes;
}
