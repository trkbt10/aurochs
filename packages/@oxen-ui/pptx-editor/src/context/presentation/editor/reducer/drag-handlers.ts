/**
 * @file Drag operation handlers
 *
 * Handlers for drag operations: start, preview, commit, end.
 */

import type { Slide, Shape } from "@oxen/pptx/domain";
import type { Degrees } from "@oxen/ooxml/domain/units";
import { px, deg } from "@oxen/ooxml/domain/units";
import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { HandlerMap } from "./handler-types";
import { getActiveSlide, updateActiveSlideInDocument } from "./helpers";
import { pushHistory, createIdleDragState } from "../../../slide/state";
import { findShapeById } from "../../../../shape/query";
import { updateShapeById } from "../../../../shape/mutation";
import {
  getCombinedBounds,
  collectBoundsForIds,
  getCombinedCenter,
} from "../../../../shape/bounds";
import { withUpdatedTransform } from "../../../../shape/transform";
import { getShapeTransform } from "@oxen/pptx-render/svg";

type StartMoveAction = Extract<
  PresentationEditorAction,
  { type: "START_MOVE" }
>;
type StartResizeAction = Extract<
  PresentationEditorAction,
  { type: "START_RESIZE" }
>;
type StartRotateAction = Extract<
  PresentationEditorAction,
  { type: "START_ROTATE" }
>;
// Note: EndDragAction type not needed since handler doesn't use action payload
type PreviewMoveAction = Extract<
  PresentationEditorAction,
  { type: "PREVIEW_MOVE" }
>;
type PreviewResizeAction = Extract<
  PresentationEditorAction,
  { type: "PREVIEW_RESIZE" }
>;
type PreviewRotateAction = Extract<
  PresentationEditorAction,
  { type: "PREVIEW_ROTATE" }
>;
// Note: CommitDragAction type not needed since handler doesn't use action payload

/**
 * Get transform for primary shape (if shape exists)
 */
function getPrimaryTransform(
  shape: Shape | undefined
): ReturnType<typeof getShapeTransform> {
  if (!shape) {
    return undefined;
  }
  return getShapeTransform(shape);
}

function handleStartMove(
  state: PresentationEditorState,
  action: StartMoveAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
    return state;
  }

  const initialBounds = collectBoundsForIds(
    activeSlide.slide.shapes,
    state.shapeSelection.selectedIds
  );

  return {
    ...state,
    drag: {
      type: "move",
      startX: action.startX,
      startY: action.startY,
      shapeIds: state.shapeSelection.selectedIds,
      initialBounds,
      previewDelta: { dx: px(0), dy: px(0) },
    },
  };
}

function handleStartResize(
  state: PresentationEditorState,
  action: StartResizeAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
    return state;
  }

  const selectedIds = state.shapeSelection.selectedIds;
  const initialBoundsMap = collectBoundsForIds(
    activeSlide.slide.shapes,
    selectedIds
  );
  const combinedBounds = getCombinedBounds(
    selectedIds
      .map((id) => findShapeById(activeSlide.slide.shapes, id))
      .filter((s): s is Shape => s !== undefined)
  );

  if (!combinedBounds) {
    return state;
  }

  const primaryId = state.shapeSelection.primaryId ?? selectedIds[0];
  const primaryBounds = initialBoundsMap.get(primaryId);

  return {
    ...state,
    drag: {
      type: "resize",
      handle: action.handle,
      startX: action.startX,
      startY: action.startY,
      shapeIds: selectedIds,
      initialBoundsMap,
      combinedBounds,
      aspectLocked: action.aspectLocked,
      shapeId: primaryId,
      initialBounds: primaryBounds ?? combinedBounds,
      previewDelta: { dx: px(0), dy: px(0) },
    },
  };
}

function handleStartRotate(
  state: PresentationEditorState,
  action: StartRotateAction
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
    return state;
  }

  const selectedIds = state.shapeSelection.selectedIds;
  const initialBoundsMap = collectBoundsForIds(
    activeSlide.slide.shapes,
    selectedIds
  );
  const centerResult = getCombinedCenter(initialBoundsMap);

  if (!centerResult) {
    return state;
  }

  const initialRotationsMap = new Map<string, Degrees>();
  for (const id of selectedIds) {
    const shape = findShapeById(activeSlide.slide.shapes, id);
    if (shape) {
      const transform = getShapeTransform(shape);
      initialRotationsMap.set(id, transform?.rotation ?? deg(0));
    }
  }

  const primaryId = state.shapeSelection.primaryId ?? selectedIds[0];
  const primaryShape = findShapeById(activeSlide.slide.shapes, primaryId);
  const primaryTransform = getPrimaryTransform(primaryShape);

  // Calculate start angle from mouse position relative to center
  const dxAngle = (action.startX as number) - centerResult.centerX;
  const dyAngle = (action.startY as number) - centerResult.centerY;
  const startAngle = deg(Math.atan2(dyAngle, dxAngle) * (180 / Math.PI));

  return {
    ...state,
    drag: {
      type: "rotate",
      startAngle,
      shapeIds: selectedIds,
      initialRotationsMap,
      initialBoundsMap,
      centerX: px(centerResult.centerX),
      centerY: px(centerResult.centerY),
      shapeId: primaryId,
      initialRotation: primaryTransform?.rotation ?? deg(0),
      previewAngleDelta: deg(0),
    },
  };
}

function handleEndDrag(
  state: PresentationEditorState
): PresentationEditorState {
  return {
    ...state,
    drag: createIdleDragState(),
  };
}

function handlePreviewMove(
  state: PresentationEditorState,
  action: PreviewMoveAction
): PresentationEditorState {
  if (state.drag.type !== "move") {
    return state;
  }
  return {
    ...state,
    drag: {
      ...state.drag,
      previewDelta: { dx: action.dx, dy: action.dy },
    },
  };
}

function handlePreviewResize(
  state: PresentationEditorState,
  action: PreviewResizeAction
): PresentationEditorState {
  if (state.drag.type !== "resize") {
    return state;
  }
  return {
    ...state,
    drag: {
      ...state.drag,
      previewDelta: { dx: action.dx, dy: action.dy },
    },
  };
}

function handlePreviewRotate(
  state: PresentationEditorState,
  action: PreviewRotateAction
): PresentationEditorState {
  if (state.drag.type !== "rotate") {
    return state;
  }
  const angleDelta = deg(
    (action.currentAngle as number) - (state.drag.startAngle as number)
  );
  return {
    ...state,
    drag: {
      ...state.drag,
      previewAngleDelta: angleDelta,
    },
  };
}

/**
 * Apply move commit to shapes
 */
function applyMoveCommit(
  state: PresentationEditorState
): PresentationEditorState {
  if (state.drag.type !== "move") {
    return state;
  }

  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return { ...state, drag: createIdleDragState() };
  }

  const dxVal = state.drag.previewDelta.dx as number;
  const dyVal = state.drag.previewDelta.dy as number;

  // Skip if no actual movement
  if (dxVal === 0 && dyVal === 0) {
    return { ...state, drag: createIdleDragState() };
  }

  const { shapeIds, initialBounds } = state.drag;
  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern for sequential shape updates
  let newShapes = activeSlide.slide.shapes;

  for (const shapeId of shapeIds) {
    const initial = initialBounds.get(shapeId);
    if (!initial) {
      continue;
    }

    newShapes = updateShapeById(newShapes, shapeId, (shape) =>
      withUpdatedTransform(shape, {
        x: px(initial.x + dxVal),
        y: px(initial.y + dyVal),
      })
    );
  }

  const newSlide: Slide = { ...activeSlide.slide, shapes: newShapes };
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    () => newSlide
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    drag: createIdleDragState(),
  };
}

/**
 * Apply resize commit to shapes
 */
function applyResizeCommit(
  state: PresentationEditorState
): PresentationEditorState {
  if (state.drag.type !== "resize") {
    return state;
  }

  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return { ...state, drag: createIdleDragState() };
  }

  const dxVal = state.drag.previewDelta.dx as number;
  const dyVal = state.drag.previewDelta.dy as number;

  // Skip if no actual resize
  if (dxVal === 0 && dyVal === 0) {
    return { ...state, drag: createIdleDragState() };
  }

  const { handle, initialBoundsMap, combinedBounds, aspectLocked, shapeIds } =
    state.drag;
  const baseX = combinedBounds.x as number;
  const baseY = combinedBounds.y as number;
  const baseWidth = combinedBounds.width as number;
  const baseHeight = combinedBounds.height as number;

  // eslint-disable-next-line no-restricted-syntax -- mutable bounds calculation
  let newWidth = baseWidth;
  // eslint-disable-next-line no-restricted-syntax -- mutable bounds calculation
  let newHeight = baseHeight;
  // eslint-disable-next-line no-restricted-syntax -- mutable bounds calculation
  let newX = baseX;
  // eslint-disable-next-line no-restricted-syntax -- mutable bounds calculation
  let newY = baseY;

  // Calculate new bounds based on handle
  if (handle.includes("e")) {
    newWidth = baseWidth + dxVal;
  }
  if (handle.includes("w")) {
    newWidth = baseWidth - dxVal;
    newX = baseX + dxVal;
  }
  if (handle.includes("s")) {
    newHeight = baseHeight + dyVal;
  }
  if (handle.includes("n")) {
    newHeight = baseHeight - dyVal;
    newY = baseY + dyVal;
  }

  // Ensure minimum size
  const minSize = 10;
  if (newWidth < minSize) {
    if (handle.includes("w")) {
      newX = baseX + baseWidth - minSize;
    }
    newWidth = minSize;
  }
  if (newHeight < minSize) {
    if (handle.includes("n")) {
      newY = baseY + baseHeight - minSize;
    }
    newHeight = minSize;
  }

  // Apply aspect ratio lock if needed
  if (aspectLocked && baseWidth > 0 && baseHeight > 0) {
    const aspectRatio = baseWidth / baseHeight;
    if (handle === "n" || handle === "s") {
      newWidth = newHeight * aspectRatio;
    } else if (handle === "e" || handle === "w") {
      newHeight = newWidth / aspectRatio;
    } else {
      // Corner handles: use the larger delta
      const widthRatio = newWidth / baseWidth;
      const heightRatio = newHeight / baseHeight;
      if (widthRatio > heightRatio) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }
    }
  }

  // Calculate scale factors
  const scaleX = baseWidth > 0 ? newWidth / baseWidth : 1;
  const scaleY = baseHeight > 0 ? newHeight / baseHeight : 1;

  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern for sequential shape updates
  let newShapes = activeSlide.slide.shapes;

  // Apply to each shape
  for (const shapeId of shapeIds) {
    const initial = initialBoundsMap.get(shapeId);
    if (!initial) {
      continue;
    }

    const relX = (initial.x as number) - baseX;
    const relY = (initial.y as number) - baseY;
    const shapeNewX = newX + relX * scaleX;
    const shapeNewY = newY + relY * scaleY;
    const shapeNewWidth = (initial.width as number) * scaleX;
    const shapeNewHeight = (initial.height as number) * scaleY;

    newShapes = updateShapeById(newShapes, shapeId, (shape) =>
      withUpdatedTransform(shape, {
        x: px(shapeNewX),
        y: px(shapeNewY),
        width: px(shapeNewWidth),
        height: px(shapeNewHeight),
      })
    );
  }

  const newSlide: Slide = { ...activeSlide.slide, shapes: newShapes };
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    () => newSlide
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    drag: createIdleDragState(),
  };
}

/**
 * Apply rotate commit to shapes
 */
function applyRotateCommit(
  state: PresentationEditorState
): PresentationEditorState {
  if (state.drag.type !== "rotate") {
    return state;
  }

  const activeSlide = getActiveSlide(state);
  if (!activeSlide) {
    return { ...state, drag: createIdleDragState() };
  }

  const angleDeltaVal = state.drag.previewAngleDelta as number;

  // Skip if no actual rotation
  if (angleDeltaVal === 0) {
    return { ...state, drag: createIdleDragState() };
  }

  const { shapeIds, initialRotationsMap } = state.drag;
  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern for sequential shape updates
  let newShapes = activeSlide.slide.shapes;

  for (const shapeId of shapeIds) {
    const initialRotation = initialRotationsMap.get(shapeId);
    if (initialRotation === undefined) {
      continue;
    }

    // eslint-disable-next-line no-restricted-syntax -- rotation normalization
    let newRotation = ((initialRotation as number) + angleDeltaVal) % 360;
    if (newRotation < 0) {
      newRotation += 360;
    }

    newShapes = updateShapeById(newShapes, shapeId, (shape) =>
      withUpdatedTransform(shape, {
        rotation: deg(newRotation),
      })
    );
  }

  const newSlide: Slide = { ...activeSlide.slide, shapes: newShapes };
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    () => newSlide
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    drag: createIdleDragState(),
  };
}

function handleCommitDrag(
  state: PresentationEditorState
): PresentationEditorState {
  const { drag } = state;
  if (drag.type === "idle" || drag.type === "create") {
    return state;
  }

  switch (drag.type) {
    case "move":
      return applyMoveCommit(state);
    case "resize":
      return applyResizeCommit(state);
    case "rotate":
      return applyRotateCommit(state);
    default:
      return state;
  }
}

/**
 * Drag operation handlers
 */
export const DRAG_HANDLERS: HandlerMap = {
  START_MOVE: handleStartMove,
  START_RESIZE: handleStartResize,
  START_ROTATE: handleStartRotate,
  END_DRAG: handleEndDrag,
  PREVIEW_MOVE: handlePreviewMove,
  PREVIEW_RESIZE: handlePreviewResize,
  PREVIEW_ROTATE: handlePreviewRotate,
  COMMIT_DRAG: handleCommitDrag,
};
