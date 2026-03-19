/**
 * @file Color editors exports
 *
 * Shared editors: import from @aurochs-ui/editor-controls/editors
 * This module only exports pptx-specific FillEditor (with BlipFill support).
 */

// pptx-specific (BlipFill support)
export { FillEditor, type FillEditorProps, createDefaultSolidFill, createNoFill } from "./FillEditor";
