/**
 * @file Context menu actions hook
 *
 * Builds the context menu actions object for the slide canvas.
 */

import { useMemo, useCallback } from "react";
import type { Slide, Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";
import type { ContextMenuActions } from "../../slide/context-menu/SlideContextMenu";
import type { SelectionState } from "../../context/slide/state";
import type { PresentationEditorState } from "../../context/presentation/editor/types";
import type { PresentationEditorAction } from "../../context/presentation/editor/types";
import { isTopLevelShape } from "../../shape/query";
import { withUpdatedTransform } from "../../shape/transform";
import { calculateAlignedBounds } from "../../shape/alignment";

export type UseContextMenuActionsParams = {
  readonly dispatch: (action: PresentationEditorAction) => void;
  readonly selection: SelectionState;
  readonly slide: Slide | undefined;
  readonly primaryShape: Shape | undefined;
  readonly clipboard: PresentationEditorState["clipboard"];
};

export type UseContextMenuActionsResult = {
  readonly contextMenuActions: ContextMenuActions;
  readonly canGroup: boolean;
  readonly canUngroup: boolean;
};

type AlignmentType = "left" | "center" | "right" | "top" | "middle" | "bottom" | "distributeH" | "distributeV";

function computeCanGroup(slide: Slide | undefined, selectedIds: readonly ShapeId[]): boolean {
  if (!slide || selectedIds.length < 2) {
    return false;
  }
  return selectedIds.every((id) => isTopLevelShape(slide.shapes, id));
}

/**
 * Hook for building context menu actions.
 */
export function useContextMenuActions({
  dispatch,
  selection,
  slide,
  primaryShape,
  clipboard,
}: UseContextMenuActionsParams): UseContextMenuActionsResult {
  const canGroup = useMemo(() => computeCanGroup(slide, selection.selectedIds), [selection.selectedIds, slide]);

  const canUngroup = selection.selectedIds.length === 1 && primaryShape?.type === "grpSp";
  const hasSelection = selection.selectedIds.length > 0;
  const isMultiSelect = selection.selectedIds.length > 1;
  const canAlign = selection.selectedIds.length >= 2;
  const canDistribute = selection.selectedIds.length >= 3;
  const hasClipboard = clipboard !== undefined && clipboard.shapes.length > 0;

  const applyAlignment = useCallback(
    (alignment: AlignmentType): void => {
      if (!slide || selection.selectedIds.length < 2) {
        return;
      }

      const alignedBounds = calculateAlignedBounds(slide.shapes, selection.selectedIds, alignment);

      for (const [shapeId, bounds] of alignedBounds) {
        dispatch({
          type: "UPDATE_SHAPE",
          shapeId,
          updater: (shape) =>
            withUpdatedTransform(shape, {
              x: px(bounds.x),
              y: px(bounds.y),
            }),
        });
      }
    },
    [dispatch, selection.selectedIds, slide],
  );

  const contextMenuActions = useMemo<ContextMenuActions>(
    () => ({
      hasSelection,
      hasClipboard,
      isMultiSelect,
      canGroup,
      canUngroup,
      canAlign,
      canDistribute,
      copy: () => dispatch({ type: "COPY" }),
      cut: () => {
        dispatch({ type: "COPY" });
        dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds });
      },
      paste: () => dispatch({ type: "PASTE" }),
      duplicateSelected: () => {
        dispatch({ type: "COPY" });
        dispatch({ type: "PASTE" });
      },
      deleteSelected: () => dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds }),
      bringToFront: () => {
        if (selection.primaryId) {
          dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "front" });
        }
      },
      bringForward: () => {
        if (selection.primaryId) {
          dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "forward" });
        }
      },
      sendBackward: () => {
        if (selection.primaryId) {
          dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "backward" });
        }
      },
      sendToBack: () => {
        if (selection.primaryId) {
          dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "back" });
        }
      },
      group: () => {
        if (canGroup) {
          dispatch({ type: "GROUP_SHAPES", shapeIds: selection.selectedIds });
        }
      },
      ungroup: () => {
        if (canUngroup && selection.primaryId) {
          dispatch({ type: "UNGROUP_SHAPE", shapeId: selection.primaryId });
        }
      },
      alignLeft: () => applyAlignment("left"),
      alignCenter: () => applyAlignment("center"),
      alignRight: () => applyAlignment("right"),
      alignTop: () => applyAlignment("top"),
      alignMiddle: () => applyAlignment("middle"),
      alignBottom: () => applyAlignment("bottom"),
      distributeHorizontally: () => applyAlignment("distributeH"),
      distributeVertically: () => applyAlignment("distributeV"),
    }),
    [
      dispatch,
      selection,
      canGroup,
      canUngroup,
      hasSelection,
      hasClipboard,
      isMultiSelect,
      canAlign,
      canDistribute,
      applyAlignment,
    ],
  );

  return { contextMenuActions, canGroup, canUngroup };
}
