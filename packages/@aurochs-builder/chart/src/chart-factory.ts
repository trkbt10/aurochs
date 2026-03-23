/**
 * @file Chart domain object factory
 *
 * Creates Chart domain objects from chart type specifications.
 * Bridges the builder layer (XML creation) and the parser layer (domain types)
 * to produce ready-to-render Chart objects.
 *
 * This is the canonical way to create new Chart domain objects programmatically,
 * used by editors (PPTX, DOCX, XLSX) when inserting new charts.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { Chart, ChartType } from "@aurochs-office/chart/domain";
import { parseChart } from "@aurochs-office/chart/parser";
import { buildChartSpaceDocument, type ChartSpaceOptions } from "./chart-space-builder";

/**
 * Create a Chart domain object with default data for the specified chart type.
 *
 * This function:
 * 1. Builds a chartSpace XML document with placeholder data
 * 2. Parses it into a Chart domain object
 *
 * The resulting Chart contains minimal default series data suitable for
 * initial rendering. Editors can modify the chart data afterwards.
 *
 * @param chartType - ECMA-376 chart type (e.g., "barChart", "lineChart", "pieChart")
 * @param options - Optional chart space configuration
 * @returns Parsed Chart domain object
 * @throws Error if chart type produces unparseable XML (should not happen)
 *
 * @example
 * ```typescript
 * import { createDefaultChart } from "@aurochs-builder/chart";
 *
 * const chart = createDefaultChart("barChart");
 * // chart is a fully parsed Chart domain object ready for rendering
 * ```
 *
 * @see ECMA-376 Part 1, Section 21.2.2.27 (chartSpace)
 */
export function createDefaultChart(chartType: ChartType, options?: ChartSpaceOptions): Chart {
  const doc = buildChartSpaceDocument(chartType, options);
  const chart = parseChart(doc);
  if (chart === undefined) {
    throw new Error(`Failed to create default chart for type: ${chartType}`);
  }
  return chart;
}
