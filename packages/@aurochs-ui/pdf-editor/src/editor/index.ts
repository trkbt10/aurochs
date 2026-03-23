/**
 * @file PDF Editor module exports
 *
 * Editor-specific components and state management only.
 *
 * Domain operations (PdfElementId, moveElement, etc.) → @aurochs/pdf
 * SVG coordinate conversion (elementToSvgBounds, createDocumentQuery) → @aurochs-renderer/pdf/svg
 */

export { PdfEditor, type PdfEditorProps } from "./PdfEditor";
export { PdfPageCanvas, type PdfPageCanvasProps } from "./PdfPageCanvas";
export { PdfPropertyPanel, type PdfPropertyPanelProps } from "./PdfPropertyPanel";
export { PdfPageListPanel, type PdfPageListPanelProps } from "./PdfPageListPanel";
export { PdfLayerPanel, type PdfLayerPanelProps } from "./PdfLayerPanel";
export { PdfMultiSelectPanel, type PdfMultiSelectPanelProps } from "./PdfMultiSelectPanel";
export type { PdfEditorState, PdfTextEditState } from "./types";
export { pdfEditorReducer, createInitialState, type PdfEditorAction } from "./reducer";
