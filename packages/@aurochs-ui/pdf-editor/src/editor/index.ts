/**
 * @file PDF Editor module exports
 *
 * Editor-specific components and state management only.
 *
 * Domain operations (PdfElementId, moveElement, etc.) → @aurochs/pdf
 * SVG coordinate conversion (elementToSvgBounds, createDocumentQuery) → @aurochs-renderer/pdf/svg
 */

export { PdfEditor, type PdfEditorProps } from "./PdfEditor";
export { PdfPageCanvas, type PdfPageCanvasProps } from "./components/PdfPageCanvas";
export { PdfPropertyPanel, type PdfPropertyPanelProps } from "./components/PdfPropertyPanel";
export { PdfPageListPanel, type PdfPageListPanelProps } from "./components/PdfPageListPanel";
export { PdfLayerPanel, type PdfLayerPanelProps } from "./components/PdfLayerPanel";
export { PdfMultiSelectPanel, type PdfMultiSelectPanelProps } from "./components/PdfMultiSelectPanel";
