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
  type SlideEditorContextValue,
} from "./SlideEditorContext";

// Shape helpers
export {
  type ShapeId,
  getShapeId,
  hasShapeId,
  findShapeById,
  findShapeByIdWithParents,
  getTopLevelShapeIds,
  isTopLevelShape,
  getShapeBounds,
  getCombinedBounds,
  updateShapeById,
  deleteShapesById,
  reorderShape,
  moveShapeToIndex,
  generateShapeId,
} from "./shape";
