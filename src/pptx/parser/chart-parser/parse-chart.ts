/**
 * @file Chart parser - main parse function
 *
 * Parses ChartML XML elements to Chart domain objects.
 *
 * TODO: mc:AlternateContent NOT INVESTIGATED in chart XML.
 * Chart XML (c:chart, c:plotArea, etc.) may contain mc:AlternateContent
 * for version-specific chart features. This has not been investigated.
 * If mc:AlternateContent is found in chart XML, use the pattern from
 * shape-parser.ts (processAlternateContent, isChoiceSupported).
 * See: issues/ecma376-mc-alternateContent-compliance.md
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 */

import type { Chart, ChartSeries, PlotArea } from "../../domain/chart";
import { getChild, getChildren, getByPath, getAttr as xmlGetAttr, type XmlDocument, type XmlElement } from "../../../xml";
import { getBoolAttr, getIntAttr } from "../primitive";

import { parseChartShapeProperties } from "./shape-properties";
import { parseLayout } from "./layout";
import { parseAxes } from "./axis";
import { parseChartTitle, parseLegend } from "./title-legend";
import {
  parseView3D,
  parseChartSurface,
  parseDataTable,
  parsePivotFormats,
  parsePivotSource,
  parseProtection,
  parsePrintSettings,
  parseUserShapesRelId,
} from "./chart-space";
import { parseBarChart } from "./series/bar";
import { parseLineChart } from "./series/line";
import { parsePieChart, parseOfPieChart } from "./series/pie";
import { parseScatterChart } from "./series/scatter";
import { parseAreaChart } from "./series/area";
import { parseRadarChart } from "./series/radar";
import { parseBubbleChart } from "./series/bubble";
import { parseStockChart } from "./series/stock";
import { parseSurfaceChart } from "./series/surface";

/**
 * Safe getAttr that handles undefined elements
 */
function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}

function parseExternalData(externalDataEl: XmlElement | undefined): { resourceId: string; autoUpdate?: boolean } | undefined {
  if (!externalDataEl) {return undefined;}
  return {
    resourceId: getAttr(externalDataEl, "r:id") ?? "",
    autoUpdate: getBoolAttr(getChild(externalDataEl, "c:autoUpdate"), "val"),
  };
}

// =============================================================================
// Chart Series Parsing
// =============================================================================

/**
 * Parse chart series from plot area element
 */
function parseChartSeries(plotArea: XmlElement): readonly ChartSeries[] {
  const charts: ChartSeries[] = [];
  const indexRef = { value: 0 };
  const nextIndex = () => {
    const current = indexRef.value;
    indexRef.value += 1;
    return current;
  };

  // Bar charts
  for (const barChart of getChildren(plotArea, "c:barChart")) {
    charts.push(parseBarChart(barChart, nextIndex()));
  }
  for (const bar3DChart of getChildren(plotArea, "c:bar3DChart")) {
    const chart = parseBarChart(bar3DChart, nextIndex());
    charts.push({ ...chart, type: "bar3DChart" });
  }

  // Line charts
  for (const lineChart of getChildren(plotArea, "c:lineChart")) {
    charts.push(parseLineChart(lineChart, nextIndex()));
  }
  for (const line3DChart of getChildren(plotArea, "c:line3DChart")) {
    const chart = parseLineChart(line3DChart, nextIndex());
    charts.push({ ...chart, type: "line3DChart" });
  }

  // Pie charts
  for (const pieChart of getChildren(plotArea, "c:pieChart")) {
    charts.push(parsePieChart(pieChart, nextIndex(), "pieChart"));
  }
  for (const pie3DChart of getChildren(plotArea, "c:pie3DChart")) {
    charts.push(parsePieChart(pie3DChart, nextIndex(), "pie3DChart"));
  }
  for (const doughnutChart of getChildren(plotArea, "c:doughnutChart")) {
    charts.push(parsePieChart(doughnutChart, nextIndex(), "doughnutChart"));
  }

  // Pie-of-pie / Bar-of-pie charts
  for (const ofPieChart of getChildren(plotArea, "c:ofPieChart")) {
    charts.push(parseOfPieChart(ofPieChart, nextIndex()));
  }

  // Scatter charts
  for (const scatterChart of getChildren(plotArea, "c:scatterChart")) {
    charts.push(parseScatterChart(scatterChart, nextIndex()));
  }

  // Area charts
  for (const areaChart of getChildren(plotArea, "c:areaChart")) {
    charts.push(parseAreaChart(areaChart, nextIndex()));
  }
  for (const area3DChart of getChildren(plotArea, "c:area3DChart")) {
    const chart = parseAreaChart(area3DChart, nextIndex());
    charts.push({ ...chart, type: "area3DChart" });
  }

  // Radar charts
  for (const radarChart of getChildren(plotArea, "c:radarChart")) {
    charts.push(parseRadarChart(radarChart, nextIndex()));
  }

  // Bubble charts
  for (const bubbleChart of getChildren(plotArea, "c:bubbleChart")) {
    charts.push(parseBubbleChart(bubbleChart, nextIndex()));
  }

  // Stock charts
  for (const stockChart of getChildren(plotArea, "c:stockChart")) {
    charts.push(parseStockChart(stockChart, nextIndex()));
  }

  // Surface charts
  for (const surfaceChart of getChildren(plotArea, "c:surfaceChart")) {
    charts.push(parseSurfaceChart(surfaceChart, nextIndex(), "surfaceChart"));
  }
  for (const surface3DChart of getChildren(plotArea, "c:surface3DChart")) {
    charts.push(parseSurfaceChart(surface3DChart, nextIndex(), "surface3DChart"));
  }

  return charts;
}

// =============================================================================
// Plot Area Parsing
// =============================================================================

/**
 * Parse plot area (c:plotArea)
 * @see ECMA-376 Part 1, Section 21.2.2.140 (plotArea)
 */
function parsePlotArea(plotAreaElement: XmlElement): PlotArea {
  return {
    layout: parseLayout(getChild(plotAreaElement, "c:layout")),
    charts: parseChartSeries(plotAreaElement),
    axes: parseAxes(plotAreaElement),
    dataTable: parseDataTable(getChild(plotAreaElement, "c:dTable")),
    shapeProperties: parseChartShapeProperties(getChild(plotAreaElement, "c:spPr")),
  };
}

// =============================================================================
// Main Chart Parsing
// =============================================================================

/**
 * Parse chart from chart XML document
 *
 * @param chartDoc - Chart XML document (c:chartSpace)
 * @returns Parsed Chart domain object or undefined
 *
 * @see ECMA-376 Part 1, Section 21.2.2.27 (chartSpace)
 * @see ECMA-376 Part 1, Section 21.2.2.26 (chart)
 */
export function parseChart(chartDoc: XmlDocument): Chart | undefined {
  // Use getByPath to find the root element in XmlDocument
  const chartSpace = getByPath(chartDoc, ["c:chartSpace"]);
  if (!chartSpace) {return undefined;}

  const chart = getChild(chartSpace, "c:chart");
  if (!chart) {return undefined;}

  const plotAreaEl = getChild(chart, "c:plotArea");
  if (!plotAreaEl) {return undefined;}

  const view3dEl = getChild(chart, "c:view3D");
  const floorEl = getChild(chart, "c:floor");
  const sideWallEl = getChild(chart, "c:sideWall");
  const backWallEl = getChild(chart, "c:backWall");
  const autoTitleDeletedEl = getChild(chart, "c:autoTitleDeleted");
  const pivotFmtsEl = getChild(chart, "c:pivotFmts");
  const plotVisOnlyEl = getChild(chart, "c:plotVisOnly");
  const dispBlanksAsEl = getChild(chart, "c:dispBlanksAs");
  const showDLblsOverMaxEl = getChild(chart, "c:showDLblsOverMax");

  const date1904El = getChild(chartSpace, "c:date1904");
  const roundedCornersEl = getChild(chartSpace, "c:roundedCorners");
  const pivotSourceEl = getChild(chartSpace, "c:pivotSource");
  const protectionEl = getChild(chartSpace, "c:protection");
  const printSettingsEl = getChild(chartSpace, "c:printSettings");
  const userShapesEl = getChild(chartSpace, "c:userShapes");

  // Parse external data reference
  const externalDataEl = getChild(chartSpace, "c:externalData");
  const externalData = parseExternalData(externalDataEl);

  // Parse style
  const styleEl = getChild(chartSpace, "c:style");
  const style = styleEl ? getIntAttr(styleEl, "val") : undefined;

  return {
    title: parseChartTitle(getChild(chart, "c:title")),
    autoTitleDeleted: autoTitleDeletedEl ? getBoolAttr(autoTitleDeletedEl, "val") : undefined,
    pivotFormats: parsePivotFormats(pivotFmtsEl),
    view3D: parseView3D(view3dEl),
    floor: parseChartSurface(floorEl),
    sideWall: parseChartSurface(sideWallEl),
    backWall: parseChartSurface(backWallEl),
    plotArea: parsePlotArea(plotAreaEl),
    legend: parseLegend(getChild(chart, "c:legend")),
    plotVisOnly: plotVisOnlyEl ? getBoolAttr(plotVisOnlyEl, "val") : undefined,
    dispBlanksAs: getAttr(dispBlanksAsEl, "val") as "gap" | "span" | "zero" | undefined,
    showDataLabelsOverMax: showDLblsOverMaxEl ? getBoolAttr(showDLblsOverMaxEl, "val") : undefined,
    style,
    externalData,
    date1904: date1904El ? getBoolAttr(date1904El, "val") : undefined,
    roundedCorners: roundedCornersEl ? getBoolAttr(roundedCornersEl, "val") : undefined,
    pivotSource: parsePivotSource(pivotSourceEl),
    protection: parseProtection(protectionEl),
    printSettings: parsePrintSettings(printSettingsEl),
    userShapes: parseUserShapesRelId(userShapesEl),
  };
}
