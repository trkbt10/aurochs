/**
 * @file Slide thumbnail panel
 *
 * Left panel for slide navigation and management.
 * Uses the unified SlideList component with editable mode.
 */

import { useCallback, type CSSProperties } from "react";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { SlideId, SlideWithId } from "@aurochs-office/pptx/app";
import { RELATIONSHIP_TYPES } from "@aurochs-office/pptx/domain";
import { usePresentationEditor } from "../context/presentation/PresentationEditorContext";
import { SlideList } from "../slide-list";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPanelProps = {
  /** Slide width for aspect ratio calculation */
  readonly slideWidth: number;
  /** Slide height for aspect ratio calculation */
  readonly slideHeight: number;
  /** Optional render function for slide thumbnail */
  readonly renderThumbnail?: (slide: SlideWithId, index: number) => React.ReactNode;
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
/**
 * Get layout path from a slide's apiSlide relationships
 */
function getLayoutPathFromSlide(slide: SlideWithId): string | undefined {
  return slide.apiSlide?.relationships.getTargetByType(RELATIONSHIP_TYPES.SLIDE_LAYOUT);
}

/**
 * Get default layout path from document (uses first slide's layout)
 */
function getDefaultLayoutPath(slides: readonly SlideWithId[]): string | undefined {
  for (const slide of slides) {
    const layoutPath = getLayoutPathFromSlide(slide);
    if (layoutPath) {
      return layoutPath;
    }
  }
  return undefined;
}

export function SlideThumbnailPanel({ slideWidth, slideHeight, renderThumbnail }: SlideThumbnailPanelProps) {
  const { document, dispatch, activeSlide, slideOperations } = usePresentationEditor();

  // Handle slide click (select)
  const handleSlideClick = useCallback(
    (slideId: SlideId) => {
      dispatch({ type: "SELECT_SLIDE", slideId });
    },
    [dispatch],
  );

  // Handle add slide
  // Gap index N = insert at position N (0 = before first slide)
  const handleAddSlide = useCallback(
    (atIndex: number) => {
      const layoutPath = getDefaultLayoutPath(document.slides);
      if (!layoutPath) {
        console.warn("SlideThumbnailPanel: No layout path available for new slide");
        return;
      }
      slideOperations.addSlide(layoutPath, atIndex);
    },
    [document.slides, slideOperations],
  );

  // Handle delete slides
  const handleDeleteSlides = useCallback(
    (slideIds: readonly SlideId[]) => {
      slideOperations.deleteSlides(slideIds);
    },
    [slideOperations],
  );

  // Handle duplicate slides
  const handleDuplicateSlides = useCallback(
    (slideIds: readonly SlideId[]) => {
      slideOperations.duplicateSlides(slideIds);
    },
    [slideOperations],
  );

  // Handle move slides
  const handleMoveSlides = useCallback(
    (slideIds: readonly SlideId[], toIndex: number) => {
      // For now, move the first slide in the selection
      // TODO: Support batch move
      if (slideIds.length > 0) {
        slideOperations.moveSlide(slideIds[0]!, toIndex);
      }
    },
    [slideOperations],
  );

  const handleSlideTransitionChange = useCallback(
    (slideId: SlideId, transition: SlideTransition | undefined) => {
      dispatch({
        type: "UPDATE_SLIDE",
        slideId,
        updater: (slide) => ({ ...slide, transition }),
      });
    },
    [dispatch],
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
        onSlideTransitionChange={handleSlideTransitionChange}
      />
    </div>
  );
}
