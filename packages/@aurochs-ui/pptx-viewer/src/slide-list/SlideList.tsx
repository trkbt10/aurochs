/**
 * @file Slide list component
 *
 * Thin wrapper around the generic ItemList from editor-controls.
 * Adds PPTX-specific transition editor via renderItemExtras.
 */

import { useCallback } from "react";
import type { SlideWithId, SlideId } from "@aurochs-office/pptx/app";
import { ItemList, type ItemExtraRenderState } from "@aurochs-ui/editor-controls/item-list";
import type { SlideListProps } from "./types";
import { SlideTransitionExtras } from "./SlideTransitionExtras";

/**
 * PPTX slide list component
 *
 * Delegates to the generic ItemList, injecting the PPTX-specific
 * transition editor (Fx button + popover) via renderItemExtras.
 */
export function SlideList({
  slides,
  slideWidth,
  slideHeight,
  orientation = "vertical",
  mode = "readonly",
  selectedIds,
  activeSlideId,
  renderThumbnail,
  className,
  onSlideClick,
  onSelectionChange,
  onAddSlide,
  onDeleteSlides,
  onDuplicateSlides,
  onMoveSlides,
  onSlideTransitionChange,
}: SlideListProps) {
  // Build renderItemExtras that injects the PPTX-specific transition editor
  const renderItemExtras = useCallback(
    (item: SlideWithId, _index: number, state: ItemExtraRenderState) => {
      if (!onSlideTransitionChange) {
        return null;
      }
      return (
        <SlideTransitionExtras
          slideWithId={item}
          isHovered={state.isHovered}
          isAnyDragging={state.isAnyDragging}
          onTransitionChange={onSlideTransitionChange}
        />
      );
    },
    [onSlideTransitionChange],
  );

  return (
    <ItemList<SlideWithId, SlideId>
      items={slides}
      itemWidth={slideWidth}
      itemHeight={slideHeight}
      orientation={orientation}
      mode={mode}
      selectedIds={selectedIds}
      activeItemId={activeSlideId}
      itemLabel="Slide"
      renderThumbnail={renderThumbnail}
      renderItemExtras={onSlideTransitionChange ? renderItemExtras : undefined}
      className={className}
      onItemClick={onSlideClick}
      onSelectionChange={onSelectionChange}
      onAddItem={onAddSlide}
      onDeleteItems={onDeleteSlides}
      onDuplicateItems={onDuplicateSlides}
      onMoveItems={onMoveSlides}
    />
  );
}
