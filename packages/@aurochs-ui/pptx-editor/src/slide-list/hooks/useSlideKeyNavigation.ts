/**
 * @file Slide key navigation hook
 *
 * Delegates to @aurochs-ui/editor-controls/list-selection for generic navigation.
 */

import type { SlideId, SlideWithId } from "@aurochs-office/pptx/app";
import type { SlideListOrientation, SlideSelectionState } from "../types";
import {
  useItemKeyNavigation,
  type UseItemKeyNavigationResult,
} from "@aurochs-ui/editor-controls/list-selection";

export type UseSlideKeyNavigationOptions = {
  readonly slides: readonly SlideWithId[];
  readonly selection: SlideSelectionState;
  readonly orientation: SlideListOrientation;
  readonly onNavigate: (slideId: SlideId, index: number) => void;
  readonly onExtendSelection: (fromIndex: number, toIndex: number) => void;
  readonly enabled?: boolean;
  readonly containerRef?: React.RefObject<HTMLElement | null>;
};

export type UseSlideKeyNavigationResult = UseItemKeyNavigationResult;

/**
 * Hook for keyboard navigation in slide list.
 */
export function useSlideKeyNavigation(options: UseSlideKeyNavigationOptions): UseSlideKeyNavigationResult {
  return useItemKeyNavigation({
    items: options.slides,
    selection: options.selection,
    orientation: options.orientation,
    onNavigate: options.onNavigate,
    onExtendSelection: options.onExtendSelection,
    enabled: options.enabled,
    containerRef: options.containerRef,
  });
}
