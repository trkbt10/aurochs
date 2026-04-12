/**
 * @file @aurochs-ui/xlsx-sheet
 *
 * Shared XLSX sheet rendering primitives.
 *
 * This package provides the Single Source of Truth for:
 * - Cell rendering (styles, display text, layout)
 * - Grid rendering (gridlines, borders, drawings)
 * - Sheet tab switching
 *
 * Both the editor (@aurochs-ui/xlsx-editor) and viewer consume this package
 * to produce consistent visual output. Neither provides to the other;
 * both are equal consumers of these primitives.
 *
 * Architecture:
 *   @aurochs-ui/xlsx-sheet (this package)
 *     ├── selectors/   — pure functions: cell style → CSS, display text, layout
 *     ├── sheet/       — merge range utilities
 *     ├── grid/        — gridline geometry, canvas text
 *     ├── drawing/     — DrawingOverlay component
 *     └── core/        — composition components (CoreCellsLayer, CoreSheetViewport, etc.)
 *
 *   @aurochs-ui/xlsx-editor (consumer)
 *     └── Adds: selection, editing, resize, context menus, toolbar, format panel
 *
 *   Viewer (consumer)
 *     └── Adds: read-only shell (tabs, zoom, navigation)
 */

// Core rendering components
export {
  CoreCellsLayer,
  CoreGridlinesLayer,
  CoreBordersLayer,
  CoreDrawingLayer,
  CoreHeaderLayer,
  CoreSheetViewport,
  SheetTabBar,
} from "./core";

export type {
  CoreCellsLayerProps,
  CoreGridlinesLayerProps,
  CoreBordersLayerProps,
  CoreDrawingLayerProps,
  CoreHeaderLayerProps,
  CoreSheetViewportProps,
  SheetTabBarProps,
  CoreSheetRenderProps,
  VisibleRange,
  ViewportDimensions,
} from "./core";
