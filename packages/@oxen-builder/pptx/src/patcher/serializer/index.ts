/**
 * @file Serializer module
 */

// Phase 4: Fill / Line / Effects
export { serializeColor } from "./color";
export { serializeFill, serializeGradientFill, serializePatternFill, serializeBlipFill, serializeBlipEffects } from "./fill";
export { serializeLine } from "./line";
export { serializeEffects } from "./effects";
export { serializeTransform, patchTransformElement } from "./transform";
export { serializeShape3d } from "./three-d";

// Phase 5: TextBody
export { serializeTextBody, patchTextBodyElement } from "./text";
export { serializeParagraph } from "./paragraph";
export {
  serializeBodyProperties,
  serializeParagraphProperties,
  serializeRunProperties,
  serializeEndParaRunProperties,
} from "./text-properties";

// Phase 10: Table
export { serializeDrawingTable } from "./table";

// Transitions
export { isTransitionType, serializeSlideTransition, TRANSITION_TYPES } from "./transition";

// Custom Geometry
export { serializeCustomGeometry, serializeGeometryPath, serializePathCommand } from "./custom-geometry";

// Animation
export { serializeTiming, serializeTimeNode } from "./animation";

// Comments
export {
  serializeComment,
  serializeCommentList,
  serializeCommentAuthor,
  serializeCommentAuthorList,
  createCommentListDocument,
  createCommentAuthorListDocument,
} from "./comment";
