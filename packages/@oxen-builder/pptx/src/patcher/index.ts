/**
 * @file PPTX Patcher Module
 *
 * Change detection and XML patching for PPTX export.
 *
 * @example
 * ```typescript
 * import { detectSlideChanges, patchSlideXml } from "./pptx/patcher";
 *
 * // Detect changes between original and modified slide
 * const changes = detectSlideChanges(originalSlide, modifiedSlide);
 *
 * // Apply changes to the XML document
 * const updatedXml = patchSlideXml(slideXml, changes);
 * ```
 */

// Core - Change detection and XML mutation
export type {
  BlipFillChange,
  EffectsChange,
  FillChange,
  GeometryChange,
  LineChange,
  PropertyChange,
  ShapeAdded,
  ShapeChange,
  ShapeModified,
  ShapeRemoved,
  TextBodyChange,
  TransformChange,
} from "./core";
export {
  appendChild,
  deepEqual,
  detectShapePropertyChanges,
  detectSlideChanges,
  findElement,
  findElements,
  findShapeById,
  getChangesByType,
  getDocumentRoot,
  getModifiedByProperty,
  getShapeId,
  getShapeIds,
  hasChanges,
  insertChildAt,
  isEffectsEqual,
  isFillEqual,
  isGeometryEqual,
  isLineEqual,
  isTextBodyEqual,
  isTransformEqual,
  prependChild,
  removeAttribute,
  removeChildAt,
  removeChildren,
  removeShapeById,
  replaceChild,
  replaceChildAt,
  replaceChildByName,
  replaceShapeById,
  setAttribute,
  setAttributes,
  setChildren,
  updateAtPath,
  updateChildByName,
  updateDocumentRoot,
} from "./core";

// Slide - Slide-level patching
export type { ShapeOperation } from "./slide";
export { addShapeToTree, batchUpdateShapeTree, getSpTree, hasShapes, patchSlideXml, removeShapeFromTree } from "./slide";

// Shape - Shape addition/serialization helpers
export { extractShapeIds, generateShapeId, generateShapeName } from "./shape";
export { serializeConnectionShape, serializeGraphicFrame, serializeGroupShape, serializePicture, serializeShape } from "./shape";

// Resources - media/relationships/content-types helpers (Phase 7)
export type { MediaType } from "./resources/media-manager";
export { addMedia, findUnusedMedia, removeMediaReference } from "./resources/media-manager";

export type { OleType } from "./resources/ole-manager";
export { addOleObject, getOleTypeFromFile } from "./resources/ole-manager";

export { embedFonts } from "./resources/font-manager";

export type { RelationshipInfo, RelationshipType } from "./resources/relationship-manager";
export {
  addRelationship,
  ensureRelationshipsDocument,
  generateRelationshipId,
  listRelationships,
  removeRelationship,
} from "./resources/relationship-manager";

export { addContentType, addOverride, removeUnusedContentTypes } from "./resources/content-types-manager";

// Phase 9: Master / Layout / Theme
export type { BulletElementName, PlaceholderChange } from "./master";
export {
  patchBodyStyle,
  patchDefaultTextStyle,
  patchLayoutPlaceholders,
  patchLayoutShapes,
  patchMasterShapes,
  patchTextStyleLevelByNumber,
  patchTextStyleLevelElement,
  patchTextStyleLevelsElement,
  patchTitleStyle,
} from "./master";

export type { ColorSchemePatch, ThemeChange } from "./theme";
export { patchMajorFont, patchMinorFont, patchSchemeColor, patchTheme } from "./theme";

// Presentation - slide structure management
// NOTE: Slide manager functions have been moved to @oxen-builder/pptx/slide-ops
// Import addSlide, removeSlide, reorderSlide, duplicateSlide, generateSlideId, generateSlideRId from there instead.

// Parts - shared XML part updaters
// NOTE: Slide list manipulation functions have been moved to @oxen-builder/pptx/slide-ops
// Import addSlideToList, removeSlideFromList, reorderSlideInList from there instead.

// Phase 10: Advanced elements (table/diagram/OLE)

export type { TableChange } from "./table";
export { addTableColumn, addTableRow, patchTable, patchTableCell, patchTableStyleId } from "./table";

export type { DiagramChange, DiagramFiles } from "./diagram";
export { patchDiagram, patchDiagramNodeText } from "./diagram";

export type { ChartChange, ChartPatchTarget, ChartStyle } from "./chart/chart-patcher";
export { patchChart, patchChartElement, patchChartTransform } from "./chart/chart-patcher";

export type { OleChange } from "./ole";
export { patchOleObject } from "./ole";

// Animation
export type {
  EntranceEffect,
  EmphasisEffect,
  ExitEffect,
  MotionPathType,
  AnimationTrigger,
  AnimationDirection,
  SimpleAnimationSpec,
} from "./animation";
export { addAnimationsToSlide, removeAnimationsFromSlide } from "./animation";

// Comments
export type { SimpleCommentSpec } from "./comment";
export { addCommentToSlide, getSlideComments, getCommentAuthors } from "./comment";

// Notes (Speaker Notes)
export type { SimpleNotesSpec } from "./notes";
export { setSlideNotes, getSlideNotes } from "./notes";

// Serializers
export {
  serializeColor,
  serializeFill,
  serializeGradientFill,
  serializePatternFill,
  serializeBlipFill,
  serializeBlipEffects,
  serializeLine,
  serializeEffects,
  serializeTransform,
  patchTransformElement,
  serializeShape3d,
  serializeTextBody,
  patchTextBodyElement,
  serializeParagraph,
  serializeBodyProperties,
  serializeParagraphProperties,
  serializeRunProperties,
  serializeEndParaRunProperties,
  serializeDrawingTable,
  isTransitionType,
  serializeSlideTransition,
  TRANSITION_TYPES,
  serializeCustomGeometry,
  serializeGeometryPath,
  serializePathCommand,
} from "./serializer";

// Re-export parseXml from @oxen/xml for convenience
export { parseXml } from "@oxen/xml";
