/**
 * @file Chart component parsing (markers, data labels, data points, trendlines, error bars)
 *
 * @see ECMA-376 Part 1, Section 21.2.2 - Chart Elements
 */

import type {
  Marker,
  DataLabels,
  DataPoint,
  DataLabel,
  Trendline,
  TrendlineLabel,
  ErrorBars,
  UpDownBars,
} from "../../domain/chart";
import { getChild, getChildren, getXmlText, getAttr as xmlGetAttr, type XmlElement } from "../../../xml";
import { getIntAttr, getFloatAttr, getBoolAttr } from "../primitive";
import { pt } from "../../domain/types";
import { parseTextBody } from "../text/text-parser";
import { parseChartShapeProperties } from "./shape-properties";
import { parseDataReference } from "./data-reference";
import { parseLayout } from "./layout";
import { getChartPercentAttr } from "./percent";
import {
  mapMarkerSymbol,
  mapDataLabelPosition,
  mapTrendlineType,
  mapErrorBarDirection,
  mapErrorBarType,
  mapErrorValueType,
} from "./mapping";

/**
 * Safe getAttr that handles undefined elements
 */
function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}

type DataLabelShared = Omit<DataLabel, "idx" | "delete" | "layout" | "text">;

function parseDataLabelShared(el: XmlElement): DataLabelShared {
  const numFmtEl = getChild(el, "c:numFmt");
  const spPrEl = getChild(el, "c:spPr");
  const txPrEl = getChild(el, "c:txPr");
  const dLblPosEl = getChild(el, "c:dLblPos");

  const separatorEl = getChild(el, "c:separator");

  return {
    numFormat: numFmtEl ? getAttr(numFmtEl, "formatCode") : undefined,
    shapeProperties: parseChartShapeProperties(spPrEl),
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
    position: mapDataLabelPosition(getAttr(dLblPosEl, "val")),
    showLegendKey: getBoolAttr(getChild(el, "c:showLegendKey"), "val"),
    showVal: getBoolAttr(getChild(el, "c:showVal"), "val"),
    showCatName: getBoolAttr(getChild(el, "c:showCatName"), "val"),
    showSerName: getBoolAttr(getChild(el, "c:showSerName"), "val"),
    showPercent: getBoolAttr(getChild(el, "c:showPercent"), "val"),
    showBubbleSize: getBoolAttr(getChild(el, "c:showBubbleSize"), "val"),
    separator: separatorEl ? getXmlText(separatorEl) : undefined,
  };
}

/**
 * Parse single data label (c:dLbl)
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dLbl)
 */
export function parseDataLabel(dLbl: XmlElement | undefined): DataLabel | undefined {
  if (!dLbl) {return undefined;}
  const idxEl = getChild(dLbl, "c:idx");
  if (!idxEl) {return undefined;}

  const idx = getIntAttr(idxEl, "val") ?? 0;
  const deleteEl = getChild(dLbl, "c:delete");
  if (deleteEl) {
    return {
      idx,
      delete: getBoolAttr(deleteEl, "val"),
    };
  }

  const shared = parseDataLabelShared(dLbl);
  const layoutEl = getChild(dLbl, "c:layout");
  const txEl = getChild(dLbl, "c:tx");

  return {
    idx,
    layout: parseLayout(layoutEl),
    text: txEl ? parseTextBody(getChild(txEl, "c:rich") ?? txEl) : undefined,
    ...shared,
  };
}

/**
 * Parse marker (c:marker)
 * @see ECMA-376 Part 1, Section 21.2.2.97 (marker)
 */
export function parseMarker(marker: XmlElement | undefined): Marker | undefined {
  if (!marker) {return undefined;}

  const symbolElement = getChild(marker, "c:symbol");
  if (!symbolElement) {return undefined;}
  const symbol = mapMarkerSymbol(getAttr(symbolElement, "val"));
  if (!symbol) {return undefined;}

  const sizeVal = getIntAttr(getChild(marker, "c:size"), "val");
  const spPr = getChild(marker, "c:spPr");

  return {
    symbol,
    size: sizeVal !== undefined ? pt(sizeVal) : undefined,
    shapeProperties: parseChartShapeProperties(spPr),
  };
}

/**
 * Parse data points (c:dPt elements)
 *
 * Per ECMA-376, data points allow individual styling of data elements:
 * - idx: Which data point this applies to
 * - invertIfNegative: Whether to invert colors for negative values
 * - marker: Custom marker for this point
 * - bubble3D: Whether bubble appears 3D
 * - explosion: Pie slice explosion percentage
 * - spPr: Shape properties (fill, line, effects)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt)
 */
export function parseDataPoints(ser: XmlElement): readonly DataPoint[] | undefined {
  const dPtElements = getChildren(ser, "c:dPt");
  if (dPtElements.length === 0) {return undefined;}

  const dataPoints: DataPoint[] = [];

  for (const dPt of dPtElements) {
    const idxEl = getChild(dPt, "c:idx");
    if (!idxEl) {continue;}

    const idx = getIntAttr(idxEl, "val") ?? 0;
    const explosionEl = getChild(dPt, "c:explosion");

    dataPoints.push({
      idx,
      invertIfNegative: getBoolAttr(getChild(dPt, "c:invertIfNegative"), "val"),
      marker: parseMarker(getChild(dPt, "c:marker")),
      bubble3D: getBoolAttr(getChild(dPt, "c:bubble3D"), "val"),
      explosion: getChartPercentAttr(explosionEl, "val"),
      shapeProperties: parseChartShapeProperties(getChild(dPt, "c:spPr")),
    });
  }

  return dataPoints.length > 0 ? dataPoints : undefined;
}

/**
 * Parse data labels (c:dLbls)
 *
 * Parses c:txPr (text properties) for data label text styling.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.49 (dLbls)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 */
export function parseDataLabels(dLbls: XmlElement | undefined): DataLabels | undefined {
  if (!dLbls) {return undefined;}

  const deleteEl = getChild(dLbls, "c:delete");
  const showLeaderLinesEl = getChild(dLbls, "c:showLeaderLines");
  const leaderLinesEl = getChild(dLbls, "c:leaderLines");

  // Import parseChartLines inline to avoid circular dependency
  const parseChartLines = (linesEl: XmlElement | undefined) => {
    if (!linesEl) {return undefined;}
    return { shapeProperties: parseChartShapeProperties(getChild(linesEl, "c:spPr")) };
  };

  const labels = getChildren(dLbls, "c:dLbl")
    .map(parseDataLabel)
    .filter((label): label is DataLabel => Boolean(label));

  if (deleteEl) {
    return {
      labels: labels.length > 0 ? labels : undefined,
      delete: getBoolAttr(deleteEl, "val"),
    };
  }

  const shared = parseDataLabelShared(dLbls);

  return {
    labels: labels.length > 0 ? labels : undefined,
    ...shared,
    showLeaderLines: showLeaderLinesEl ? getBoolAttr(showLeaderLinesEl, "val") : undefined,
    leaderLines: parseChartLines(leaderLinesEl),
  };
}

/**
 * Parse trendline label element
 *
 * @see ECMA-376 Part 1, Section 21.2.2.210 (trendlineLbl)
 */
export function parseTrendlineLabel(el: XmlElement | undefined): TrendlineLabel | undefined {
  if (!el) {return undefined;}

  const layoutEl = getChild(el, "c:layout");
  const txEl = getChild(el, "c:tx");
  const numFmtEl = getChild(el, "c:numFmt");
  const spPrEl = getChild(el, "c:spPr");
  const txPrEl = getChild(el, "c:txPr");

  return {
    layout: parseLayout(layoutEl),
    text: txEl ? parseTextBody(getChild(txEl, "c:rich") ?? txEl) : undefined,
    numFormat: numFmtEl ? getAttr(numFmtEl, "formatCode") : undefined,
    shapeProperties: parseChartShapeProperties(spPrEl),
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
  };
}

/**
 * Parse a single trendline element
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */
export function parseTrendline(el: XmlElement): Trendline {
  const nameEl = getChild(el, "c:name");
  const typeEl = getChild(el, "c:trendlineType");
  const orderEl = getChild(el, "c:order");
  const periodEl = getChild(el, "c:period");
  const forwardEl = getChild(el, "c:forward");
  const backwardEl = getChild(el, "c:backward");
  const interceptEl = getChild(el, "c:intercept");
  const dispRSqrEl = getChild(el, "c:dispRSqr");
  const dispEqEl = getChild(el, "c:dispEq");
  const trendlineLblEl = getChild(el, "c:trendlineLbl");

  return {
    name: nameEl ? getXmlText(nameEl) : undefined,
    trendlineType: mapTrendlineType(getAttr(typeEl, "val")),
    order: orderEl ? getIntAttr(orderEl, "val") : undefined,
    period: periodEl ? getIntAttr(periodEl, "val") : undefined,
    forward: forwardEl ? getFloatAttr(forwardEl, "val") : undefined,
    backward: backwardEl ? getFloatAttr(backwardEl, "val") : undefined,
    intercept: interceptEl ? getFloatAttr(interceptEl, "val") : undefined,
    dispRSqr: dispRSqrEl ? getBoolAttr(dispRSqrEl, "val") : undefined,
    dispEq: dispEqEl ? getBoolAttr(dispEqEl, "val") : undefined,
    shapeProperties: parseChartShapeProperties(getChild(el, "c:spPr")),
    trendlineLabel: parseTrendlineLabel(trendlineLblEl),
  };
}

/**
 * Parse trendlines from a series element
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */
export function parseTrendlines(ser: XmlElement): readonly Trendline[] | undefined {
  const trendlineElements = getChildren(ser, "c:trendline");
  if (trendlineElements.length === 0) {return undefined;}

  return trendlineElements.map(parseTrendline);
}

/**
 * Parse a single error bars element
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */
export function parseErrorBarsElement(el: XmlElement): ErrorBars {
  const errDirEl = getChild(el, "c:errDir");
  const errBarTypeEl = getChild(el, "c:errBarType");
  const errValTypeEl = getChild(el, "c:errValType");
  const noEndCapEl = getChild(el, "c:noEndCap");
  const valEl = getChild(el, "c:val");

  return {
    errDir: mapErrorBarDirection(getAttr(errDirEl, "val")),
    errBarType: mapErrorBarType(getAttr(errBarTypeEl, "val")),
    errValType: mapErrorValueType(getAttr(errValTypeEl, "val")),
    noEndCap: noEndCapEl ? getBoolAttr(noEndCapEl, "val") : undefined,
    val: valEl ? getFloatAttr(valEl, "val") : undefined,
    plus: parseDataReference(getChild(el, "c:plus")),
    minus: parseDataReference(getChild(el, "c:minus")),
    shapeProperties: parseChartShapeProperties(getChild(el, "c:spPr")),
  };
}

/**
 * Parse error bars from a series element
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */
export function parseErrorBars(ser: XmlElement): readonly ErrorBars[] | undefined {
  const errBarsElements = getChildren(ser, "c:errBars");
  if (errBarsElements.length === 0) {return undefined;}

  return errBarsElements.map(parseErrorBarsElement);
}

/**
 * Parse up/down bars (c:upDownBars)
 * @see ECMA-376 Part 1, Section 21.2.2.221 (upDownBars)
 */
export function parseUpDownBars(upDownBarsEl: XmlElement | undefined): UpDownBars | undefined {
  if (!upDownBarsEl) {return undefined;}

  const gapWidthEl = getChild(upDownBarsEl, "c:gapWidth");
  const upBarsEl = getChild(upDownBarsEl, "c:upBars");
  const downBarsEl = getChild(upDownBarsEl, "c:downBars");

  return {
    gapWidth: getChartPercentAttr(gapWidthEl, "val"),
    upBars: upBarsEl ? parseChartShapeProperties(getChild(upBarsEl, "c:spPr")) : undefined,
    downBars: downBarsEl ? parseChartShapeProperties(getChild(downBarsEl, "c:spPr")) : undefined,
  };
}
