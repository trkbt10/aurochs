/**
 * @file Slide thumbnail panel
 *
 * Left panel for slide management: navigation, add, delete, duplicate, reorder.
 * Uses lucide-react icons for consistent visual design.
 */

import { useCallback, useState, useEffect, useRef } from "react";
import type { Slide } from "../../pptx/domain/index";
import type { SlideId } from "../presentation/types";
import { usePresentationEditor } from "../presentation/context";
import { AddIcon, CopyIcon, TrashIcon } from "../ui/icons/index";
import { iconTokens } from "../ui/design-tokens/index";
import { ContextMenu } from "../ui/context-menu/index";
import { ThumbnailItem } from "../thumbnail/ThumbnailItem";
import { buildSlideMenuItems, SLIDE_MENU_ACTIONS } from "../thumbnail/slide-menu-items";
import {
  panelStyle,
  headerStyle,
  headerTitleStyle,
  buttonGroupStyle,
  listStyle,
  iconButtonStyle,
  iconButtonHoverStyle,
  iconButtonDisabledStyle,
  ICON_SIZE,
} from "../thumbnail/styles";
import type { DragState, ContextMenuState } from "../thumbnail/types";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPanelProps = {
  /** Slide width for aspect ratio calculation */
  readonly slideWidth: number;
  /** Slide height for aspect ratio calculation */
  readonly slideHeight: number;
  /** Optional render function for slide thumbnail */
  readonly renderThumbnail?: (slide: import("../presentation/types").SlideWithId, index: number) => React.ReactNode;
};

// =============================================================================
// Icon Button (local to this module)
// =============================================================================

function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      style={
        disabled
          ? iconButtonDisabledStyle
          : isHovered
            ? iconButtonHoverStyle
            : iconButtonStyle
      }
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Slide thumbnail panel with full slide management
 */
export function SlideThumbnailPanel({
  slideWidth,
  slideHeight,
  renderThumbnail,
}: SlideThumbnailPanelProps) {
  const { document, dispatch, activeSlide } = usePresentationEditor();
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const aspectRatio = String(slideWidth / slideHeight);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    slideId: null,
  });
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    overId: null,
    position: null,
  });

  // Scroll active slide into view when it changes
  useEffect(() => {
    const item = activeItemRef.current;
    const list = listRef.current;
    if (!item || !list) return;

    requestAnimationFrame(() => {
      const itemRect = item.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();

      if (itemRect.top < listRect.top) {
        list.scrollTop -= listRect.top - itemRect.top + 8;
      } else if (itemRect.bottom > listRect.bottom) {
        list.scrollTop += itemRect.bottom - listRect.bottom + 8;
      }
    });
  }, [activeSlide?.id]);

  const handleSlideClick = useCallback(
    (slideId: SlideId) => {
      dispatch({ type: "SELECT_SLIDE", slideId });
    },
    [dispatch]
  );

  const handleAddSlide = useCallback(() => {
    const newSlide: Slide = { shapes: [] };
    dispatch({
      type: "ADD_SLIDE",
      slide: newSlide,
      afterSlideId: activeSlide?.id,
    });
  }, [dispatch, activeSlide]);

  const handleDuplicateSlide = useCallback(
    (slideId: SlideId) => {
      dispatch({ type: "DUPLICATE_SLIDE", slideId });
    },
    [dispatch]
  );

  const handleDeleteSlide = useCallback(
    (slideId: SlideId) => {
      if (document.slides.length > 1) {
        dispatch({ type: "DELETE_SLIDE", slideId });
      }
    },
    [dispatch, document.slides.length]
  );

  const handleMoveSlide = useCallback(
    (slideId: SlideId, direction: "up" | "down") => {
      const currentIndex = document.slides.findIndex((s) => s.id === slideId);
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < document.slides.length) {
        dispatch({ type: "MOVE_SLIDE", slideId, toIndex: newIndex });
      }
    },
    [dispatch, document.slides]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, slideId: SlideId) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        slideId,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleContextMenuAction = useCallback(
    (actionId: string) => {
      if (!contextMenu.slideId) return;

      switch (actionId) {
        case SLIDE_MENU_ACTIONS.DUPLICATE:
          handleDuplicateSlide(contextMenu.slideId);
          break;
        case SLIDE_MENU_ACTIONS.MOVE_UP:
          handleMoveSlide(contextMenu.slideId, "up");
          break;
        case SLIDE_MENU_ACTIONS.MOVE_DOWN:
          handleMoveSlide(contextMenu.slideId, "down");
          break;
        case SLIDE_MENU_ACTIONS.DELETE:
          handleDeleteSlide(contextMenu.slideId);
          break;
      }
    },
    [contextMenu.slideId, handleDuplicateSlide, handleMoveSlide, handleDeleteSlide]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, slideId: SlideId) => {
      e.dataTransfer.effectAllowed = "move";
      setDragState({ draggingId: slideId, overId: null, position: null });
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, slideId: SlideId) => {
      e.preventDefault();
      if (dragState.draggingId === slideId) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "before" : "after";

      setDragState((prev) => ({
        ...prev,
        overId: slideId,
        position,
      }));
    },
    [dragState.draggingId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSlideId: SlideId, targetIndex: number) => {
      e.preventDefault();
      if (!dragState.draggingId || dragState.draggingId === targetSlideId) {
        setDragState({ draggingId: null, overId: null, position: null });
        return;
      }

      let newIndex = targetIndex;
      if (dragState.position === "after") {
        newIndex = targetIndex + 1;
      }

      const currentIndex = document.slides.findIndex(
        (s) => s.id === dragState.draggingId
      );
      if (currentIndex < newIndex) {
        newIndex--;
      }

      dispatch({
        type: "MOVE_SLIDE",
        slideId: dragState.draggingId,
        toIndex: newIndex,
      });

      setDragState({ draggingId: null, overId: null, position: null });
    },
    [dragState, dispatch, document.slides]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggingId: null, overId: null, position: null });
  }, []);

  const contextSlideIndex = contextMenu.slideId
    ? document.slides.findIndex((s) => s.id === contextMenu.slideId)
    : -1;

  const contextMenuItems = buildSlideMenuItems({
    canMoveUp: contextSlideIndex > 0,
    canMoveDown: contextSlideIndex < document.slides.length - 1,
    canDelete: document.slides.length > 1,
  });

  return (
    <div style={panelStyle} onDragEnd={handleDragEnd}>
      {/* Header with actions */}
      <div style={headerStyle}>
        <span style={headerTitleStyle}>Slides</span>
        <div style={buttonGroupStyle}>
          <IconButton onClick={handleAddSlide} title="Add Slide">
            <AddIcon size={ICON_SIZE} strokeWidth={iconTokens.strokeWidth} />
          </IconButton>
          <IconButton
            onClick={() => activeSlide && handleDuplicateSlide(activeSlide.id)}
            disabled={!activeSlide}
            title="Duplicate Slide"
          >
            <CopyIcon size={ICON_SIZE} strokeWidth={iconTokens.strokeWidth} />
          </IconButton>
          <IconButton
            onClick={() => activeSlide && handleDeleteSlide(activeSlide.id)}
            disabled={!activeSlide || document.slides.length <= 1}
            title="Delete Slide"
          >
            <TrashIcon size={ICON_SIZE} strokeWidth={iconTokens.strokeWidth} />
          </IconButton>
        </div>
      </div>

      {/* Slide list */}
      <div ref={listRef} style={listStyle}>
        {document.slides.map((slideWithId, index) => {
          const isActive = slideWithId.id === activeSlide?.id;
          return (
            <ThumbnailItem
              key={slideWithId.id}
              slideWithId={slideWithId}
              index={index}
              isActive={isActive}
              totalSlides={document.slides.length}
              aspectRatio={aspectRatio}
              renderThumbnail={renderThumbnail}
              onClick={() => handleSlideClick(slideWithId.id)}
              onContextMenu={(e) => handleContextMenu(e, slideWithId.id)}
              onDelete={() => handleDeleteSlide(slideWithId.id)}
              onDragStart={(e) => handleDragStart(e, slideWithId.id)}
              onDragOver={(e) => handleDragOver(e, slideWithId.id)}
              onDrop={(e) => handleDrop(e, slideWithId.id, index)}
              isDragOver={dragState.overId === slideWithId.id}
              dragPosition={
                dragState.overId === slideWithId.id ? dragState.position : null
              }
              itemRef={isActive ? activeItemRef : undefined}
            />
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
