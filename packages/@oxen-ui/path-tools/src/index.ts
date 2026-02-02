/**
 * @file Path tools module entry point
 *
 * Generic path editing tools for creating and editing bezier paths.
 */

// =============================================================================
// Types
// =============================================================================
export type {
  Point,
  Bounds,
  AnchorPointType,
  PathAnchorPoint,
  DrawingPath,
  CapturedPoint,
  SmoothingLevel,
  SmoothingOptions,
  ModifierKeys,
} from "./types";

export {
  createEmptyDrawingPath,
  addPointToPath,
  updatePointInPath,
  closeDrawingPath,
  getModifierKeys,
} from "./types";

// =============================================================================
// Hooks
// =============================================================================
export { usePenTool } from "./hooks/usePenTool";
export type {
  PenToolState,
  PenToolCallbacks,
  UsePenToolReturn,
} from "./hooks/usePenTool";

export { usePathEdit } from "./hooks/usePathEdit";
export type {
  PathEditState,
  PathEditCallbacks,
  UsePathEditReturn,
} from "./hooks/usePathEdit";

// =============================================================================
// Components
// =============================================================================
export { PenToolOverlay, PenToolOverlayControlled } from "./components/PenToolOverlay";
export type { PenToolOverlayProps } from "./components/PenToolOverlay";

export { PathEditOverlay, PathEditOverlayControlled } from "./components/PathEditOverlay";
export type { PathEditOverlayProps } from "./components/PathEditOverlay";
