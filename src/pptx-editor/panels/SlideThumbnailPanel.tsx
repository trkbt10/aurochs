/**
 * @file Slide thumbnail panel
 *
 * Left panel for slide navigation and management.
 * Uses the unified SlideList component with editable mode.
 */

import { useCallback, type CSSProperties } from "react";
import type { Slide } from "../../pptx/domain/index";
import type { SlideId, SlideWithId } from "../presentation/types";
import { usePresentationEditor } from "../presentation/context";
import { SlideList } from "../slide-list";
import { colorTokens } from "../ui/design-tokens/index";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPanelProps = {
  /** Slide width for aspect ratio calculation */
  readonly slideWidth: number;
  /** Slide height for aspect ratio calculation */
  readonly slideHeight: number;
  /** Optional render function for slide thumbnail */
  readonly renderThumbnail?: (
    slide: SlideWithId,
    index: number
  ) => React.ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRight: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  overflow: "hidden",
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Slide thumbnail panel with full slide management
 *
 * Uses SlideList in editable mode with vertical orientation.
 * Provides slide add, delete, duplicate, and reorder operations.
 */
export function SlideThumbnailPanel({
  slideWidth,
  slideHeight,
  renderThumbnail,
}: SlideThumbnailPanelProps) {
  const { document, dispatch, activeSlide } = usePresentationEditor();

  // Handle slide click (select)
  const handleSlideClick = useCallback(
    (slideId: SlideId) => {
      dispatch({ type: "SELECT_SLIDE", slideId });
    },
    [dispatch]
  );

  // Handle add slide
  const handleAddSlide = useCallback(
    (afterIndex: number) => {
      const newSlide: Slide = { shapes: [] };
      const afterSlideId =
        afterIndex > 0 ? document.slides[afterIndex - 1]?.id : undefined;
      dispatch({
        type: "ADD_SLIDE",
        slide: newSlide,
        afterSlideId,
      });
    },
    [dispatch, document.slides]
  );

  // Handle delete slides
  const handleDeleteSlides = useCallback(
    (slideIds: readonly SlideId[]) => {
      // Delete slides one by one (reducer protects against deleting last slide)
      // Limit deletions to keep at least one slide
      const maxDeletions = document.slides.length - 1;
      const slidesToDelete = slideIds.slice(0, maxDeletions);
      for (const slideId of slidesToDelete) {
        dispatch({ type: "DELETE_SLIDE", slideId });
      }
    },
    [dispatch, document.slides.length]
  );

  // Handle duplicate slides
  const handleDuplicateSlides = useCallback(
    (slideIds: readonly SlideId[]) => {
      // Duplicate slides one by one
      for (const slideId of slideIds) {
        dispatch({ type: "DUPLICATE_SLIDE", slideId });
      }
    },
    [dispatch]
  );

  // Handle move slides
  const handleMoveSlides = useCallback(
    (slideIds: readonly SlideId[], toIndex: number) => {
      // For now, move the first slide in the selection
      // TODO: Support batch move in reducer
      if (slideIds.length > 0) {
        dispatch({
          type: "MOVE_SLIDE",
          slideId: slideIds[0],
          toIndex,
        });
      }
    },
    [dispatch]
  );

  return (
    <div style={panelStyle}>
      <SlideList
        slides={document.slides}
        slideWidth={slideWidth}
        slideHeight={slideHeight}
        orientation="vertical"
        mode="editable"
        activeSlideId={activeSlide?.id}
        renderThumbnail={renderThumbnail}
        onSlideClick={handleSlideClick}
        onAddSlide={handleAddSlide}
        onDeleteSlides={handleDeleteSlides}
        onDuplicateSlides={handleDuplicateSlides}
        onMoveSlides={handleMoveSlides}
      />
    </div>
  );
}
