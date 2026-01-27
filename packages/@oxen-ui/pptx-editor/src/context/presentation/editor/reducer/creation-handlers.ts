/**
 * @file Creation mode handlers
 *
 * Handlers for shape/picture/chart/diagram creation.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type {
  PresentationEditorState,
  PresentationEditorAction,
  CreationMode,
} from "../types";
import { createSelectMode } from "../types";
import type { SelectionState } from "../../../slide/state";
import type { HandlerMap } from "./handler-types";
import { getActiveSlide, updateActiveSlideInDocument } from "./helpers";
import { pushHistory, createEmptySelection } from "../../../slide/state";
import { generateShapeId } from "../../../../shape/mutation";
import { createPicShape } from "../../../../shape/factory";
import type { ShapeBounds } from "../../../../shape/creation-bounds";
import { createChartGraphicFrame, createDiagramGraphicFrame } from "../../../../graphic-frame/factory";

type SetCreationModeAction = Extract<
  PresentationEditorAction,
  { type: "SET_CREATION_MODE" }
>;
type CreateShapeAction = Extract<
  PresentationEditorAction,
  { type: "CREATE_SHAPE" }
>;
type AddPictureAction = Extract<
  PresentationEditorAction,
  { type: "ADD_PICTURE" }
>;
type AddChartAction = Extract<PresentationEditorAction, { type: "ADD_CHART" }>;
type AddDiagramAction = Extract<
  PresentationEditorAction,
  { type: "ADD_DIAGRAM" }
>;

/**
 * Get selection state for creation mode change
 */
function getSelectionForModeChange(
  mode: CreationMode,
  currentSelection: SelectionState
): SelectionState {
  if (mode.type === "select") {
    return currentSelection;
  }
  return createEmptySelection();
}

/**
 * Get shape ID from shape if available
 */
function getShapeIdFromShape(shape: Shape): ShapeId | undefined {
  if ("nonVisual" in shape) {
    return shape.nonVisual.id;
  }
  return undefined;
}

/**
 * Get selection state for created shape
 */
function getSelectionForCreatedShape(
  shapeId: ShapeId | undefined,
  currentSelection: SelectionState
): SelectionState {
  if (shapeId) {
    return { selectedIds: [shapeId], primaryId: shapeId };
  }
  return currentSelection;
}

function handleSetCreationMode(
  state: PresentationEditorState,
  action: SetCreationModeAction
): PresentationEditorState {
  return {
    ...state,
    creationMode: action.mode,
    shapeSelection: getSelectionForModeChange(
      action.mode,
      state.shapeSelection
    ),
  };
}

function handleCreateShape(
  state: PresentationEditorState,
  action: CreateShapeAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: [...slide.shapes, action.shape],
    })
  );

  const shapeId = getShapeIdFromShape(action.shape);

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: getSelectionForCreatedShape(shapeId, state.shapeSelection),
    // Return to select mode after creating a shape
    creationMode: createSelectMode(),
  };
}

function handleAddPicture(
  state: PresentationEditorState,
  action: AddPictureAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const newId = generateShapeId(activeSlide.slide.shapes);
  const bounds: ShapeBounds = {
    x: action.x,
    y: action.y,
    width: action.width,
    height: action.height,
  };

  const picShape = createPicShape(newId, bounds, action.dataUrl);

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: [...slide.shapes, picShape],
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: {
      selectedIds: [newId],
      primaryId: newId,
    },
    creationMode: createSelectMode(),
  };
}

function handleAddChart(
  state: PresentationEditorState,
  action: AddChartAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const newId = generateShapeId(activeSlide.slide.shapes);
  const bounds: ShapeBounds = {
    x: action.x,
    y: action.y,
    width: action.width,
    height: action.height,
  };

  const chartShape = createChartGraphicFrame(newId, bounds, action.chartType);

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: [...slide.shapes, chartShape],
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: {
      selectedIds: [newId],
      primaryId: newId,
    },
    creationMode: createSelectMode(),
  };
}

function handleAddDiagram(
  state: PresentationEditorState,
  action: AddDiagramAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return state;
  }

  const newId = generateShapeId(activeSlide.slide.shapes);
  const bounds: ShapeBounds = {
    x: action.x,
    y: action.y,
    width: action.width,
    height: action.height,
  };

  const diagramShape = createDiagramGraphicFrame(
    newId,
    bounds,
    action.diagramType
  );

  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: [...slide.shapes, diagramShape],
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    shapeSelection: {
      selectedIds: [newId],
      primaryId: newId,
    },
    creationMode: createSelectMode(),
  };
}

/**
 * Creation handlers
 */
export const CREATION_HANDLERS: HandlerMap = {
  SET_CREATION_MODE: handleSetCreationMode,
  CREATE_SHAPE: handleCreateShape,
  ADD_PICTURE: handleAddPicture,
  ADD_CHART: handleAddChart,
  ADD_DIAGRAM: handleAddDiagram,
};
