/**
 * @file Hook for slide thumbnail rendering
 *
 * Thumbnail SVGs are derived from slides + slideSize via useMemo.
 * No mutable cache — React's memo handles staleness.
 */

import { useMemo, useCallback } from "react";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";

import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createRenderContext } from "@aurochs-renderer/pptx";
import type { SlideWithId, SlideId } from "@aurochs-office/pptx/app";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { prepareSlide } from "../resource/register-slide-resources";

// =============================================================================
// Types
// =============================================================================

export type UseSlideThumbnailsOptions = {
  readonly slideWidth: Pixels;
  readonly slideHeight: Pixels;
  readonly slides: readonly SlideWithId[];
};

export type SlideThumbnailRenderer = {
  readonly getThumbnailSvg: (slideWithId: SlideWithId) => string;
};

// =============================================================================
// Hook
// =============================================================================

export function useSlideThumbnails(options: UseSlideThumbnailsOptions): SlideThumbnailRenderer {
  const { slideWidth, slideHeight, slides } = options;
  const slideSize = useMemo(() => ({ width: slideWidth, height: slideHeight }), [slideWidth, slideHeight]);

  const thumbnailMap = useMemo(() => {
    const map = new Map<SlideId, string>();
    for (const slideWithId of slides) {
      const resourceStore = createResourceStore();
      const ctx = createRenderContext({
        slideSize,
        resourceStore,
        colorContext: slideWithId.colorContext,
        fontScheme: slideWithId.fontScheme,
        resolvedBackground: slideWithId.resolvedBackground,
        layoutShapes: slideWithId.layoutShapes,
      });
      const enrichedSlide = prepareSlide(slideWithId.slide, resourceStore);
      const result = renderSlideSvg(enrichedSlide, ctx);
      map.set(slideWithId.id, result.svg);
    }
    return map;
  }, [slides, slideSize]);

  const getThumbnailSvg = useCallback(
    (slideWithId: SlideWithId): string => thumbnailMap.get(slideWithId.id) ?? "",
    [thumbnailMap],
  );

  return { getThumbnailSvg };
}
