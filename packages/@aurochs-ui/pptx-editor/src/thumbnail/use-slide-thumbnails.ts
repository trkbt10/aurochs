/**
 * @file Hook for cached slide thumbnail rendering
 */

import { useRef, useMemo, useCallback } from "react";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";

import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createRenderContext, createCoreRenderContext } from "@aurochs-renderer/pptx";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { prepareSlide, registerEditorResources } from "../resource/register-slide-resources";
import {
  createThumbnailCache,
  getCachedThumbnail,
  setCachedThumbnail,
  pruneCacheForSlideIds,
  type ThumbnailCache,
} from "./cache";

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
  const cacheRef = useRef<ThumbnailCache>(createThumbnailCache());
  const slideSize = useMemo(() => ({ width: slideWidth, height: slideHeight }), [slideWidth, slideHeight]);

  useMemo(() => {
    const validIds = new Set(slides.map((s) => s.id));
    pruneCacheForSlideIds(cacheRef.current, validIds);
  }, [slides]);

  const getThumbnailSvg = useCallback(
    (slideWithId: SlideWithId): string => {
      const { id, slide, apiSlide } = slideWithId;
      const cache = cacheRef.current;

      const cached = getCachedThumbnail(cache, id, slide);
      if (cached !== undefined) {
        return cached;
      }

      let ctx: ReturnType<typeof createCoreRenderContext>;
      let enrichedSlide: typeof slide;

      if (apiSlide) {
        const renderCtx = createRenderContext({ apiSlide, slideSize });
        ctx = renderCtx;
        enrichedSlide = prepareSlide(slide, ctx.resourceStore, renderCtx.fileReader);
      } else {
        ctx = createCoreRenderContext({ slideSize, resourceStore: createResourceStore() });
        registerEditorResources(slide, ctx.resourceStore);
        enrichedSlide = slide;
      }

      const result = renderSlideSvg(enrichedSlide, ctx);
      setCachedThumbnail({ cache, slideId: id, slide, svg: result.svg });
      return result.svg;
    },
    [slideSize],
  );

  return { getThumbnailSvg };
}
