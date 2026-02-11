/**
 * @file XLSX Viewer exports
 *
 * Workbook viewer components.
 * Common viewer primitives are in @aurochs-ui/ui-components/viewer.
 */

// XLSX-specific components
export { SheetTabViewer, ReadonlySheetGrid, type SheetTabViewerProps, type ReadonlySheetGridProps } from "./components";

// Composite viewers
export { WorkbookViewer, type WorkbookViewerProps } from "./WorkbookViewer";
export { EmbeddableSheet, type EmbeddableSheetProps } from "./EmbeddableSheet";
