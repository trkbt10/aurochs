/**
 * @file @aurochs-ui/chart-editor public exports
 */

export { ChartEditor } from "./chart/ChartEditor";
export type { ChartEditorProps } from "./chart/ChartEditor";
export {
  createDefaultChart,
  createDefaultView3D,
  createDefaultChartSurface,
  createDefaultDataTable,
  createDefaultChartProtection,
  createDefaultPrintSettings,
} from "./chart/ChartEditor";

export { ChartTitleEditor, createDefaultChartTitle } from "./chart/ChartTitleEditor";
export type { ChartTitleEditorProps } from "./chart/ChartTitleEditor";

export { LegendEditor, createDefaultLegend } from "./chart/LegendEditor";
export type { LegendEditorProps } from "./chart/LegendEditor";

export { AxisEditor, createDefaultAxis, createDefaultCategoryAxis, createDefaultValueAxis } from "./chart/AxisEditor";
export type { AxisEditorProps } from "./chart/AxisEditor";

export { ChartSeriesEditor } from "./chart/ChartSeriesEditor";
export type { ChartSeriesEditorProps } from "./chart/ChartSeriesEditor";
export {
  createDefaultChartSeries,
  createDefaultBarChartSeries,
  createDefaultLineChartSeries,
  createDefaultPieChartSeries,
  createDefaultAreaChartSeries,
  createDefaultScatterChartSeries,
  createDefaultRadarChartSeries,
  createDefaultBubbleChartSeries,
  createDefaultOfPieChartSeries,
  createDefaultStockChartSeries,
  createDefaultSurfaceChartSeries,
} from "./chart/ChartSeriesEditor";

export { LayoutEditor, createDefaultLayout } from "./chart/LayoutEditor";
export type { LayoutEditorProps } from "./chart/LayoutEditor";

export { DataLabelsEditor, createDefaultDataLabels } from "./chart/DataLabelsEditor";
export type { DataLabelsEditorProps } from "./chart/DataLabelsEditor";

export { ChartShapePropertiesEditor, createDefaultChartShapeProperties } from "./chart/ChartShapePropertiesEditor";
export type { ChartShapePropertiesEditorProps } from "./chart/ChartShapePropertiesEditor";

// Extracted property editors
export { View3DEditor, createDefaultView3D as createDefaultView3DExtracted } from "./chart/View3DEditor";
export type { View3DEditorProps } from "./chart/View3DEditor";
export { DataTableEditor, createDefaultDataTable as createDefaultDataTableExtracted } from "./chart/DataTableEditor";
export type { DataTableEditorProps } from "./chart/DataTableEditor";
export { ChartProtectionEditor, createDefaultChartProtection as createDefaultChartProtectionExtracted } from "./chart/ChartProtectionEditor";
export type { ChartProtectionEditorProps } from "./chart/ChartProtectionEditor";

// Purpose-oriented panel editor
export { ChartPanelEditor } from "./panels/ChartPanelEditor";
export type { ChartPanelEditorProps } from "./panels/ChartPanelEditor";

export { ChartEditorAdaptersProvider, ChartEditorAdaptersBoundary, useChartEditorAdapters } from "./adapters";
export type {
  ChartEditorAdapters,
  ChartEditorAdaptersProviderProps,
  ChartEditorAdaptersBoundaryProps,
} from "./adapters";
