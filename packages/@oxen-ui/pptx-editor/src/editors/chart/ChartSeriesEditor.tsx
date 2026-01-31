/**
 * @file ChartSeriesEditor (PPTX)
 *
 * Wrapper around `@oxen-ui/chart-editor` with PPTX adapters injected.
 */

import {
  ChartSeriesEditor as CoreChartSeriesEditor,
  ChartEditorAdaptersBoundary,
  createDefaultChartSeries as createDefaultChartSeriesCore,
  createDefaultBarChartSeries as createDefaultBarChartSeriesCore,
  createDefaultLineChartSeries as createDefaultLineChartSeriesCore,
  createDefaultPieChartSeries as createDefaultPieChartSeriesCore,
  createDefaultAreaChartSeries as createDefaultAreaChartSeriesCore,
  createDefaultScatterChartSeries as createDefaultScatterChartSeriesCore,
  createDefaultRadarChartSeries as createDefaultRadarChartSeriesCore,
  createDefaultBubbleChartSeries as createDefaultBubbleChartSeriesCore,
  createDefaultOfPieChartSeries as createDefaultOfPieChartSeriesCore,
  createDefaultStockChartSeries as createDefaultStockChartSeriesCore,
  createDefaultSurfaceChartSeries as createDefaultSurfaceChartSeriesCore,
} from "@oxen-ui/chart-editor";
import type { ChartSeriesEditorProps as CoreChartSeriesEditorProps } from "@oxen-ui/chart-editor";
import { pptxChartEditorAdapters } from "./adapters";

export type ChartSeriesEditorProps = CoreChartSeriesEditorProps;


























/** PPTX chart series editor component */
export function ChartSeriesEditor(props: ChartSeriesEditorProps) {
  return (
    <ChartEditorAdaptersBoundary adapters={pptxChartEditorAdapters}>
      <CoreChartSeriesEditor {...props} />
    </ChartEditorAdaptersBoundary>
  );
}


























/** Create default chart series configuration */
export function createDefaultChartSeries() {
  return createDefaultChartSeriesCore();
}


























/** Create default bar chart series configuration */
export function createDefaultBarChartSeries() {
  return createDefaultBarChartSeriesCore();
}


























/** Create default line chart series configuration */
export function createDefaultLineChartSeries() {
  return createDefaultLineChartSeriesCore();
}


























/** Create default pie chart series configuration */
export function createDefaultPieChartSeries() {
  return createDefaultPieChartSeriesCore();
}


























/** Create default area chart series configuration */
export function createDefaultAreaChartSeries() {
  return createDefaultAreaChartSeriesCore();
}


























/** Create default scatter chart series configuration */
export function createDefaultScatterChartSeries() {
  return createDefaultScatterChartSeriesCore();
}


























/** Create default radar chart series configuration */
export function createDefaultRadarChartSeries() {
  return createDefaultRadarChartSeriesCore();
}


























/** Create default bubble chart series configuration */
export function createDefaultBubbleChartSeries() {
  return createDefaultBubbleChartSeriesCore();
}


























/** Create default pie-of-pie chart series configuration */
export function createDefaultOfPieChartSeries() {
  return createDefaultOfPieChartSeriesCore();
}


























/** Create default stock chart series configuration */
export function createDefaultStockChartSeries() {
  return createDefaultStockChartSeriesCore();
}


























/** Create default surface chart series configuration */
export function createDefaultSurfaceChartSeries() {
  return createDefaultSurfaceChartSeriesCore();
}
