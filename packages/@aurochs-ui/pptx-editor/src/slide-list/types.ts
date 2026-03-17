/**
 * @file Slide list type definitions
 *
 * PPTX-specific types for the slide list component.
 * Generic list types are re-exported from editor-controls/item-list.
 */

import type { SlideId, SlideWithId } from "@aurochs-office/pptx/app";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { ItemSelectionState } from "@aurochs-ui/editor-core/item-selection";
import type { ListOrientation, ListMode } from "@aurochs-ui/editor-controls/item-list";

// Re-export generic types with slide-specific aliases for backward compat
export type SlideListOrientation = ListOrientation;
export type SlideListMode = ListMode;
export type SlideSelectionState = ItemSelectionState<SlideId>;

/**
 * Props for the SlideList component (PPTX-specific wrapper around ItemList)
 */
export type SlideListProps = {
  /** Slides to display */
  readonly slides: readonly SlideWithId[];
  /** Slide width for aspect ratio calculation */
  readonly slideWidth: number;
  /** Slide height for aspect ratio calculation */
  readonly slideHeight: number;
  /** Scroll orientation (default: vertical) */
  readonly orientation?: SlideListOrientation;
  /** Editor mode (default: readonly) */
  readonly mode?: SlideListMode;
  /** Currently selected slide IDs (controlled) */
  readonly selectedIds?: readonly SlideId[];
  /** Currently active slide ID (for navigation highlight) */
  readonly activeSlideId?: SlideId;
  /** Render function for slide thumbnail content */
  readonly renderThumbnail?: (slide: SlideWithId, index: number) => React.ReactNode;
  /** Container class name */
  readonly className?: string;

  // Event handlers
  /** Called when a slide is clicked */
  readonly onSlideClick?: (slideId: SlideId, event?: React.SyntheticEvent) => void;
  /** Called when selection changes (editable mode) */
  readonly onSelectionChange?: (selection: SlideSelectionState) => void;
  /** Called to add a new slide after the specified index */
  readonly onAddSlide?: (afterIndex: number) => void;
  /** Called to delete slides */
  readonly onDeleteSlides?: (slideIds: readonly SlideId[]) => void;
  /** Called to duplicate slides */
  readonly onDuplicateSlides?: (slideIds: readonly SlideId[]) => void;
  /** Called to move slides to a new position */
  readonly onMoveSlides?: (slideIds: readonly SlideId[], toIndex: number) => void;
  /** Called when slide transition changes (PPTX-specific) */
  readonly onSlideTransitionChange?: (slideId: SlideId, transition: SlideTransition | undefined) => void;
};
