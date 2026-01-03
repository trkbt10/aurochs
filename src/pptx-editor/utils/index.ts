/**
 * @file Editor utilities
 */

export {
  // Transform accessors
  getShapeTransform,
  withUpdatedTransform,
  hasEditableTransform,
  // Coordinate utilities
  clientToSlideCoords,
  getAbsoluteBounds,
  type AbsoluteBounds,
  // Shape capabilities (ECMA-376 locks)
  getShapeCapabilities,
  type ShapeCapabilities,
} from "./shape-transform";
