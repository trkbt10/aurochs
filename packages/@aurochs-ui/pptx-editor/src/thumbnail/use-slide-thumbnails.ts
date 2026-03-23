/**
 * @file Hook for cached slide thumbnail rendering
 */

import { useRef, useMemo, useCallback } from "react";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ZipFile } from "@aurochs-office/opc";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createRenderContext } from "@aurochs-renderer/pptx";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { prepareSlide } from "../resource/register-slide-resources";
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
  readonly zipFile: ZipFile;
};

export type SlideThumbnailRenderer = {
  readonly getThumbnailSvg: (slideWithId: SlideWithId) => string;
};

// =============================================================================
// Hook
// =============================================================================

export function useSlideThumbnails(options: UseSlideThumbnailsOptions): SlideThumbnailRenderer {
  const { slideWidth, slideHeight, slides, zipFile } = options;
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

      // No branching: createRenderContext handles apiSlide present or absent
      const ctx = createRenderContext({ apiSlide, zip: zipFile, slideSize });

      if (!ctx.resourceStore) {
        throw new Error("useSlideThumbnails: ctx.resourceStore is required");
      }

      const enrichedSlide = prepareSlide(slide, ctx.resourceStore, ctx.fileReader);
      const result = renderSlideSvg(enrichedSlide, ctx);
      setCachedThumbnail({ cache, slideId: id, slide, svg: result.svg });
      return result.svg;
    },
    [slideSize, zipFile],
  );

  return { getThumbnailSvg };
}
