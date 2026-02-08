/**
 * @file Slide drag-and-drop operations
 *
 * Pure functions for D&D logic. These can be tested without React.
 * Uses gap-based targeting: indicator appears between slides, not on them.
 */

import type { SlideId, SlideWithId } from "@aurochs-office/pptx/app";
import type { SlideDragState } from "./types";

/**
 * Determine which slides to drag based on selection
 */
export function getDraggingIds(selectedIds: readonly SlideId[], draggedSlideId: SlideId): readonly SlideId[] {
  // If dragging a selected item, drag all selected
  // If dragging unselected item, drag only that item
  if (selectedIds.includes(draggedSlideId)) {
    return [...selectedIds];
  }
  return [draggedSlideId];
}

/**
 * Create drag state for starting a drag operation
 */
export function createDragStartState(draggingIds: readonly SlideId[]): SlideDragState {
  return {
    isDragging: true,
    draggingIds,
    targetGapIndex: null,
  };
}

/**
 * Update drag state when hovering over a gap
 */
export function updateDragOverGap(currentState: SlideDragState, gapIndex: number): SlideDragState {
  return {
    ...currentState,
    targetGapIndex: gapIndex,
  };
}

/**
 * Check if a gap is a valid drop target
 */
export function isValidGapDrop(dragState: SlideDragState, gapIndex: number, slides: readonly SlideWithId[]): boolean {
  // Basic validation
  if (!dragState.isDragging || dragState.draggingIds.length === 0) {
    return false;
  }

  // Get indices of dragged slides
  const draggingIndices = dragState.draggingIds
    .map((id) => slides.findIndex((s) => s.id === id))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b);

  if (draggingIndices.length === 0) {
    return false;
  }

  // Check for contiguous selection - only then check for no-op
  const isContiguous = draggingIndices.every((idx, i) => i === 0 || idx === draggingIndices[i - 1] + 1);

  if (isContiguous) {
    const firstDragging = draggingIndices[0];
    const lastDragging = draggingIndices[draggingIndices.length - 1];

    // Gap immediately before first or after last = no movement
    if (gapIndex === firstDragging || gapIndex === lastDragging + 1) {
      return false;
    }
  }

  // For non-contiguous selections, always allow (will consolidate them)
  return true;
}

/**
 * Calculate the final target index for a drop on a gap
 */
export function calculateTargetIndexFromGap(
  slides: readonly SlideWithId[],
  draggingIds: readonly SlideId[],
  gapIndex: number,
): number {
  // Gap index is the position where items will be inserted
  // We need to adjust for items being removed from before this position
  const itemsMovingFromBefore = draggingIds.filter((id) => {
    const idx = slides.findIndex((s) => s.id === id);
    return idx >= 0 && idx < gapIndex;
  }).length;

  return gapIndex - itemsMovingFromBefore;
}

/**
 * Check if a gap is the current drag target
 */
export function isGapDragTarget(dragState: SlideDragState, gapIndex: number): boolean {
  return dragState.isDragging && dragState.targetGapIndex === gapIndex;
}

type CalculateGapIndexInput = {
  readonly itemIndex: number;
  readonly orientation: "vertical" | "horizontal";
  readonly clientX: number;
  readonly clientY: number;
  readonly itemRect: DOMRect;
};

/**
 * Calculate gap index from cursor position over a slide item.
 * Uses cursor position relative to item center to determine before/after.
 */
export function calculateGapIndexFromItemDragOver({
  itemIndex,
  orientation,
  clientX,
  clientY,
  itemRect,
}: CalculateGapIndexInput): number {
  if (orientation === "vertical") {
    const mid = itemRect.top + itemRect.height / 2;
    return clientY < mid ? itemIndex : itemIndex + 1;
  } else {
    const mid = itemRect.left + itemRect.width / 2;
    return clientX < mid ? itemIndex : itemIndex + 1;
  }
}

// Legacy exports for backwards compatibility with tests

/** Determine drop position (before/after) based on vertical cursor position */
export function getVerticalDropPosition(clientY: number, rectTop: number, rectHeight: number): "before" | "after" {
  const mid = rectTop + rectHeight / 2;
  return clientY < mid ? "before" : "after";
}

/** Determine drop position (before/after) based on horizontal cursor position */
export function getHorizontalDropPosition(clientX: number, rectLeft: number, rectWidth: number): "before" | "after" {
  const mid = rectLeft + rectWidth / 2;
  return clientX < mid ? "before" : "after";
}

type CalculateTargetIndexInput = {
  readonly slides: readonly SlideWithId[];
  readonly draggingIds: readonly SlideId[];
  readonly dropIndex: number;
  readonly position: "before" | "after";
};

/** Calculate the target index for a drop based on position */
export function calculateTargetIndex({ slides, draggingIds, dropIndex, position }: CalculateTargetIndexInput): number {
  const gapIndex = position === "after" ? dropIndex + 1 : dropIndex;
  return calculateTargetIndexFromGap(slides, draggingIds, gapIndex);
}

/** Check if a drop is valid for the current drag state */
export function isValidDrop(dragState: SlideDragState, _targetSlideId: SlideId): boolean {
  return dragState.isDragging && dragState.draggingIds.length > 0;
}

/** Update drag state when hovering over a target (legacy) */
export function updateDragOverState(
  currentState: SlideDragState,
  _targetSlideId: SlideId,
  _position: "before" | "after",
): SlideDragState {
  return currentState;
}

/** Check if a slide is the current drag target (legacy, always false) */
export function isDragTarget(_dragState: SlideDragState, _slideId: SlideId): boolean {
  return false;
}

/** Get drag position for a slide (legacy, always null) */
export function getDragPositionForSlide(_dragState: SlideDragState, _slideId: SlideId): "before" | "after" | null {
  return null;
}
