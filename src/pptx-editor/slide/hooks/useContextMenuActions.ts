/**
 * @file Context menu actions hook
 *
 * Unified hook for all context menu operations.
 * Consolidates actions from existing hooks to avoid business logic duplication.
 */

import { useCallback, useMemo } from "react";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { useClipboard } from "./useClipboard";
import { useSlideState } from "./useSlideState";
import { useSelection } from "./useSelection";
import { useAlignmentActions } from "./useAlignmentActions";

// =============================================================================
// Types
// =============================================================================

export type ContextMenuActions = {
  // Selection info
  readonly hasSelection: boolean;
  readonly isMultiSelect: boolean;
  readonly primaryShapeType: string | undefined;

  // Clipboard
  readonly copy: () => void;
  readonly cut: () => void;
  readonly paste: () => void;
  readonly hasClipboard: boolean;

  // Edit
  readonly deleteSelected: () => void;
  readonly duplicateSelected: () => void;

  // Z-order
  readonly bringToFront: () => void;
  readonly sendToBack: () => void;
  readonly bringForward: () => void;
  readonly sendBackward: () => void;

  // Group
  readonly group: () => void;
  readonly ungroup: () => void;
  readonly canGroup: boolean;
  readonly canUngroup: boolean;

  // Alignment
  readonly alignLeft: () => void;
  readonly alignCenter: () => void;
  readonly alignRight: () => void;
  readonly alignTop: () => void;
  readonly alignMiddle: () => void;
  readonly alignBottom: () => void;
  readonly distributeHorizontally: () => void;
  readonly distributeVertically: () => void;
  readonly canAlign: boolean;
  readonly canDistribute: boolean;
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Unified hook for all context menu operations.
 *
 * This hook consolidates actions from:
 * - useClipboard: copy, cut, paste
 * - useSlideState: delete, duplicate, reorder
 * - useSelection: selection info
 * - useAlignmentActions: alignment and distribution
 * - SlideEditorContext: group/ungroup
 */
export function useContextMenuActions(): ContextMenuActions {
  const { dispatch, selectedShapes, primaryShape } = useSlideEditor();
  const clipboard = useClipboard();
  const slideState = useSlideState();
  const selection = useSelection();
  const alignment = useAlignmentActions();

  // Selection info
  const hasSelection = selection.hasSelection;
  const isMultiSelect = selection.isMultiSelect;
  const primaryShapeType = primaryShape?.type;

  // Group operations
  const canGroup = selectedShapes.length >= 2;
  const canUngroup =
    selectedShapes.length === 1 && primaryShape?.type === "grpSp";

  const group = useCallback(() => {
    if (!canGroup) return;
    const shapeIds = selectedShapes
      .filter((s) => "nonVisual" in s)
      .map((s) => (s as { nonVisual: { id: string } }).nonVisual.id);
    dispatch({ type: "GROUP_SHAPES", shapeIds });
  }, [canGroup, selectedShapes, dispatch]);

  const ungroup = useCallback(() => {
    if (!canUngroup || !primaryShape) return;
    const id = (primaryShape as { nonVisual: { id: string } }).nonVisual.id;
    dispatch({ type: "UNGROUP_SHAPE", shapeId: id });
  }, [canUngroup, primaryShape, dispatch]);

  // Z-order operations
  const bringToFront = useCallback(() => {
    if (!primaryShape) return;
    const id = (primaryShape as { nonVisual: { id: string } }).nonVisual.id;
    slideState.reorderShape(id, "front");
  }, [primaryShape, slideState]);

  const sendToBack = useCallback(() => {
    if (!primaryShape) return;
    const id = (primaryShape as { nonVisual: { id: string } }).nonVisual.id;
    slideState.reorderShape(id, "back");
  }, [primaryShape, slideState]);

  const bringForward = useCallback(() => {
    if (!primaryShape) return;
    const id = (primaryShape as { nonVisual: { id: string } }).nonVisual.id;
    slideState.reorderShape(id, "forward");
  }, [primaryShape, slideState]);

  const sendBackward = useCallback(() => {
    if (!primaryShape) return;
    const id = (primaryShape as { nonVisual: { id: string } }).nonVisual.id;
    slideState.reorderShape(id, "backward");
  }, [primaryShape, slideState]);

  return useMemo(
    () => ({
      // Selection info
      hasSelection,
      isMultiSelect,
      primaryShapeType,

      // Clipboard (from useClipboard)
      copy: clipboard.copy,
      cut: clipboard.cut,
      paste: clipboard.paste,
      hasClipboard: clipboard.hasClipboard,

      // Edit (from useSlideState)
      deleteSelected: slideState.deleteSelected,
      duplicateSelected: slideState.duplicateSelected,

      // Z-order
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,

      // Group
      group,
      ungroup,
      canGroup,
      canUngroup,

      // Alignment (from useAlignmentActions)
      alignLeft: alignment.alignLeft,
      alignCenter: alignment.alignCenter,
      alignRight: alignment.alignRight,
      alignTop: alignment.alignTop,
      alignMiddle: alignment.alignMiddle,
      alignBottom: alignment.alignBottom,
      distributeHorizontally: alignment.distributeHorizontally,
      distributeVertically: alignment.distributeVertically,
      canAlign: alignment.canAlign,
      canDistribute: alignment.canDistribute,
    }),
    [
      hasSelection,
      isMultiSelect,
      primaryShapeType,
      clipboard.copy,
      clipboard.cut,
      clipboard.paste,
      clipboard.hasClipboard,
      slideState.deleteSelected,
      slideState.duplicateSelected,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      group,
      ungroup,
      canGroup,
      canUngroup,
      alignment.alignLeft,
      alignment.alignCenter,
      alignment.alignRight,
      alignment.alignTop,
      alignment.alignMiddle,
      alignment.alignBottom,
      alignment.distributeHorizontally,
      alignment.distributeVertically,
      alignment.canAlign,
      alignment.canDistribute,
    ]
  );
}
