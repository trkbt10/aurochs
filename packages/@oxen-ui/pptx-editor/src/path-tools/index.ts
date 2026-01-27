/**
 * @file Path tools module entry point
 *
 * Exports all path tool types, utilities, and components.
 */

// =============================================================================
// Types
// =============================================================================
export type {
  AnchorPointType,
  PathAnchorPoint,
  DrawingPath,
  CapturedPoint,
  SmoothingLevel,
  SmoothingOptions,
  PathElementType,
  PathElementId,
  PathPointSelection,
  ModifierKeys,
} from "./types";

export {
  createEmptyDrawingPath,
  addPointToPath,
  updatePointInPath,
  closeDrawingPath,
  createEmptyPathSelection,
  pathElementIdToString,
  pathElementIdsEqual,
  getModifierKeys,
} from "./types";

// =============================================================================
// Utilities
// =============================================================================
export {
  drawingPathToCommands,
  commandsToDrawingPath,
  calculatePathBounds,
} from "./utils/path-commands";

export {
  lerp,
  lerpPoint,
  distance,
  evaluateCubicBezier,
  evaluateCubicBezierDerivative,
  subdivideCubicBezier,
  cubicBezierBounds,
  nearestPointOnCubicBezier,
  constrainTo45Degrees,
} from "./utils/bezier-math";
