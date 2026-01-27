/**
 * @file Chart parser - exports
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

// Main chart parser
export { parseChart } from "./parse-chart";

// Layout
export { parseLayout } from "./layout";

// Shape properties
export { parseChartShapeProperties, parseChartLines } from "./shape-properties";

// Data reference
export { parseDataReference, parseSeriesText } from "./data-reference";

// Components
export { parseMarker, parseDataLabel, parseDataLabels, parseDataPoints, parseTrendlines, parseErrorBars } from "./components";

// Axes
export { parseAxes, parseCategoryAxis, parseValueAxis, parseDateAxis, parseSeriesAxis } from "./axis";

// Title and legend
export { parseChartTitle, parseLegend } from "./title-legend";

// Chart space
export {
  parseView3D,
  parseChartSurface,
  parsePictureOptions,
  parseDataTable,
  parsePivotFormats,
  parsePivotSource,
  parseProtection,
  parsePrintSettings,
  parseHeaderFooter,
  parsePageMargins,
  parsePageSetup,
  parseUserShapesRelId,
} from "./chart-space";

// Series parsers
export { parseBarSeries, parseBarChart } from "./series/bar";
export { parseLineSeries, parseLineChart } from "./series/line";
export { parsePieSeries, parsePieChart, parseOfPieChart } from "./series/pie";
export { parseScatterSeries, parseScatterChart } from "./series/scatter";
export { parseAreaSeries, parseAreaChart } from "./series/area";
export { parseRadarSeries, parseRadarChart } from "./series/radar";
export { parseBubbleSeries, parseBubbleChart } from "./series/bubble";
export { parseStockChart } from "./series/stock";
export { parseSurfaceSeries, parseSurfaceChart } from "./series/surface";

// Mapping
export * from "./mapping";
