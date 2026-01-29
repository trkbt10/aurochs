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

export function ChartSeriesEditor(props: ChartSeriesEditorProps) {
  return (
    <ChartEditorAdaptersBoundary adapters={pptxChartEditorAdapters}>
      <CoreChartSeriesEditor {...props} />
    </ChartEditorAdaptersBoundary>
  );
}

export function createDefaultChartSeries() {
  return createDefaultChartSeriesCore();
}

export function createDefaultBarChartSeries() {
  return createDefaultBarChartSeriesCore();
}

export function createDefaultLineChartSeries() {
  return createDefaultLineChartSeriesCore();
}

export function createDefaultPieChartSeries() {
  return createDefaultPieChartSeriesCore();
}

export function createDefaultAreaChartSeries() {
  return createDefaultAreaChartSeriesCore();
}

export function createDefaultScatterChartSeries() {
  return createDefaultScatterChartSeriesCore();
}

export function createDefaultRadarChartSeries() {
  return createDefaultRadarChartSeriesCore();
}

export function createDefaultBubbleChartSeries() {
  return createDefaultBubbleChartSeriesCore();
}

export function createDefaultOfPieChartSeries() {
  return createDefaultOfPieChartSeriesCore();
}

export function createDefaultStockChartSeries() {
  return createDefaultStockChartSeriesCore();
}

export function createDefaultSurfaceChartSeries() {
  return createDefaultSurfaceChartSeriesCore();
}
