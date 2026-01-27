/**
 * @file Slide list component
 *
 * Unified slide list supporting both readonly and editable modes
 * with vertical/horizontal orientation.
 */

import { useCallback, useRef, useEffect } from "react";
import type { SlideListProps } from "./types";
import { SlideListItem } from "./SlideListItem";
import { SlideListGap } from "./SlideListGap";
import { getContainerStyle } from "./styles";
import {
  useSlideSelection,
  useSlideKeyNavigation,
  useSlideDragDrop,
  useSlideGapHover,
  useSlideItemHover,
  useSlideContextMenu,
} from "./hooks";
import { ContextMenu } from "../ui/context-menu";
import type { SlideTransition } from "@oxen/pptx/domain/transition";
import type { SlideSelectionState } from "./types";

function buildControlledSelection(
  selectedIds: readonly string[],
  slides: readonly { readonly id: string }[]
): SlideSelectionState {
  if (selectedIds.length === 0) {
    return {
      selectedIds,
      primaryId: undefined,
      anchorIndex: undefined,
    };
  }
  const primaryId = selectedIds[selectedIds.length - 1];
  const anchorIndex = slides.findIndex((slide) => slide.id === primaryId);
  return {
    selectedIds,
    primaryId,
    anchorIndex: anchorIndex === -1 ? undefined : anchorIndex,
  };
}

/**
 * Unified slide list component
 */
export function SlideList({
  slides,
  slideWidth,
  slideHeight,
  orientation = "vertical",
  mode = "readonly",
  selectedIds: controlledSelectedIds,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const aspectRatio = String(slideWidth / slideHeight);
  const isEditable = mode === "editable";

  // Selection management
  const {
    selection,
    handleClick: handleSelectionClick,
    selectSingle,
    selectRange,
    isSelected,
    setSelection,
  } = useSlideSelection({
    slides,
    onSelectionChange,
  });

  // Sync with controlled selectedIds
  useEffect(() => {
    if (controlledSelectedIds) {
      setSelection(buildControlledSelection(controlledSelectedIds, slides));
    }
  }, [controlledSelectedIds, slides, setSelection]);

  // Keyboard navigation
  const { handleKeyDown } = useSlideKeyNavigation({
    slides,
    selection,
    orientation,
    enabled: isEditable,
    containerRef,
    onNavigate: (slideId, index) => {
      selectSingle(slideId, index);
      onSlideClick?.(slideId);
    },
    onExtendSelection: selectRange,
  });

  // Drag and drop (gap-based targeting)
  const {
    dragState,
    handleDragStart,
    handleItemDragOver,
    handleGapDragOver,
    handleGapDrop,
    handleItemDrop,
    handleDragEnd,
    isDragging,
    isGapTarget,
  } = useSlideDragDrop({
    slides,
    selectedIds: selection.selectedIds,
    orientation,
    onMoveSlides,
  });

  // Gap hover for add button
  const { handleGapEnter, handleGapLeave, isGapHovered } = useSlideGapHover();

  // Slide item hover (list-level management for single hover invariant)
  const {
    handleItemEnter,
    handleItemLeave,
    clearHover: clearItemHover,
    isItemHovered,
  } = useSlideItemHover();

  // Clear item hover when drag starts
  useEffect(() => {
    if (dragState.isDragging) {
      clearItemHover();
    }
  }, [dragState.isDragging, clearItemHover]);

  // Context menu
  const {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    handleMenuAction,
    getMenuItems,
  } = useSlideContextMenu({
    slides,
    selectedIds: selection.selectedIds,
    onDeleteSlides,
    onDuplicateSlides,
    onMoveSlides,
  });

  // Scroll active slide into view
  useEffect(() => {
    const item = activeItemRef.current;
    const container = containerRef.current;
    if (!item || !container) {
      return;
    }

    requestAnimationFrame(() => {
      const itemRect = item.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (orientation === "vertical") {
        if (itemRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - itemRect.top + 8;
        } else if (itemRect.bottom > containerRect.bottom) {
          container.scrollTop += itemRect.bottom - containerRect.bottom + 8;
        }
      } else {
        if (itemRect.left < containerRect.left) {
          container.scrollLeft -= containerRect.left - itemRect.left + 8;
        } else if (itemRect.right > containerRect.right) {
          container.scrollLeft += itemRect.right - containerRect.right + 8;
        }
      }
    });
  }, [activeSlideId, orientation]);

  // Handle item click
  const handleItemClick = useCallback(
    (slideId: string, index: number, event: React.MouseEvent | React.KeyboardEvent) => {
      if (isEditable) {
        handleSelectionClick(slideId, index, event);
      } else {
        selectSingle(slideId, index);
      }
      onSlideClick?.(slideId, event);
    },
    [isEditable, handleSelectionClick, selectSingle, onSlideClick]
  );

  const handleFxOpen = useCallback(
    (slideId: string, index: number, event: React.MouseEvent) => {
      if (isEditable) {
        selectSingle(slideId, index);
      }
      onSlideClick?.(slideId, event);
    },
    [isEditable, selectSingle, onSlideClick]
  );

  const handleTransitionChange = useCallback(
    (slideId: string, transition: SlideTransition | undefined) => {
      onSlideTransitionChange?.(slideId, transition);
    },
    [onSlideTransitionChange]
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (slideId: string, event: React.MouseEvent) => {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY, slideId);
    },
    [openContextMenu]
  );

  // Handle delete
  const handleDelete = useCallback(
    (slideId: string) => {
      // Delete selected items if the deleted slide is selected, otherwise just this one
      if (selection.selectedIds.includes(slideId)) {
        onDeleteSlides?.(selection.selectedIds);
        return;
      }
      onDeleteSlides?.([slideId]);
    },
    [selection.selectedIds, onDeleteSlides]
  );

  // Handle add at gap
  const handleAddAtGap = useCallback(
    (gapIndex: number) => {
      onAddSlide?.(gapIndex);
    },
    [onAddSlide]
  );

  return (
    <div
      ref={containerRef}
      style={getContainerStyle(orientation)}
      className={className}
      onKeyDown={isEditable ? handleKeyDown : undefined}
      onDragEnd={handleDragEnd}
      tabIndex={0}
      role="listbox"
      aria-multiselectable={isEditable}
      aria-label="Slide list"
    >
      {slides.map((slideWithId, index) => {
        const isActive = slideWithId.id === activeSlideId;
        const isItemSelected = isSelected(slideWithId.id);
        const isPrimary = selection.primaryId === slideWithId.id;
        const canDelete = slides.length > 1;
        const isItemDragging = isDragging(slideWithId.id);

        return (
          <div key={slideWithId.id}>
            {/* Gap before slide - uses zero height with overflow for interactivity */}
            {isEditable && (
              <SlideListGap
                index={index}
                orientation={orientation}
                isHovered={isGapHovered(index) && !dragState.isDragging}
                isDragTarget={isGapTarget(index)}
                onPointerEnter={() => handleGapEnter(index)}
                onPointerLeave={handleGapLeave}
                onClick={() => handleAddAtGap(index)}
                onDragOver={(e) => handleGapDragOver(e, index)}
                onDrop={(e) => handleGapDrop(e, index)}
              />
            )}

            {/* Slide item */}
            <SlideListItem
              slideWithId={slideWithId}
              index={index}
              aspectRatio={aspectRatio}
              orientation={orientation}
              mode={mode}
              isSelected={isItemSelected}
              isPrimary={isPrimary}
              isActive={isActive}
              canDelete={canDelete}
              isDragging={isItemDragging}
              isAnyDragging={dragState.isDragging}
              isHovered={isItemHovered(slideWithId.id)}
              renderThumbnail={renderThumbnail}
              onItemClick={handleItemClick}
              onItemContextMenu={handleContextMenu}
              onItemDelete={handleDelete}
              onItemPointerEnter={handleItemEnter}
              onItemPointerLeave={handleItemLeave}
              onItemTransitionChange={handleTransitionChange}
              onItemFxOpen={handleFxOpen}
              onItemDragStart={handleDragStart}
              onItemDragOver={handleItemDragOver}
              onItemDrop={handleItemDrop}
              itemRef={isActive ? activeItemRef : undefined}
            />
          </div>
        );
      })}

      {/* Gap after last slide */}
      {isEditable && slides.length > 0 && (
        <SlideListGap
          index={slides.length}
          orientation={orientation}
          isHovered={isGapHovered(slides.length) && !dragState.isDragging}
          isDragTarget={isGapTarget(slides.length)}
          onPointerEnter={() => handleGapEnter(slides.length)}
          onPointerLeave={handleGapLeave}
          onClick={() => handleAddAtGap(slides.length)}
          onDragOver={(e) => handleGapDragOver(e, slides.length)}
          onDrop={(e) => handleGapDrop(e, slides.length)}
        />
      )}

      {/* Context menu */}
      {isEditable && contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getMenuItems()}
          onAction={handleMenuAction}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
