/**
 * @file Path editing state management
 *
 * State types and utilities for editing existing path shapes.
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { CustomGeometry } from "@oxen/pptx/domain";
import type {
  PathPointSelection,
  PathElementId,
  AnchorPointType,
} from "../../../path-tools/types";
import { createEmptyPathSelection } from "../../../path-tools/types";

// =============================================================================
// Path Edit State Types
// =============================================================================

/**
 * Inactive state - not editing any path
 */
export type InactivePathEditState = {
  readonly type: "inactive";
};

/**
 * Active path edit state - editing a CustomGeometry shape
 */
export type ActivePathEditState = {
  readonly type: "active";
  /** Shape being edited */
  readonly shapeId: ShapeId;
  /** Which sub-path within CustomGeometry */
  readonly pathIndex: number;
  /** Copy of geometry at edit start (for undo) */
  readonly initialGeometry: CustomGeometry;
  /** Current path element selection */
  readonly selection: PathPointSelection;
  /** Active sub-tool within path edit mode */
  readonly tool: PathEditTool;
};

/**
 * Moving points state - dragging selected anchor points
 */
export type MovingPointsPathEditState = {
  readonly type: "moving-points";
  /** Shape being edited */
  readonly shapeId: ShapeId;
  /** Which sub-path */
  readonly pathIndex: number;
  /** Initial geometry */
  readonly initialGeometry: CustomGeometry;
  /** Current selection */
  readonly selection: PathPointSelection;
  /** Active tool */
  readonly tool: PathEditTool;
  /** Indices of points being moved */
  readonly movingPointIndices: readonly number[];
  /** Starting drag position */
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** Current preview delta */
  readonly previewDelta: { dx: Pixels; dy: Pixels };
};

/**
 * Moving handle state - dragging a bezier control handle
 */
export type MovingHandlePathEditState = {
  readonly type: "moving-handle";
  /** Shape being edited */
  readonly shapeId: ShapeId;
  /** Which sub-path */
  readonly pathIndex: number;
  /** Initial geometry */
  readonly initialGeometry: CustomGeometry;
  /** Current selection */
  readonly selection: PathPointSelection;
  /** Active tool */
  readonly tool: PathEditTool;
  /** Index of point whose handle is being moved */
  readonly pointIndex: number;
  /** Which handle side */
  readonly handleSide: "in" | "out";
  /** Starting position */
  readonly startX: Pixels;
  readonly startY: Pixels;
  /** Current position */
  readonly currentX: Pixels;
  readonly currentY: Pixels;
  /** Whether to mirror the opposite handle (for smooth points) */
  readonly mirrorHandle: boolean;
};

/**
 * Union of all path edit states
 */
export type PathEditState =
  | InactivePathEditState
  | ActivePathEditState
  | MovingPointsPathEditState
  | MovingHandlePathEditState;

// =============================================================================
// Path Edit Tool Types
// =============================================================================

/**
 * Sub-tools available within path edit mode
 */
export type PathEditTool =
  | { readonly type: "directSelection" } // Default: select/move elements
  | { readonly type: "pen" } // Add anchors by clicking
  | { readonly type: "addAnchor" } // Add anchors to existing segments
  | { readonly type: "deleteAnchor" } // Remove anchors
  | { readonly type: "convertAnchor" }; // Toggle smooth/corner

/**
 * Create default path edit tool
 */
export function createDefaultPathEditTool(): PathEditTool {
  return { type: "directSelection" };
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create inactive path edit state
 */
export function createInactivePathEditState(): InactivePathEditState {
  return { type: "inactive" };
}

/**
 * Create active path edit state
 */
export function createActivePathEditState(
  shapeId: ShapeId,
  pathIndex: number,
  geometry: CustomGeometry
): ActivePathEditState {
  return {
    type: "active",
    shapeId,
    pathIndex,
    initialGeometry: geometry,
    selection: createEmptyPathSelection(),
    tool: createDefaultPathEditTool(),
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if path edit state is inactive
 */
export function isPathEditInactive(
  state: PathEditState
): state is InactivePathEditState {
  return state.type === "inactive";
}

/**
 * Check if path edit state is active
 */
export function isPathEditActive(
  state: PathEditState
): state is ActivePathEditState {
  return state.type === "active";
}

/**
 * Check if path edit state is moving points
 */
export function isPathEditMovingPoints(
  state: PathEditState
): state is MovingPointsPathEditState {
  return state.type === "moving-points";
}

/**
 * Check if path edit state is moving handle
 */
export function isPathEditMovingHandle(
  state: PathEditState
): state is MovingHandlePathEditState {
  return state.type === "moving-handle";
}

/**
 * Check if path edit state is in any editing mode (not inactive)
 */
export function isPathEditEditing(
  state: PathEditState
): state is Exclude<PathEditState, InactivePathEditState> {
  return state.type !== "inactive";
}

// =============================================================================
// State Update Functions
// =============================================================================

/**
 * Update selection in active state
 */
export function updatePathSelection(
  state: ActivePathEditState,
  selection: PathPointSelection
): ActivePathEditState {
  return { ...state, selection };
}

/**
 * Update tool in active state
 */
export function updatePathEditTool(
  state: ActivePathEditState,
  tool: PathEditTool
): ActivePathEditState {
  return { ...state, tool };
}

/**
 * Start moving points
 */
export function startMovingPoints(
  state: ActivePathEditState,
  pointIndices: readonly number[],
  startX: Pixels,
  startY: Pixels
): MovingPointsPathEditState {
  return {
    type: "moving-points",
    shapeId: state.shapeId,
    pathIndex: state.pathIndex,
    initialGeometry: state.initialGeometry,
    selection: state.selection,
    tool: state.tool,
    movingPointIndices: pointIndices,
    startX,
    startY,
    previewDelta: { dx: 0 as Pixels, dy: 0 as Pixels },
  };
}

/**
 * Update moving points preview
 */
export function updateMovingPointsPreview(
  state: MovingPointsPathEditState,
  dx: Pixels,
  dy: Pixels
): MovingPointsPathEditState {
  return { ...state, previewDelta: { dx, dy } };
}

/**
 * Start moving handle
 */
export function startMovingHandle(
  state: ActivePathEditState,
  pointIndex: number,
  handleSide: "in" | "out",
  startX: Pixels,
  startY: Pixels,
  mirrorHandle: boolean
): MovingHandlePathEditState {
  return {
    type: "moving-handle",
    shapeId: state.shapeId,
    pathIndex: state.pathIndex,
    initialGeometry: state.initialGeometry,
    selection: state.selection,
    tool: state.tool,
    pointIndex,
    handleSide,
    startX,
    startY,
    currentX: startX,
    currentY: startY,
    mirrorHandle,
  };
}

/**
 * Update moving handle position
 */
export function updateMovingHandle(
  state: MovingHandlePathEditState,
  currentX: Pixels,
  currentY: Pixels
): MovingHandlePathEditState {
  return { ...state, currentX, currentY };
}

/**
 * Return to active state from moving state
 */
export function returnToActiveState(
  state: MovingPointsPathEditState | MovingHandlePathEditState
): ActivePathEditState {
  return {
    type: "active",
    shapeId: state.shapeId,
    pathIndex: state.pathIndex,
    initialGeometry: state.initialGeometry,
    selection: state.selection,
    tool: state.tool,
  };
}

// =============================================================================
// Path Edit Action Types
// =============================================================================

/**
 * Actions for path editing
 */
export type PathEditAction =
  | { readonly type: "ENTER_PATH_EDIT"; readonly shapeId: ShapeId }
  | { readonly type: "EXIT_PATH_EDIT"; readonly commit: boolean }
  | {
      readonly type: "SELECT_PATH_ELEMENT";
      readonly element: PathElementId;
      readonly addToSelection: boolean;
      readonly toggle: boolean;
    }
  | {
      readonly type: "SELECT_PATH_ELEMENTS";
      readonly elements: readonly PathElementId[];
    }
  | { readonly type: "CLEAR_PATH_SELECTION" }
  | {
      readonly type: "SET_PATH_EDIT_TOOL";
      readonly tool: PathEditTool;
    }
  | {
      readonly type: "START_MOVE_POINTS";
      readonly x: Pixels;
      readonly y: Pixels;
    }
  | {
      readonly type: "PREVIEW_MOVE_POINTS";
      readonly dx: Pixels;
      readonly dy: Pixels;
    }
  | { readonly type: "COMMIT_MOVE_POINTS" }
  | {
      readonly type: "START_MOVE_HANDLE";
      readonly pointIndex: number;
      readonly handleSide: "in" | "out";
      readonly x: Pixels;
      readonly y: Pixels;
      readonly mirrorHandle: boolean;
    }
  | {
      readonly type: "UPDATE_MOVE_HANDLE";
      readonly x: Pixels;
      readonly y: Pixels;
    }
  | { readonly type: "COMMIT_MOVE_HANDLE" }
  | {
      readonly type: "ADD_PATH_ANCHOR";
      readonly pathIndex: number;
      readonly segmentIndex: number;
      readonly t: number;
    }
  | { readonly type: "REMOVE_PATH_ANCHORS" }
  | {
      readonly type: "CONVERT_PATH_ANCHORS";
      readonly toType: AnchorPointType;
    }
  | {
      readonly type: "JOIN_PATHS";
      readonly pathIndex1: number;
      readonly end1: "start" | "end";
      readonly pathIndex2: number;
      readonly end2: "start" | "end";
    }
  | {
      readonly type: "SPLIT_PATH";
      readonly pathIndex: number;
      readonly pointIndex: number;
    };
