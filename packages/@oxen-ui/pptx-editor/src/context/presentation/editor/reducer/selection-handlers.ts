/**
 * @file Selection handlers
 *
 * Handlers for shape selection operations.
 */

import type { ShapeId } from "@oxen/pptx/domain/types";
import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { HandlerMap } from "./handler-types";
import { exitTextEditIfActive, exitTextEditIfDifferentShape } from "./helpers";
import { createEmptySelection } from "../../../slide/state";

type SelectShapeAction = Extract<
  PresentationEditorAction,
  { type: "SELECT_SHAPE" }
>;
type SelectMultipleShapesAction = Extract<
  PresentationEditorAction,
  { type: "SELECT_MULTIPLE_SHAPES" }
>;
// Note: ClearShapeSelectionAction type not needed since handler doesn't use action payload

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

function handleSelectShape(
  state: PresentationEditorState,
  action: SelectShapeAction
): PresentationEditorState {
  const textEditState = exitTextEditIfDifferentShape(state, action.shapeId);
  const isAlreadySelected = state.shapeSelection.selectedIds.includes(
    action.shapeId
  );

  if (action.addToSelection) {
    // Toggle mode (Cmd/Ctrl+Click): deselect if already selected
    if (action.toggle && isAlreadySelected) {
      const newSelectedIds = state.shapeSelection.selectedIds.filter(
        (id) => id !== action.shapeId
      );
      const newPrimaryId = getPrimaryIdAfterDeselect(
        state.shapeSelection.primaryId,
        action.shapeId,
        newSelectedIds
      );
      return {
        ...state,
        textEdit: textEditState,
        shapeSelection: {
          selectedIds: newSelectedIds,
          primaryId: newPrimaryId,
        },
      };
    }
    // Add mode (Shift+Click): add only if not already selected
    if (isAlreadySelected) {
      // Already selected, just update primary
      return {
        ...state,
        textEdit: textEditState,
        shapeSelection: {
          ...state.shapeSelection,
          primaryId: action.shapeId,
        },
      };
    }
    // Add to selection
    return {
      ...state,
      textEdit: textEditState,
      shapeSelection: {
        selectedIds: [...state.shapeSelection.selectedIds, action.shapeId],
        primaryId: action.shapeId,
      },
    };
  }
  // Replace selection
  return {
    ...state,
    textEdit: textEditState,
    shapeSelection: {
      selectedIds: [action.shapeId],
      primaryId: action.shapeId,
    },
  };
}

function handleSelectMultipleShapes(
  state: PresentationEditorState,
  action: SelectMultipleShapesAction
): PresentationEditorState {
  return {
    ...state,
    textEdit: exitTextEditIfActive(state),
    shapeSelection: {
      selectedIds: action.shapeIds,
      primaryId: action.primaryId ?? action.shapeIds[0],
    },
  };
}

function handleClearShapeSelection(
  state: PresentationEditorState
): PresentationEditorState {
  return {
    ...state,
    textEdit: exitTextEditIfActive(state),
    shapeSelection: createEmptySelection(),
  };
}

/**
 * Selection handlers
 */
export const SELECTION_HANDLERS: HandlerMap = {
  SELECT_SHAPE: handleSelectShape,
  SELECT_MULTIPLE_SHAPES: handleSelectMultipleShapes,
  CLEAR_SHAPE_SELECTION: handleClearShapeSelection,
};
