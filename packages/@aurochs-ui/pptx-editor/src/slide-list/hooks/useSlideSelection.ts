/**
 * @file Slide selection hook
 *
 * Delegates to @aurochs-ui/editor-controls/list-selection for generic multi-select.
 */

import type { SlideId, SlideWithId } from "@aurochs-office/pptx/app";
import type { SlideSelectionState } from "../types";
import {
  useItemSelection,
  type UseItemSelectionResult,
} from "@aurochs-ui/editor-controls/list-selection";

export type UseSlideSelectionOptions = {
  readonly slides: readonly SlideWithId[];
  readonly initialSelection?: SlideSelectionState;
  readonly onSelectionChange?: (selection: SlideSelectionState) => void;
};

export type UseSlideSelectionResult = UseItemSelectionResult<SlideId>;

/**
 * Hook for managing slide selection with multi-select support.
 */
export function useSlideSelection(options: UseSlideSelectionOptions): UseSlideSelectionResult {
  return useItemSelection({
    items: options.slides,
    initialSelection: options.initialSelection,
    onSelectionChange: options.onSelectionChange,
  });
}
