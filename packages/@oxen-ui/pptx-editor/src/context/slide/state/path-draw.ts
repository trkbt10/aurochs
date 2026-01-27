/**
 * @file Path drawing state management
 *
 * State types and utilities for pen and pencil drawing operations.
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type {
  DrawingPath,
  CapturedPoint,
  AnchorPointType,
} from "../../../path-tools/types";
import { createEmptyDrawingPath } from "../../../path-tools/types";

// =============================================================================
// Path Draw State Types
// =============================================================================

/**
 * Idle state - no path drawing in progress
 */
export type IdlePathDrawState = {
  readonly type: "idle";
};

/**
 * Drawing state - pen tool active, building a path
 */
export type DrawingPathDrawState = {
  readonly type: "drawing";
  /** The path being drawn */
  readonly path: DrawingPath;
  /** Index of point being hovered (for closing path feedback) */
  readonly hoverPointIndex: number | undefined;
  /** Preview position for next potential point */
  readonly previewPoint: { x: Pixels; y: Pixels } | undefined;
};

/**
 * Handle drag state - dragging a bezier handle
 */
export type HandleDragPathDrawState = {
  readonly type: "dragging-handle";
  /** The path being edited */
  readonly path: DrawingPath;
  /** Index of anchor point whose handle is being dragged */
  readonly pointIndex: number;
  /** Which handle side is being dragged */
  readonly handleSide: "in" | "out";
  /** Starting drag position */
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** Current drag position */
  readonly currentX: Pixels;
  readonly currentY: Pixels;
};

/**
 * Pencil drawing state - freehand drawing in progress
 */
export type PencilDrawingPathDrawState = {
  readonly type: "pencil-drawing";
  /** Raw captured points */
  readonly rawPoints: readonly CapturedPoint[];
  /** Simplified preview points (for rendering) */
  readonly previewPoints: readonly CapturedPoint[];
  /** Whether the stroke has pressure data */
  readonly hasPressureData: boolean;
};

/**
 * Union of all path draw states
 */
export type PathDrawState =
  | IdlePathDrawState
  | DrawingPathDrawState
  | HandleDragPathDrawState
  | PencilDrawingPathDrawState;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create idle path draw state
 */
export function createIdlePathDrawState(): IdlePathDrawState {
  return { type: "idle" };
}

/**
 * Create drawing path draw state
 */
export function createDrawingPathDrawState(): DrawingPathDrawState {
  return {
    type: "drawing",
    path: createEmptyDrawingPath(),
    hoverPointIndex: undefined,
    previewPoint: undefined,
  };
}

/**
 * Create pencil drawing state
 */
export function createPencilDrawingState(
  firstPoint: CapturedPoint
): PencilDrawingPathDrawState {
  const hasPressure = firstPoint.pressure !== 0.5; // Default pressure is 0.5
  return {
    type: "pencil-drawing",
    rawPoints: [firstPoint],
    previewPoints: [firstPoint],
    hasPressureData: hasPressure,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if path draw state is idle
 */
export function isPathDrawIdle(
  state: PathDrawState
): state is IdlePathDrawState {
  return state.type === "idle";
}

/**
 * Check if path draw state is drawing
 */
export function isPathDrawDrawing(
  state: PathDrawState
): state is DrawingPathDrawState {
  return state.type === "drawing";
}

/**
 * Check if path draw state is dragging handle
 */
export function isPathDrawDraggingHandle(
  state: PathDrawState
): state is HandleDragPathDrawState {
  return state.type === "dragging-handle";
}

/**
 * Check if path draw state is pencil drawing
 */
export function isPathDrawPencil(
  state: PathDrawState
): state is PencilDrawingPathDrawState {
  return state.type === "pencil-drawing";
}

// =============================================================================
// State Update Functions
// =============================================================================

/**
 * Update drawing state with new path
 */
export function updateDrawingPath(
  state: DrawingPathDrawState,
  path: DrawingPath
): DrawingPathDrawState {
  return { ...state, path };
}

/**
 * Set hover point index
 */
export function setHoverPointIndex(
  state: DrawingPathDrawState,
  index: number | undefined
): DrawingPathDrawState {
  return { ...state, hoverPointIndex: index };
}

/**
 * Set preview point
 */
export function setPreviewPoint(
  state: DrawingPathDrawState,
  point: { x: Pixels; y: Pixels } | undefined
): DrawingPathDrawState {
  return { ...state, previewPoint: point };
}

/**
 * Start handle drag
 */
export function startHandleDrag(
  path: DrawingPath,
  pointIndex: number,
  handleSide: "in" | "out",
  x: Pixels,
  y: Pixels
): HandleDragPathDrawState {
  return {
    type: "dragging-handle",
    path,
    pointIndex,
    handleSide,
    startX: x,
    startY: y,
    currentX: x,
    currentY: y,
  };
}

/**
 * Update handle drag position
 */
export function updateHandleDrag(
  state: HandleDragPathDrawState,
  x: Pixels,
  y: Pixels
): HandleDragPathDrawState {
  return { ...state, currentX: x, currentY: y };
}

/**
 * Add point to pencil drawing
 */
export function addPencilPoint(
  state: PencilDrawingPathDrawState,
  point: CapturedPoint,
  shouldUpdatePreview: boolean
): PencilDrawingPathDrawState {
  const newRawPoints = [...state.rawPoints, point];
  const newPreviewPoints = shouldUpdatePreview
    ? [...state.previewPoints, point]
    : state.previewPoints;

  return {
    ...state,
    rawPoints: newRawPoints,
    previewPoints: newPreviewPoints,
    hasPressureData: state.hasPressureData || point.pressure !== 0.5,
  };
}

// =============================================================================
// Path Draw Action Types
// =============================================================================

/**
 * Actions for path drawing
 */
export type PathDrawAction =
  | { readonly type: "START_PEN_DRAW" }
  | {
      readonly type: "ADD_PEN_POINT";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly pointType: AnchorPointType;
    }
  | {
      readonly type: "START_HANDLE_DRAG";
      readonly pointIndex: number;
      readonly handleSide: "in" | "out";
      readonly x: Pixels;
      readonly y: Pixels;
    }
  | {
      readonly type: "UPDATE_HANDLE_DRAG";
      readonly x: Pixels;
      readonly y: Pixels;
    }
  | { readonly type: "END_HANDLE_DRAG" }
  | { readonly type: "SET_HOVER_POINT"; readonly index: number | undefined }
  | {
      readonly type: "SET_PREVIEW_POINT";
      readonly point: { x: Pixels; y: Pixels } | undefined;
    }
  | { readonly type: "CLOSE_DRAWING_PATH" }
  | { readonly type: "COMMIT_DRAWING_PATH" }
  | { readonly type: "CANCEL_DRAWING_PATH" }
  | {
      readonly type: "START_PENCIL_DRAW";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly pressure: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "ADD_PENCIL_POINT";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly pressure: number;
      readonly timestamp: number;
    }
  | { readonly type: "END_PENCIL_DRAW" };
