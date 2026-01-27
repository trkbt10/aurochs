/**
 * @file Stock chart series parsing
 *
 * Stock charts display open-high-low-close (OHLC) data for financial analysis.
 * They use line series internally but with special rendering (hi-low lines, up-down bars).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.200 (stockChart)
 */

import type { LineSeries, StockChartSeries } from "../../../domain/chart";
import { getChild, getChildren, type XmlElement } from "@oxen/xml";
import { parseChartShapeProperties, parseChartLines } from "../shape-properties";
import { parseDataLabels, parseUpDownBars } from "../components";
import { parseLineSeries } from "./line";

/**
 * Parse stock chart (c:stockChart)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.200 (stockChart)
 */
export function parseStockChart(stockChart: XmlElement, index: number): StockChartSeries {
  const series: LineSeries[] = [];
  for (const ser of getChildren(stockChart, "c:ser")) {
    const s = parseLineSeries(ser);
    if (s) {series.push(s);}
  }

  return {
    type: "stockChart",
    index,
    order: index,
    series,
    dropLines: parseChartLines(getChild(stockChart, "c:dropLines")),
    hiLowLines: parseChartLines(getChild(stockChart, "c:hiLowLines")),
    upDownBars: parseUpDownBars(getChild(stockChart, "c:upDownBars")),
    dataLabels: parseDataLabels(getChild(stockChart, "c:dLbls")),
    shapeProperties: parseChartShapeProperties(getChild(stockChart, "c:spPr")),
  };
}
