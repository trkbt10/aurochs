/**
 * @file Path tools type definitions
 *
 * Core types for pen tool, pencil tool, and path editing functionality.
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { Point } from "@oxen/pptx/domain";

// =============================================================================
// Anchor Point Types
// =============================================================================

/**
 * Anchor point type
 * - smooth: Control handles are collinear (form a straight line through the anchor)
 * - corner: Control handles can have independent angles
 */
export type AnchorPointType = "smooth" | "corner";

/**
 * A single anchor point in a path being drawn or edited
 */
export type PathAnchorPoint = {
  /** X coordinate in slide coordinates */
  readonly x: Pixels;
  /** Y coordinate in slide coordinates */
  readonly y: Pixels;
  /** Point type (smooth or corner) */
  readonly type: AnchorPointType;
  /** Handle for curve entering this point (control2 of incoming cubic bezier) */
  readonly handleIn?: Point;
  /** Handle for curve leaving this point (control1 of outgoing cubic bezier) */
  readonly handleOut?: Point;
};

// =============================================================================
// Drawing Path Types
// =============================================================================

/**
 * In-progress path data (before committing to shape)
 */
export type DrawingPath = {
  /** Anchor points in the path */
  readonly points: readonly PathAnchorPoint[];
  /** Whether the path is closed (forms a loop) */
  readonly isClosed: boolean;
};

/**
 * Create an empty drawing path
 */
export function createEmptyDrawingPath(): DrawingPath {
  return {
    points: [],
    isClosed: false,
  };
}

/**
 * Add a point to a drawing path
 */
export function addPointToPath(
  path: DrawingPath,
  point: PathAnchorPoint
): DrawingPath {
  return {
    ...path,
    points: [...path.points, point],
  };
}

/**
 * Update a point in a drawing path
 */
export function updatePointInPath(
  path: DrawingPath,
  index: number,
  updater: (point: PathAnchorPoint) => PathAnchorPoint
): DrawingPath {
  return {
    ...path,
    points: path.points.map((p, i) => (i === index ? updater(p) : p)),
  };
}

/**
 * Close a drawing path
 */
export function closeDrawingPath(path: DrawingPath): DrawingPath {
  return {
    ...path,
    isClosed: true,
  };
}

// =============================================================================
// Pencil Tool Types
// =============================================================================

/**
 * Raw captured point during pencil drawing
 * Includes pressure and timing data for smoothing
 */
export type CapturedPoint = {
  /** X coordinate in slide coordinates */
  readonly x: Pixels;
  /** Y coordinate in slide coordinates */
  readonly y: Pixels;
  /** Pressure value from 0 to 1 (from PointerEvent.pressure) */
  readonly pressure: number;
  /** Timestamp in milliseconds (from performance.now()) */
  readonly timestamp: number;
};

/**
 * Smoothing level presets for pencil tool
 */
export type SmoothingLevel = "low" | "medium" | "high";

/**
 * Smoothing options for curve fitting
 */
export type SmoothingOptions = {
  /** RDP tolerance for point reduction (higher = more simplification) */
  readonly rdpTolerance: number;
  /** Bezier fitting error threshold */
  readonly fittingError: number;
  /** Corner detection angle threshold in degrees */
  readonly cornerThreshold: number;
  /** Minimum distance between sampled points */
  readonly minSamplingDistance: number;
};

// =============================================================================
// Path Element Selection Types
// =============================================================================

/**
 * Selectable path element types
 */
export type PathElementType =
  | "anchor" // Main anchor point
  | "handleIn" // Incoming bezier handle
  | "handleOut"; // Outgoing bezier handle

/**
 * Unique identifier for a path element
 */
export type PathElementId = {
  /** Shape containing the path */
  readonly shapeId: ShapeId;
  /** Which path in CustomGeometry.paths */
  readonly pathIndex: number;
  /** Which point in the path (command index for anchors) */
  readonly pointIndex: number;
  /** Type of element */
  readonly elementType: PathElementType;
};

/**
 * Path point selection state
 */
export type PathPointSelection = {
  /** Selected element IDs */
  readonly selectedElements: readonly PathElementId[];
  /** Primary selected element (for single-element operations) */
  readonly primaryElement: PathElementId | undefined;
};

/**
 * Create empty path point selection
 */
export function createEmptyPathSelection(): PathPointSelection {
  return {
    selectedElements: [],
    primaryElement: undefined,
  };
}

/**
 * Check if a path element is selected
 */
export function isPathElementSelected(
  selection: PathPointSelection,
  element: PathElementId
): boolean {
  return selection.selectedElements.some((e) => pathElementIdsEqual(e, element));
}

/**
 * Add a point to selection (without toggle)
 */
export function addPointToSelection(
  selection: PathPointSelection,
  element: PathElementId
): PathPointSelection {
  if (isPathElementSelected(selection, element)) {
    return selection;
  }
  return {
    selectedElements: [...selection.selectedElements, element],
    primaryElement: selection.primaryElement ?? element,
  };
}

/**
 * Toggle a point in selection
 */
export function togglePointInSelection(
  selection: PathPointSelection,
  element: PathElementId
): PathPointSelection {
  if (isPathElementSelected(selection, element)) {
    // Remove from selection
    const filtered = selection.selectedElements.filter(
      (e) => !pathElementIdsEqual(e, element)
    );
    return {
      selectedElements: filtered,
      primaryElement:
        selection.primaryElement && pathElementIdsEqual(selection.primaryElement, element)
          ? filtered[0]
          : selection.primaryElement,
    };
  }
  // Add to selection
  return addPointToSelection(selection, element);
}

/**
 * Create a path element ID string for use as map keys
 */
export function pathElementIdToString(id: PathElementId): string {
  return `${id.shapeId}:${id.pathIndex}:${id.pointIndex}:${id.elementType}`;
}

/**
 * Check if two path element IDs are equal
 */
export function pathElementIdsEqual(
  a: PathElementId,
  b: PathElementId
): boolean {
  return (
    a.shapeId === b.shapeId &&
    a.pathIndex === b.pathIndex &&
    a.pointIndex === b.pointIndex &&
    a.elementType === b.elementType
  );
}

// =============================================================================
// Modifier Keys State
// =============================================================================

/**
 * Modifier key state for tool interactions
 */
export type ModifierKeys = {
  /** Alt key pressed */
  readonly alt: boolean;
  /** Shift key pressed */
  readonly shift: boolean;
  /** Ctrl/Cmd key pressed */
  readonly meta: boolean;
};

/**
 * Create modifier keys state from event
 */
export function getModifierKeys(
  e: React.PointerEvent | React.MouseEvent | React.KeyboardEvent
): ModifierKeys {
  return {
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey || e.ctrlKey,
  };
}
