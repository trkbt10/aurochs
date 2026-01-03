/**
 * @file Context exports
 */

export {
  EditorConfigProvider,
  useEditorConfig,
  type EditorConfig,
} from "./EditorConfigContext";

export {
  SlideEditorProvider,
  useSlideEditor,
  useSlideEditorOptional,
  findShapeByIdWithParents,
  type SlideEditorContextValue,
} from "./SlideEditorContext";
