/**
 * @file Hook for layout thumbnail data
 *
 * Uses loadLayoutWithContext from ooxml-components for the actual loading.
 */

import { useMemo } from "react";
import type { PresentationFile, Shape, SlideSize } from "@aurochs-office/pptx/domain";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import { loadLayoutWithContext } from "@aurochs-ui/ooxml-components";

// =============================================================================
// Types
// =============================================================================

export type LayoutThumbnailData = SlideLayoutOption & {
  readonly shapes: readonly Shape[];
  readonly svg: string;
};

export type UseLayoutThumbnailsOptions = {
  readonly presentationFile: PresentationFile | undefined;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly slideSize: SlideSize;
};

// =============================================================================
// Hook
// =============================================================================

export function useLayoutThumbnails(options: UseLayoutThumbnailsOptions): readonly LayoutThumbnailData[] {
  const { presentationFile, layoutOptions, slideSize } = options;

  return useMemo(() => {
    if (!presentationFile) {
      return [];
    }

    return layoutOptions.map((option) => {
      const result = loadLayoutWithContext(presentationFile, option.value, slideSize);
      return {
        ...option,
        shapes: result?.shapes ?? [],
        svg: result?.svg ?? "",
      };
    });
  }, [presentationFile, layoutOptions, slideSize]);
}
