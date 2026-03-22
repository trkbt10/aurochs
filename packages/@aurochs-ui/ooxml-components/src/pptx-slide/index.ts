/**
 * @file PPTX slide-level editors
 *
 * @see ECMA-376 Part 1, Section 19.3.1 (Slide)
 */

export {
  BackgroundEditor,
  createDefaultBackground,
  type BackgroundEditorProps,
} from "./BackgroundEditor";

export {
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./OleObjectEditor";
