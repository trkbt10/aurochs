/**
 * @file Path tools type definitions
 *
 * Generic types for pen tool, pencil tool, and path editing functionality.
 * These types are PPTX/OOXML independent.
 */

// =============================================================================
// Basic Geometry Types
// =============================================================================

/**
 * A 2D point with x and y coordinates
 */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * A bounding rectangle
 */
export type Bounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

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
  /** X coordinate */
  readonly x: number;
  /** Y coordinate */
  readonly y: number;
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
 * Path data structure for editing
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
  /** X coordinate */
  readonly x: number;
  /** Y coordinate */
  readonly y: number;
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
