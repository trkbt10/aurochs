/**
 * @file Core sheet grid components
 *
 * Context-free rendering primitives shared by both the editor and viewer.
 * These components take all data via props and produce visual output only.
 *
 * Composition hierarchy:
 *   CoreSheetViewport (container with gridlines + borders + drawings)
 *     └─ CoreCellsLayer (cell content rendering)
 *   CoreHeaderLayer (read-only row/column headers)
 *
 * The editor adds interactive overlays on top (selection, editing, resize).
 * The viewer uses these components directly.
 */

export { CoreCellsLayer, type CoreCellsLayerProps } from "./CoreCellsLayer";
export { CoreGridlinesLayer, type CoreGridlinesLayerProps } from "./CoreGridlinesLayer";
export { CoreBordersLayer, type CoreBordersLayerProps } from "./CoreBordersLayer";
export { CoreDrawingLayer, type CoreDrawingLayerProps } from "./CoreDrawingLayer";
export { CoreHeaderLayer, type CoreHeaderLayerProps, headerCellBaseStyle } from "./CoreHeaderLayer";
export { CoreSheetViewport, type CoreSheetViewportProps, viewportContainerBaseStyle } from "./CoreSheetViewport";
export { useCoreSheetViewport, type CoreSheetViewportContextValue } from "./CoreSheetViewportContext";
export { SheetTabBar, type SheetTabBarProps, sheetTabBarContainerStyle, sheetTabBaseStyle, sheetTabActiveStyle } from "./SheetTabBar";
export { DEFAULT_SHEET_GRID_METRICS } from "./types";
export type { CoreSheetRenderProps, VisibleRange, ViewportDimensions, SheetGridMetrics } from "./types";
