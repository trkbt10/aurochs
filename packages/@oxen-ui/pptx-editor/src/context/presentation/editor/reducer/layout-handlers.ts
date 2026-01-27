/**
 * @file Layout editing handlers
 *
 * Handlers for layout shape editing operations.
 * These operate on the layoutEdit state, which is separate from slide editing.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { Degrees } from "@oxen/ooxml/domain/units";
import { px, deg } from "@oxen/ooxml/domain/units";
import type {
  PresentationEditorState,
  PresentationEditorAction,
  LayoutEditState,
} from "../types";
import type { HandlerMap } from "./handler-types";
import {
  createEmptySelection,
  createIdleDragState,
} from "../../../slide/state";
import { findShapeById } from "../../../../shape/query";
import { updateShapeById } from "../../../../shape/mutation";
import {
  collectBoundsForIds,
  getCombinedBounds,
  getCombinedCenter,
} from "../../../../shape/bounds";
import { withUpdatedTransform } from "../../../../shape/transform";
import { getShapeTransform } from "@oxen/pptx-render/svg";

// =============================================================================
// Action Types
// =============================================================================

type SelectLayoutAction = Extract<
  PresentationEditorAction,
  { type: "SELECT_LAYOUT" }
>;
type LoadLayoutShapesAction = Extract<
  PresentationEditorAction,
  { type: "LOAD_LAYOUT_SHAPES" }
>;
type SelectLayoutShapeAction = Extract<
  PresentationEditorAction,
  { type: "SELECT_LAYOUT_SHAPE" }
>;
type SelectMultipleLayoutShapesAction = Extract<
  PresentationEditorAction,
  { type: "SELECT_MULTIPLE_LAYOUT_SHAPES" }
>;
type StartLayoutMoveAction = Extract<
  PresentationEditorAction,
  { type: "START_LAYOUT_MOVE" }
>;
type StartLayoutResizeAction = Extract<
  PresentationEditorAction,
  { type: "START_LAYOUT_RESIZE" }
>;
type StartLayoutRotateAction = Extract<
  PresentationEditorAction,
  { type: "START_LAYOUT_ROTATE" }
>;
type PreviewLayoutMoveAction = Extract<
  PresentationEditorAction,
  { type: "PREVIEW_LAYOUT_MOVE" }
>;
type PreviewLayoutResizeAction = Extract<
  PresentationEditorAction,
  { type: "PREVIEW_LAYOUT_RESIZE" }
>;
type PreviewLayoutRotateAction = Extract<
  PresentationEditorAction,
  { type: "PREVIEW_LAYOUT_ROTATE" }
>;
type DeleteLayoutShapesAction = Extract<
  PresentationEditorAction,
  { type: "DELETE_LAYOUT_SHAPES" }
>;
type AddLayoutShapeAction = Extract<
  PresentationEditorAction,
  { type: "ADD_LAYOUT_SHAPE" }
>;
type UpdateLayoutShapeAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_LAYOUT_SHAPE" }
>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create initial layout edit state
 */
export function createInitialLayoutEditState(): LayoutEditState {
  return {
    activeLayoutPath: undefined,
    layoutShapes: [],
    layoutBundle: undefined,
    layoutSelection: createEmptySelection(),
    layoutDrag: createIdleDragState(),
    isDirty: false,
  };
}

/**
 * Update layoutEdit state
 */
function updateLayoutEdit(
  state: PresentationEditorState,
  updates: Partial<LayoutEditState>
): PresentationEditorState {
  return {
    ...state,
    layoutEdit: {
      ...state.layoutEdit,
      ...updates,
    },
  };
}

/**
 * Get primary ID after deselection
 */
function getPrimaryIdAfterDeselect(
  currentPrimaryId: ShapeId | undefined,
  deselectedId: ShapeId,
  remainingIds: readonly ShapeId[]
): ShapeId | undefined {
  if (currentPrimaryId !== deselectedId) {
    return currentPrimaryId;
  }
  return remainingIds[0];
}

// =============================================================================
// Layout Selection Handlers
// =============================================================================

function handleSelectLayout(
  state: PresentationEditorState,
  action: SelectLayoutAction
): PresentationEditorState {
  return updateLayoutEdit(state, {
    activeLayoutPath: action.layoutPath,
    layoutShapes: [],
    layoutBundle: undefined,
    layoutSelection: createEmptySelection(),
    layoutDrag: createIdleDragState(),
    isDirty: false,
  });
}

function handleLoadLayoutShapes(
  state: PresentationEditorState,
  action: LoadLayoutShapesAction
): PresentationEditorState {
  // Ignore if layout path doesn't match (stale load)
  if (state.layoutEdit.activeLayoutPath !== action.layoutPath) {
    return state;
  }
  return updateLayoutEdit(state, {
    layoutShapes: action.shapes,
    layoutBundle: action.bundle,
    isDirty: false,
  });
}

// =============================================================================
// Layout Shape Selection Handlers
// =============================================================================

function handleSelectLayoutShape(
  state: PresentationEditorState,
  action: SelectLayoutShapeAction
): PresentationEditorState {
  const { layoutSelection } = state.layoutEdit;
  const isAlreadySelected = layoutSelection.selectedIds.includes(action.shapeId);

  if (action.addToSelection) {
    // Toggle mode: deselect if already selected
    if (action.toggle && isAlreadySelected) {
      const newSelectedIds = layoutSelection.selectedIds.filter(
        (id) => id !== action.shapeId
      );
      const newPrimaryId = getPrimaryIdAfterDeselect(
        layoutSelection.primaryId,
        action.shapeId,
        newSelectedIds
      );
      return updateLayoutEdit(state, {
        layoutSelection: {
          selectedIds: newSelectedIds,
          primaryId: newPrimaryId,
        },
      });
    }
    // Add mode: add only if not already selected
    if (isAlreadySelected) {
      return updateLayoutEdit(state, {
        layoutSelection: {
          ...layoutSelection,
          primaryId: action.shapeId,
        },
      });
    }
    return updateLayoutEdit(state, {
      layoutSelection: {
        selectedIds: [...layoutSelection.selectedIds, action.shapeId],
        primaryId: action.shapeId,
      },
    });
  }
  // Replace selection
  return updateLayoutEdit(state, {
    layoutSelection: {
      selectedIds: [action.shapeId],
      primaryId: action.shapeId,
    },
  });
}

function handleSelectMultipleLayoutShapes(
  state: PresentationEditorState,
  action: SelectMultipleLayoutShapesAction
): PresentationEditorState {
  return updateLayoutEdit(state, {
    layoutSelection: {
      selectedIds: action.shapeIds,
      primaryId: action.primaryId ?? action.shapeIds[0],
    },
  });
}

function handleClearLayoutShapeSelection(
  state: PresentationEditorState
): PresentationEditorState {
  return updateLayoutEdit(state, {
    layoutSelection: createEmptySelection(),
  });
}

// =============================================================================
// Layout Drag Start Handlers
// =============================================================================

function handleStartLayoutMove(
  state: PresentationEditorState,
  action: StartLayoutMoveAction
): PresentationEditorState {
  const { layoutShapes, layoutSelection } = state.layoutEdit;
  if (layoutSelection.selectedIds.length === 0) {
    return state;
  }

  const initialBounds = collectBoundsForIds(
    layoutShapes as Shape[],
    layoutSelection.selectedIds
  );

  return updateLayoutEdit(state, {
    layoutDrag: {
      type: "move",
      startX: action.startX,
      startY: action.startY,
      shapeIds: layoutSelection.selectedIds,
      initialBounds,
      previewDelta: { dx: px(0), dy: px(0) },
    },
  });
}

function handleStartLayoutResize(
  state: PresentationEditorState,
  action: StartLayoutResizeAction
): PresentationEditorState {
  const { layoutShapes, layoutSelection } = state.layoutEdit;
  const selectedIds = layoutSelection.selectedIds;
  if (selectedIds.length === 0) {
    return state;
  }

  const initialBoundsMap = collectBoundsForIds(
    layoutShapes as Shape[],
    selectedIds
  );
  const combinedBounds = getCombinedBounds(
    selectedIds
      .map((id) => findShapeById(layoutShapes as Shape[], id))
      .filter((s): s is Shape => s !== undefined)
  );

  if (!combinedBounds) {
    return state;
  }

  const primaryId = layoutSelection.primaryId ?? selectedIds[0];
  const primaryBounds = initialBoundsMap.get(primaryId);

  return updateLayoutEdit(state, {
    layoutDrag: {
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
  });
}

function handleStartLayoutRotate(
  state: PresentationEditorState,
  action: StartLayoutRotateAction
): PresentationEditorState {
  const { layoutShapes, layoutSelection } = state.layoutEdit;
  const selectedIds = layoutSelection.selectedIds;
  if (selectedIds.length === 0) {
    return state;
  }

  const initialBoundsMap = collectBoundsForIds(
    layoutShapes as Shape[],
    selectedIds
  );
  const centerResult = getCombinedCenter(initialBoundsMap);

  if (!centerResult) {
    return state;
  }

  const initialRotationsMap = new Map<string, Degrees>();
  for (const id of selectedIds) {
    const shape = findShapeById(layoutShapes as Shape[], id);
    if (shape) {
      const transform = getShapeTransform(shape);
      initialRotationsMap.set(id, transform?.rotation ?? deg(0));
    }
  }

  const primaryId = layoutSelection.primaryId ?? selectedIds[0];
  const primaryShape = findShapeById(layoutShapes as Shape[], primaryId);
  const primaryTransform = primaryShape ? getShapeTransform(primaryShape) : undefined;

  const dxAngle = (action.startX as number) - centerResult.centerX;
  const dyAngle = (action.startY as number) - centerResult.centerY;
  const startAngle = deg(Math.atan2(dyAngle, dxAngle) * (180 / Math.PI));

  return updateLayoutEdit(state, {
    layoutDrag: {
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
  });
}

// =============================================================================
// Layout Drag Preview Handlers
// =============================================================================

function handlePreviewLayoutMove(
  state: PresentationEditorState,
  action: PreviewLayoutMoveAction
): PresentationEditorState {
  if (state.layoutEdit.layoutDrag.type !== "move") {
    return state;
  }
  return updateLayoutEdit(state, {
    layoutDrag: {
      ...state.layoutEdit.layoutDrag,
      previewDelta: { dx: action.dx, dy: action.dy },
    },
  });
}

function handlePreviewLayoutResize(
  state: PresentationEditorState,
  action: PreviewLayoutResizeAction
): PresentationEditorState {
  if (state.layoutEdit.layoutDrag.type !== "resize") {
    return state;
  }
  return updateLayoutEdit(state, {
    layoutDrag: {
      ...state.layoutEdit.layoutDrag,
      previewDelta: { dx: action.dx, dy: action.dy },
    },
  });
}

function handlePreviewLayoutRotate(
  state: PresentationEditorState,
  action: PreviewLayoutRotateAction
): PresentationEditorState {
  if (state.layoutEdit.layoutDrag.type !== "rotate") {
    return state;
  }
  const angleDelta = deg(
    (action.currentAngle as number) - (state.layoutEdit.layoutDrag.startAngle as number)
  );
  return updateLayoutEdit(state, {
    layoutDrag: {
      ...state.layoutEdit.layoutDrag,
      previewAngleDelta: angleDelta,
    },
  });
}

// =============================================================================
// Layout Drag Commit Handlers
// =============================================================================

function applyLayoutMoveCommit(
  state: PresentationEditorState
): PresentationEditorState {
  const { layoutDrag, layoutShapes } = state.layoutEdit;
  if (layoutDrag.type !== "move") {
    return state;
  }

  const dxVal = layoutDrag.previewDelta.dx as number;
  const dyVal = layoutDrag.previewDelta.dy as number;

  if (dxVal === 0 && dyVal === 0) {
    return updateLayoutEdit(state, { layoutDrag: createIdleDragState() });
  }

  const { shapeIds, initialBounds } = layoutDrag;
  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
  let newShapes: readonly Shape[] = layoutShapes;

  for (const shapeId of shapeIds) {
    const initial = initialBounds.get(shapeId);
    if (!initial) {
      continue;
    }
    newShapes = updateShapeById([...newShapes], shapeId, (shape) =>
      withUpdatedTransform(shape, {
        x: px(initial.x + dxVal),
        y: px(initial.y + dyVal),
      })
    );
  }

  return updateLayoutEdit(state, {
    layoutShapes: newShapes as readonly Shape[],
    layoutDrag: createIdleDragState(),
    isDirty: true,
  });
}

function applyLayoutResizeCommit(
  state: PresentationEditorState
): PresentationEditorState {
  const { layoutDrag, layoutShapes } = state.layoutEdit;
  if (layoutDrag.type !== "resize") {
    return state;
  }

  const dxVal = layoutDrag.previewDelta.dx as number;
  const dyVal = layoutDrag.previewDelta.dy as number;

  if (dxVal === 0 && dyVal === 0) {
    return updateLayoutEdit(state, { layoutDrag: createIdleDragState() });
  }

  const { handle, initialBoundsMap, combinedBounds, aspectLocked, shapeIds } = layoutDrag;
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

  if (aspectLocked && baseWidth > 0 && baseHeight > 0) {
    const aspectRatio = baseWidth / baseHeight;
    if (handle === "n" || handle === "s") {
      newWidth = newHeight * aspectRatio;
    } else if (handle === "e" || handle === "w") {
      newHeight = newWidth / aspectRatio;
    } else {
      const widthRatio = newWidth / baseWidth;
      const heightRatio = newHeight / baseHeight;
      if (widthRatio > heightRatio) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }
    }
  }

  const scaleX = baseWidth > 0 ? newWidth / baseWidth : 1;
  const scaleY = baseHeight > 0 ? newHeight / baseHeight : 1;

  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
  let newShapes: readonly Shape[] = layoutShapes;

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

    newShapes = updateShapeById([...newShapes], shapeId, (shape) =>
      withUpdatedTransform(shape, {
        x: px(shapeNewX),
        y: px(shapeNewY),
        width: px(shapeNewWidth),
        height: px(shapeNewHeight),
      })
    );
  }

  return updateLayoutEdit(state, {
    layoutShapes: newShapes as readonly Shape[],
    layoutDrag: createIdleDragState(),
    isDirty: true,
  });
}

function applyLayoutRotateCommit(
  state: PresentationEditorState
): PresentationEditorState {
  const { layoutDrag, layoutShapes } = state.layoutEdit;
  if (layoutDrag.type !== "rotate") {
    return state;
  }

  const angleDeltaVal = layoutDrag.previewAngleDelta as number;
  if (angleDeltaVal === 0) {
    return updateLayoutEdit(state, { layoutDrag: createIdleDragState() });
  }

  const { shapeIds, initialRotationsMap } = layoutDrag;
  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern
  let newShapes: readonly Shape[] = layoutShapes;

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
    newShapes = updateShapeById([...newShapes], shapeId, (shape) =>
      withUpdatedTransform(shape, {
        rotation: deg(newRotation),
      })
    );
  }

  return updateLayoutEdit(state, {
    layoutShapes: newShapes as readonly Shape[],
    layoutDrag: createIdleDragState(),
    isDirty: true,
  });
}

function handleCommitLayoutDrag(
  state: PresentationEditorState
): PresentationEditorState {
  const { layoutDrag } = state.layoutEdit;
  if (layoutDrag.type === "idle" || layoutDrag.type === "create") {
    return state;
  }

  switch (layoutDrag.type) {
    case "move":
      return applyLayoutMoveCommit(state);
    case "resize":
      return applyLayoutResizeCommit(state);
    case "rotate":
      return applyLayoutRotateCommit(state);
    default:
      return state;
  }
}

function handleEndLayoutDrag(
  state: PresentationEditorState
): PresentationEditorState {
  return updateLayoutEdit(state, {
    layoutDrag: createIdleDragState(),
  });
}

// =============================================================================
// Layout Shape Mutation Handlers
// =============================================================================

function handleDeleteLayoutShapes(
  state: PresentationEditorState,
  action: DeleteLayoutShapesAction
): PresentationEditorState {
  const { layoutShapes } = state.layoutEdit;
  const idsToDelete = new Set(action.shapeIds);

  const newShapes = (layoutShapes as Shape[]).filter((shape) => {
    if (shape.type === "contentPart") {
      return true;
    }
    return !idsToDelete.has(shape.nonVisual.id);
  });

  return updateLayoutEdit(state, {
    layoutShapes: newShapes,
    layoutSelection: createEmptySelection(),
    isDirty: true,
  });
}

function handleAddLayoutShape(
  state: PresentationEditorState,
  action: AddLayoutShapeAction
): PresentationEditorState {
  const { layoutShapes } = state.layoutEdit;
  const newShapes = [...(layoutShapes as Shape[]), action.shape];

  const shapeId = action.shape.type !== "contentPart" ? action.shape.nonVisual.id : undefined;

  const newSelection = shapeId ? { selectedIds: [shapeId], primaryId: shapeId } : state.layoutEdit.layoutSelection;
  return updateLayoutEdit(state, {
    layoutShapes: newShapes,
    layoutSelection: newSelection,
    isDirty: true,
  });
}

function handleUpdateLayoutShape(
  state: PresentationEditorState,
  action: UpdateLayoutShapeAction
): PresentationEditorState {
  const { layoutShapes } = state.layoutEdit;
  const newShapes = updateShapeById(
    layoutShapes as Shape[],
    action.shapeId,
    action.updater
  );

  return updateLayoutEdit(state, {
    layoutShapes: newShapes,
    isDirty: true,
  });
}

// =============================================================================
// Export Handler Map
// =============================================================================

/**
 * Layout editing handlers
 */
export const LAYOUT_HANDLERS: HandlerMap = {
  SELECT_LAYOUT: handleSelectLayout,
  LOAD_LAYOUT_SHAPES: handleLoadLayoutShapes,
  SELECT_LAYOUT_SHAPE: handleSelectLayoutShape,
  SELECT_MULTIPLE_LAYOUT_SHAPES: handleSelectMultipleLayoutShapes,
  CLEAR_LAYOUT_SHAPE_SELECTION: handleClearLayoutShapeSelection,
  START_LAYOUT_MOVE: handleStartLayoutMove,
  START_LAYOUT_RESIZE: handleStartLayoutResize,
  START_LAYOUT_ROTATE: handleStartLayoutRotate,
  PREVIEW_LAYOUT_MOVE: handlePreviewLayoutMove,
  PREVIEW_LAYOUT_RESIZE: handlePreviewLayoutResize,
  PREVIEW_LAYOUT_ROTATE: handlePreviewLayoutRotate,
  COMMIT_LAYOUT_DRAG: handleCommitLayoutDrag,
  END_LAYOUT_DRAG: handleEndLayoutDrag,
  DELETE_LAYOUT_SHAPES: handleDeleteLayoutShapes,
  ADD_LAYOUT_SHAPE: handleAddLayoutShape,
  UPDATE_LAYOUT_SHAPE: handleUpdateLayoutShape,
};
