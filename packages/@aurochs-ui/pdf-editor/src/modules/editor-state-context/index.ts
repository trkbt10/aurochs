/**
 * @file Editor state context module
 *
 * Pure state management for the PDF editor:
 * - Types: PdfEditorState, PdfTextEditState
 * - Reducer: pdfEditorReducer, createInitialState, PdfEditorAction
 * - Keyboard shortcuts: usePdfKeyboardShortcuts
 */

export type { PdfEditorState, PdfTextEditState } from "./types";
export { pdfEditorReducer, createInitialState, collectSelectedBounds, collectSelectedElements, type PdfEditorAction } from "./reducer";
export { usePdfKeyboardShortcuts } from "./use-keyboard-shortcuts";
