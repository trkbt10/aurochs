/**
 * @file Path edit handlers
 *
 * Reducer handlers for editing existing custom geometry paths.
 */

import type { PresentationEditorState, PresentationEditorAction } from "../types";
import { createSelectMode } from "../types";
import type { HandlerMap, ActionHandler } from "./handler-types";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import type { CustomGeometry, Shape, SpShape } from "@oxen/pptx/domain";
import {
  createInactivePathEditState,
  createActivePathEditState,
  isPathEditActive,
  isPathEditMovingPoints,
  isPathEditMovingHandle,
  updatePathSelection,
  startMovingPoints,
  updateMovingPointsPreview,
  startMovingHandle,
  updateMovingHandle,
  returnToActiveState,
} from "../../../slide/state";
import type { PathPointSelection, PathElementId } from "../../../../path-tools/types";
import {
  togglePointInSelection,
  addPointToSelection,
  createEmptyPathSelection,
} from "../../../../path-tools/types";
import { pushHistory } from "../../../slide/state";
import {
  customGeometryToDrawingPath,
  drawingPathToCustomGeometry,
} from "../../../../path-tools/utils/path-commands";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a shape has CustomGeometry
 */
function isCustomGeometryShape(shape: Shape): shape is SpShape & { properties: { geometry: CustomGeometry } } {
  if (shape.type !== "sp") {return false;}
  return shape.properties.geometry?.type === "custom";
}

/**
 * Get shape ID from a shape (some shapes like ContentPartShape don't have nonVisual)
 */
function getShapeId(shape: Shape): ShapeId | undefined {
  if (shape.type === "contentPart") {return undefined;}
  return shape.nonVisual.id;
}

/**
 * Find a shape by ID in the active slide
 */
function findShapeById(
  state: PresentationEditorState,
  shapeId: ShapeId
): Shape | undefined {
  const document = state.documentHistory.present;
  const activeSlide = document.slides.find((s) => s.id === state.activeSlideId);
  if (!activeSlide) {return undefined;}
  return activeSlide.slide.shapes.find((s) => getShapeId(s) === shapeId);
}

/**
 * Update a shape in the active slide
 */
function updateShapeInActiveSlide(
  state: PresentationEditorState,
  shapeId: ShapeId,
  updater: (shape: Shape) => Shape
): PresentationEditorState {
  const document = state.documentHistory.present;
  const activeSlide = document.slides.find((s) => s.id === state.activeSlideId);

  if (!activeSlide) {
    return state;
  }

  const shapeIndex = activeSlide.slide.shapes.findIndex(
    (s) => getShapeId(s) === shapeId
  );
  if (shapeIndex === -1) {
    return state;
  }

  const updatedShapes = [...activeSlide.slide.shapes];
  updatedShapes[shapeIndex] = updater(updatedShapes[shapeIndex]);

  const updatedSlide = {
    ...activeSlide,
    slide: {
      ...activeSlide.slide,
      shapes: updatedShapes,
    },
  };

  const updatedSlides = document.slides.map((s) =>
    s.id === state.activeSlideId ? updatedSlide : s
  );

  const updatedDocument = {
    ...document,
    slides: updatedSlides,
  };

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, updatedDocument),
  };
}

// =============================================================================
// Enter/Exit Path Edit
// =============================================================================

/**
 * Enter path edit mode for a shape
 */
const handleEnterPathEdit: ActionHandler<Extract<PresentationEditorAction, { type: "ENTER_PATH_EDIT" }>> = (
  state,
  action
) => {
  const shape = findShapeById(state, action.shapeId);
  if (!shape || !isCustomGeometryShape(shape)) {
    return state;
  }

  const geometry = shape.properties.geometry;

  return {
    ...state,
    pathEdit: createActivePathEditState(action.shapeId, 0, geometry),
    // Clear shape selection when entering path edit mode
    shapeSelection: { selectedIds: [], primaryId: undefined },
  };
};

/**
 * Exit path edit mode
 */
const handleExitPathEdit: ActionHandler<Extract<PresentationEditorAction, { type: "EXIT_PATH_EDIT" }>> = (
  state,
  action
) => {
  // If not in path edit mode, nothing to do
  if (state.pathEdit.type === "inactive") {
    return state;
  }

  // Simply exit - the actual geometry update is handled separately
  // by UPDATE_SHAPE action when the user commits changes
  return {
    ...state,
    pathEdit: createInactivePathEditState(),
    creationMode: createSelectMode(),
  };
};

// =============================================================================
// Selection Handlers
// =============================================================================

/**
 * Select a path element
 */
const handleSelectPathElement: ActionHandler<Extract<PresentationEditorAction, { type: "SELECT_PATH_ELEMENT" }>> = (
  state,
  action
) => {
  if (!isPathEditActive(state.pathEdit)) {
    return state;
  }

  const { element, addToSelection, toggle } = action;
  let newSelection: PathPointSelection;

  if (toggle) {
    newSelection = togglePointInSelection(state.pathEdit.selection, element);
  } else if (addToSelection) {
    newSelection = addPointToSelection(state.pathEdit.selection, element);
  } else {
    newSelection = {
      selectedElements: [element],
      primaryElement: element,
    };
  }

  return {
    ...state,
    pathEdit: updatePathSelection(state.pathEdit, newSelection),
  };
};

/**
 * Select multiple path elements
 */
const handleSelectPathElements: ActionHandler<Extract<PresentationEditorAction, { type: "SELECT_PATH_ELEMENTS" }>> = (
  state,
  action
) => {
  if (!isPathEditActive(state.pathEdit)) {
    return state;
  }

  const newSelection: PathPointSelection = {
    selectedElements: [...action.elements],
    primaryElement: action.elements[0],
  };

  return {
    ...state,
    pathEdit: updatePathSelection(state.pathEdit, newSelection),
  };
};

/**
 * Clear path selection
 */
const handleClearPathSelection: ActionHandler<Extract<PresentationEditorAction, { type: "CLEAR_PATH_SELECTION" }>> = (
  state
) => {
  if (!isPathEditActive(state.pathEdit)) {
    return state;
  }

  return {
    ...state,
    pathEdit: updatePathSelection(state.pathEdit, createEmptyPathSelection()),
  };
};

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Set path edit tool
 */
const handleSetPathEditTool: ActionHandler<Extract<PresentationEditorAction, { type: "SET_PATH_EDIT_TOOL" }>> = (
  state,
  action
) => {
  if (!isPathEditActive(state.pathEdit)) {
    return state;
  }

  return {
    ...state,
    pathEdit: {
      ...state.pathEdit,
      tool: action.tool,
    },
  };
};

// =============================================================================
// Move Points Handlers
// =============================================================================

/**
 * Start moving points
 */
const handleStartMovePoints: ActionHandler<Extract<PresentationEditorAction, { type: "START_MOVE_POINTS" }>> = (
  state,
  action
) => {
  if (!isPathEditActive(state.pathEdit)) {
    return state;
  }

  // Get the point indices from the selection (only anchor points)
  const pointIndices = state.pathEdit.selection.selectedElements
    .filter((el) => el.elementType === "anchor")
    .map((el) => el.pointIndex);
  if (pointIndices.length === 0) {
    return state;
  }

  return {
    ...state,
    pathEdit: startMovingPoints(state.pathEdit, pointIndices, action.x, action.y),
  };
};

/**
 * Preview move points
 */
const handlePreviewMovePoints: ActionHandler<Extract<PresentationEditorAction, { type: "PREVIEW_MOVE_POINTS" }>> = (
  state,
  action
) => {
  if (!isPathEditMovingPoints(state.pathEdit)) {
    return state;
  }

  return {
    ...state,
    pathEdit: updateMovingPointsPreview(state.pathEdit, action.dx, action.dy),
  };
};

/**
 * Commit move points
 */
const handleCommitMovePoints: ActionHandler<Extract<PresentationEditorAction, { type: "COMMIT_MOVE_POINTS" }>> = (
  state
) => {
  if (!isPathEditMovingPoints(state.pathEdit)) {
    return state;
  }

  // Return to active state - actual geometry update is handled by the component
  return {
    ...state,
    pathEdit: returnToActiveState(state.pathEdit),
  };
};

// =============================================================================
// Move Handle Handlers
// =============================================================================

/**
 * Start moving handle
 */
const handleStartMoveHandle: ActionHandler<Extract<PresentationEditorAction, { type: "START_MOVE_HANDLE" }>> = (
  state,
  action
) => {
  if (!isPathEditActive(state.pathEdit)) {
    return state;
  }

  return {
    ...state,
    pathEdit: startMovingHandle(
      state.pathEdit,
      action.pointIndex,
      action.handleSide,
      action.x,
      action.y,
      action.mirrorHandle
    ),
  };
};

/**
 * Update move handle
 */
const handleUpdateMoveHandle: ActionHandler<Extract<PresentationEditorAction, { type: "UPDATE_MOVE_HANDLE" }>> = (
  state,
  action
) => {
  if (!isPathEditMovingHandle(state.pathEdit)) {
    return state;
  }

  return {
    ...state,
    pathEdit: updateMovingHandle(state.pathEdit, action.x, action.y),
  };
};

/**
 * Commit move handle
 */
const handleCommitMoveHandle: ActionHandler<Extract<PresentationEditorAction, { type: "COMMIT_MOVE_HANDLE" }>> = (
  state
) => {
  if (!isPathEditMovingHandle(state.pathEdit)) {
    return state;
  }

  return {
    ...state,
    pathEdit: returnToActiveState(state.pathEdit),
  };
};

// =============================================================================
// Path Modification Handlers
// =============================================================================

/**
 * Add anchor point to path
 */
const handleAddPathAnchor: ActionHandler<Extract<PresentationEditorAction, { type: "ADD_PATH_ANCHOR" }>> = (
  state,
  _action
) => {
  // This is a complex operation that requires de Casteljau algorithm
  // Implementation deferred to path operations utilities
  return state;
};

/**
 * Remove selected anchors from path
 */
const handleRemovePathAnchors: ActionHandler<Extract<PresentationEditorAction, { type: "REMOVE_PATH_ANCHORS" }>> = (
  state
) => {
  // Implementation deferred to path operations utilities
  return state;
};

/**
 * Convert selected anchors between smooth/corner
 */
const handleConvertPathAnchors: ActionHandler<Extract<PresentationEditorAction, { type: "CONVERT_PATH_ANCHORS" }>> = (
  state,
  _action
) => {
  // Implementation deferred to path operations utilities
  return state;
};

/**
 * Join two paths
 */
const handleJoinPaths: ActionHandler<Extract<PresentationEditorAction, { type: "JOIN_PATHS" }>> = (
  state,
  _action
) => {
  // Implementation deferred to path operations utilities
  return state;
};

/**
 * Split path at a point
 */
const handleSplitPath: ActionHandler<Extract<PresentationEditorAction, { type: "SPLIT_PATH" }>> = (
  state,
  _action
) => {
  // Implementation deferred to path operations utilities
  return state;
};

// =============================================================================
// Handler Map Export
// =============================================================================

/**
 * Path edit handlers map
 */
export const PATH_EDIT_HANDLERS: HandlerMap = {
  ENTER_PATH_EDIT: handleEnterPathEdit,
  EXIT_PATH_EDIT: handleExitPathEdit,
  SELECT_PATH_ELEMENT: handleSelectPathElement,
  SELECT_PATH_ELEMENTS: handleSelectPathElements,
  CLEAR_PATH_SELECTION: handleClearPathSelection,
  SET_PATH_EDIT_TOOL: handleSetPathEditTool,
  START_MOVE_POINTS: handleStartMovePoints,
  PREVIEW_MOVE_POINTS: handlePreviewMovePoints,
  COMMIT_MOVE_POINTS: handleCommitMovePoints,
  START_MOVE_HANDLE: handleStartMoveHandle,
  UPDATE_MOVE_HANDLE: handleUpdateMoveHandle,
  COMMIT_MOVE_HANDLE: handleCommitMoveHandle,
  ADD_PATH_ANCHOR: handleAddPathAnchor,
  REMOVE_PATH_ANCHORS: handleRemovePathAnchors,
  CONVERT_PATH_ANCHORS: handleConvertPathAnchors,
  JOIN_PATHS: handleJoinPaths,
  SPLIT_PATH: handleSplitPath,
};
