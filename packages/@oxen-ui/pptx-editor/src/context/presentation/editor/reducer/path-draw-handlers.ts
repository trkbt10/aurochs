/**
 * @file Path draw handlers
 *
 * Reducer handlers for pen and pencil tool path drawing.
 */

import type { PresentationEditorState, PresentationEditorAction } from "../types";
import { createSelectMode } from "../types";
import type { HandlerMap, ActionHandler } from "./handler-types";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import {
  createDrawingPathDrawState,
  createIdlePathDrawState,
  createPencilDrawingState,
  isPathDrawDrawing,
  isPathDrawPencil,
} from "../../../slide/state/path-draw";
import type { PathAnchorPoint, AnchorPointType, CapturedPoint } from "../../../../path-tools/types";
import { createCustomGeometryShape, generateShapeId } from "../../../../shape/factory";
import { drawingPathToCustomGeometry } from "../../../../path-tools/utils/path-commands";
import { pushHistory } from "../../../slide/state";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Add a shape to the active slide
 */
function addShapeToActiveSlide(
  state: PresentationEditorState,
  shape: ReturnType<typeof createCustomGeometryShape>
): PresentationEditorState {
  const document = state.documentHistory.present;
  const activeSlide = document.slides.find((s) => s.id === state.activeSlideId);

  if (!activeSlide) {
    return state;
  }

  const updatedSlide = {
    ...activeSlide,
    slide: {
      ...activeSlide.slide,
      shapes: [...activeSlide.slide.shapes, shape],
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
// Pen Tool Handlers
// =============================================================================

/**
 * Start pen drawing mode
 */
const handleStartPenDraw: ActionHandler<Extract<PresentationEditorAction, { type: "START_PEN_DRAW" }>> = (
  state
) => {
  return {
    ...state,
    pathDraw: createDrawingPathDrawState(),
  };
};

/**
 * Add a pen point
 */
const handleAddPenPoint: ActionHandler<Extract<PresentationEditorAction, { type: "ADD_PEN_POINT" }>> = (
  state,
  action
) => {
  if (!isPathDrawDrawing(state.pathDraw)) {
    return state;
  }

  const newPoint: PathAnchorPoint = {
    x: action.x,
    y: action.y,
    type: action.pointType as AnchorPointType,
    handleIn: undefined,
    handleOut: undefined,
  };

  return {
    ...state,
    pathDraw: {
      ...state.pathDraw,
      path: {
        ...state.pathDraw.path,
        points: [...state.pathDraw.path.points, newPoint],
      },
    },
  };
};

/**
 * Update handles for a pen point
 */
const handleUpdatePenPointHandles: ActionHandler<Extract<PresentationEditorAction, { type: "UPDATE_PEN_POINT_HANDLES" }>> = (
  state,
  action
) => {
  if (!isPathDrawDrawing(state.pathDraw)) {
    return state;
  }

  const { pointIndex, handleIn, handleOut } = action;
  const points = state.pathDraw.path.points;

  if (pointIndex < 0 || pointIndex >= points.length) {
    return state;
  }

  const updatedPoints = points.map((point, i) => {
    if (i !== pointIndex) {
      return point;
    }
    return {
      ...point,
      type: "smooth" as AnchorPointType,
      handleIn: handleIn ? { x: handleIn.x, y: handleIn.y } : point.handleIn,
      handleOut: handleOut ? { x: handleOut.x, y: handleOut.y } : point.handleOut,
    };
  });

  return {
    ...state,
    pathDraw: {
      ...state.pathDraw,
      path: {
        ...state.pathDraw.path,
        points: updatedPoints,
      },
    },
  };
};

/**
 * Set hover point index
 */
const handleSetPenHoverPoint: ActionHandler<Extract<PresentationEditorAction, { type: "SET_PEN_HOVER_POINT" }>> = (
  state,
  action
) => {
  if (!isPathDrawDrawing(state.pathDraw)) {
    return state;
  }

  return {
    ...state,
    pathDraw: {
      ...state.pathDraw,
      hoverPointIndex: action.index,
    },
  };
};

/**
 * Set preview point
 */
const handleSetPenPreviewPoint: ActionHandler<Extract<PresentationEditorAction, { type: "SET_PEN_PREVIEW_POINT" }>> = (
  state,
  action
) => {
  if (!isPathDrawDrawing(state.pathDraw)) {
    return state;
  }

  return {
    ...state,
    pathDraw: {
      ...state.pathDraw,
      previewPoint: action.point,
    },
  };
};

/**
 * Close the pen path
 */
const handleClosePenPath: ActionHandler<Extract<PresentationEditorAction, { type: "CLOSE_PEN_PATH" }>> = (
  state
) => {
  if (!isPathDrawDrawing(state.pathDraw)) {
    return state;
  }

  if (state.pathDraw.path.points.length < 3) {
    // Need at least 3 points to close
    return state;
  }

  const closedPath = {
    ...state.pathDraw.path,
    isClosed: true,
  };

  // Create shape and add to slide
  const { geometry, bounds } = drawingPathToCustomGeometry(closedPath);
  const shape = createCustomGeometryShape(generateShapeId(), geometry, bounds);
  const stateWithShape = addShapeToActiveSlide(state, shape);

  return {
    ...stateWithShape,
    pathDraw: createIdlePathDrawState(),
    creationMode: createSelectMode(),
  };
};

/**
 * Commit the pen path (as open path)
 */
const handleCommitPenPath: ActionHandler<Extract<PresentationEditorAction, { type: "COMMIT_PEN_PATH" }>> = (
  state
) => {
  if (!isPathDrawDrawing(state.pathDraw)) {
    return state;
  }

  if (state.pathDraw.path.points.length < 2) {
    // Need at least 2 points for a path
    return {
      ...state,
      pathDraw: createIdlePathDrawState(),
    };
  }

  // Create shape and add to slide
  const { geometry, bounds } = drawingPathToCustomGeometry(state.pathDraw.path);
  const shape = createCustomGeometryShape(generateShapeId(), geometry, bounds);
  const stateWithShape = addShapeToActiveSlide(state, shape);

  return {
    ...stateWithShape,
    pathDraw: createIdlePathDrawState(),
    creationMode: createSelectMode(),
  };
};

/**
 * Cancel pen drawing
 */
const handleCancelPenPath: ActionHandler<Extract<PresentationEditorAction, { type: "CANCEL_PEN_PATH" }>> = (
  state
) => {
  return {
    ...state,
    pathDraw: createIdlePathDrawState(),
    creationMode: createSelectMode(),
  };
};

// =============================================================================
// Pencil Tool Handlers
// =============================================================================

/**
 * Start pencil drawing
 */
const handleStartPencilDraw: ActionHandler<Extract<PresentationEditorAction, { type: "START_PENCIL_DRAW" }>> = (
  state,
  action
) => {
  const firstPoint: CapturedPoint = {
    x: action.x,
    y: action.y,
    pressure: action.pressure,
    timestamp: action.timestamp,
  };

  return {
    ...state,
    pathDraw: createPencilDrawingState(firstPoint),
  };
};

/**
 * Add pencil point
 */
const handleAddPencilPoint: ActionHandler<Extract<PresentationEditorAction, { type: "ADD_PENCIL_POINT" }>> = (
  state,
  action
) => {
  if (!isPathDrawPencil(state.pathDraw)) {
    return state;
  }

  const newPoint: CapturedPoint = {
    x: action.x,
    y: action.y,
    pressure: action.pressure,
    timestamp: action.timestamp,
  };

  // Check if we should update preview (throttle to ~30fps)
  const lastPreviewPoint = state.pathDraw.previewPoints[state.pathDraw.previewPoints.length - 1];
  const timeDelta = lastPreviewPoint ? action.timestamp - lastPreviewPoint.timestamp : 33;
  const shouldUpdatePreview = timeDelta >= 33;

  return {
    ...state,
    pathDraw: {
      ...state.pathDraw,
      rawPoints: [...state.pathDraw.rawPoints, newPoint],
      previewPoints: shouldUpdatePreview
        ? [...state.pathDraw.previewPoints, newPoint]
        : state.pathDraw.previewPoints,
    },
  };
};

/**
 * End pencil drawing
 *
 * Note: This creates a simple polyline path. Full bezier fitting
 * would be implemented in a follow-up phase using the pencil utilities.
 */
const handleEndPencilDraw: ActionHandler<Extract<PresentationEditorAction, { type: "END_PENCIL_DRAW" }>> = (
  state
) => {
  if (!isPathDrawPencil(state.pathDraw)) {
    return state;
  }

  const { rawPoints } = state.pathDraw;

  if (rawPoints.length < 2) {
    return {
      ...state,
      pathDraw: createIdlePathDrawState(),
    };
  }

  // Convert raw points to a simple polyline path
  // Note: Full bezier fitting would be implemented here using
  // rdp-simplify and bezier-fit utilities
  const drawingPath = {
    points: rawPoints.map((pt) => ({
      x: pt.x,
      y: pt.y,
      type: "corner" as AnchorPointType,
      handleIn: undefined,
      handleOut: undefined,
    })),
    isClosed: false,
  };

  // Create shape and add to slide
  const { geometry, bounds } = drawingPathToCustomGeometry(drawingPath);
  const shape = createCustomGeometryShape(generateShapeId(), geometry, bounds);
  const stateWithShape = addShapeToActiveSlide(state, shape);

  return {
    ...stateWithShape,
    pathDraw: createIdlePathDrawState(),
    creationMode: createSelectMode(),
  };
};

// =============================================================================
// Handler Map Export
// =============================================================================

/**
 * Path draw handlers map
 */
export const PATH_DRAW_HANDLERS: HandlerMap = {
  START_PEN_DRAW: handleStartPenDraw,
  ADD_PEN_POINT: handleAddPenPoint,
  UPDATE_PEN_POINT_HANDLES: handleUpdatePenPointHandles,
  SET_PEN_HOVER_POINT: handleSetPenHoverPoint,
  SET_PEN_PREVIEW_POINT: handleSetPenPreviewPoint,
  CLOSE_PEN_PATH: handleClosePenPath,
  COMMIT_PEN_PATH: handleCommitPenPath,
  CANCEL_PEN_PATH: handleCancelPenPath,
  START_PENCIL_DRAW: handleStartPencilDraw,
  ADD_PENCIL_POINT: handleAddPencilPoint,
  END_PENCIL_DRAW: handleEndPencilDraw,
};
