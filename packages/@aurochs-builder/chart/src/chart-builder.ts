/**
 * @file Chart builder
 *
 * High-level builder for creating chart XML documents.
 * Provides a simplified spec-based API for chart creation.
 */

import type { XmlDocument, XmlElement } from "@aurochs/xml";
import { buildChartSpaceDocument, buildChartSpaceElement } from "./chart-space-builder";
import type { ChartBuildSpec, ChartDataSpec } from "./types";

/**
 * Build chart space XML document from spec
 *
 * Note: Currently uses the basic chart building from @aurochs-office/chart.
 * Future versions will support custom data injection.
 */
export function buildChartDocument(spec: ChartBuildSpec): XmlDocument {
  const { chartType } = spec;
  return buildChartSpaceDocument(chartType, undefined);
}

/**
 * Build chart space XML element from spec
 *
 * Note: Currently uses the basic chart building from @aurochs-office/chart.
 * Future versions will support custom data injection.
 */
export function buildChartElement(spec: ChartBuildSpec): XmlElement {
  const { chartType } = spec;
  return buildChartSpaceElement(chartType, undefined);
}

/**
 * Build chart data from simple arrays
 */
export function buildChartData(
  categories: readonly string[],
  series: { readonly name: string; readonly values: readonly number[] }[],
): ChartDataSpec {
  return {
    categories,
    series,
  };
}
