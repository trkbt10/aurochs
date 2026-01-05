/**
 * @file Slide list component
 *
 * Unified slide list supporting both readonly and editable modes
 * with vertical/horizontal orientation.
 */

import { useCallback, useRef, useEffect } from "react";
import type { SlideListProps } from "./types";
import { createSingleSlideSelection } from "./types";
import { SlideListItem } from "./SlideListItem";
import { SlideListGap } from "./SlideListGap";
import { getContainerStyle } from "./styles";
import {
  useSlideSelection,
  useSlideKeyNavigation,
  useSlideDragDrop,
  useSlideGapHover,
  useSlideContextMenu,
} from "./hooks";
import { ContextMenu } from "../ui/context-menu";

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
      const primaryId =
        controlledSelectedIds.length > 0
          ? controlledSelectedIds[controlledSelectedIds.length - 1]
          : undefined;
      setSelection({
        selectedIds: controlledSelectedIds,
        primaryId,
        anchorIndex: primaryId
          ? slides.findIndex((s) => s.id === primaryId)
          : undefined,
      });
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
      onSlideClick?.(slideId, {} as React.MouseEvent);
    },
    onExtendSelection: selectRange,
  });

  // Drag and drop
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragTarget,
    getDragPosition,
  } = useSlideDragDrop({
    slides,
    selectedIds: selection.selectedIds,
    orientation,
    onMoveSlides,
  });

  // Gap hover for add button
  const { handleGapEnter, handleGapLeave, isGapHovered } = useSlideGapHover();

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
    if (!item || !container) return;

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
    (slideId: string, index: number, event: React.MouseEvent) => {
      if (isEditable) {
        handleSelectionClick(slideId, index, event);
      } else {
        selectSingle(slideId, index);
      }
      onSlideClick?.(slideId, event);
    },
    [isEditable, handleSelectionClick, selectSingle, onSlideClick]
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
      const idsToDelete = selection.selectedIds.includes(slideId)
        ? selection.selectedIds
        : [slideId];
      onDeleteSlides?.(idsToDelete);
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

        return (
          <div key={slideWithId.id}>
            {/* Gap before first slide (index 0) or between slides */}
            {isEditable && (
              <SlideListGap
                index={index}
                orientation={orientation}
                isHovered={isGapHovered(index)}
                onMouseEnter={() => handleGapEnter(index)}
                onMouseLeave={handleGapLeave}
                onClick={() => handleAddAtGap(index)}
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
              renderThumbnail={renderThumbnail}
              onClick={(e) => handleItemClick(slideWithId.id, index, e)}
              onContextMenu={(e) => handleContextMenu(slideWithId.id, e)}
              onDelete={() => handleDelete(slideWithId.id)}
              onDragStart={(e) => handleDragStart(e, slideWithId.id)}
              onDragOver={(e) => handleDragOver(e, slideWithId.id, index)}
              onDrop={(e) => handleDrop(e, slideWithId.id, index)}
              isDragTarget={isDragTarget(slideWithId.id)}
              dragPosition={getDragPosition(slideWithId.id)}
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
          isHovered={isGapHovered(slides.length)}
          onMouseEnter={() => handleGapEnter(slides.length)}
          onMouseLeave={handleGapLeave}
          onClick={() => handleAddAtGap(slides.length)}
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
