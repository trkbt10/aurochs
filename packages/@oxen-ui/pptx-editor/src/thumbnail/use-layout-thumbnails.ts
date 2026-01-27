/**
 * @file Hook for layout thumbnail data
 *
 * Loads and caches layout shapes for thumbnail preview.
 */

import { useMemo } from "react";
import type { PresentationFile, Shape, SlideSize } from "@oxen/pptx/domain";
import type { SlideLayoutOption } from "@oxen/pptx/app";
import { loadSlideLayoutBundle } from "@oxen/pptx/app";
import { parseShapeTree } from "@oxen/pptx/parser";
import { getChild } from "@oxen/xml";
import { getByPath } from "@oxen/xml";

// =============================================================================
// Types
// =============================================================================

export type LayoutThumbnailData = SlideLayoutOption & {
  /** Layout shapes for preview */
  readonly shapes: readonly Shape[];
};

export type UseLayoutThumbnailsOptions = {
  readonly presentationFile: PresentationFile | undefined;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly slideSize: SlideSize;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Load layout shapes for thumbnail preview.
 *
 * Returns layout options augmented with parsed shapes.
 */
export function useLayoutThumbnails(options: UseLayoutThumbnailsOptions): readonly LayoutThumbnailData[] {
  const { presentationFile, layoutOptions, slideSize } = options;

  return useMemo(() => {
    if (!presentationFile) {
      return [];
    }

    return layoutOptions.map((option) => {
      const shapes = loadLayoutShapes(presentationFile, option.value);
      return {
        ...option,
        shapes,
      };
    });
  }, [presentationFile, layoutOptions, slideSize]);
}

/**
 * Load shapes from a layout file.
 */
function loadLayoutShapes(file: PresentationFile, layoutPath: string): readonly Shape[] {
  try {
    const bundle = loadSlideLayoutBundle(file, layoutPath);
    const layoutContent = getByPath(bundle.layout, ["p:sldLayout"]);
    if (layoutContent === undefined) {
      return [];
    }

    const cSld = getChild(layoutContent, "p:cSld");
    if (cSld === undefined) {
      return [];
    }

    const spTree = getChild(cSld, "p:spTree");
    if (spTree === undefined) {
      return [];
    }

    return parseShapeTree(spTree);
  } catch {
    return [];
  }
}
