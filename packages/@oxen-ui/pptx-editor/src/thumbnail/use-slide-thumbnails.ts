/**
 * @file Hook for cached slide thumbnail rendering
 *
 * Provides efficient thumbnail generation with caching based on slide reference equality.
 */

import { useRef, useMemo, useCallback } from "react";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { ZipFile } from "@oxen/pptx/domain";
import { renderSlideSvg } from "@oxen/pptx-render/svg";
import { createCoreRenderContext } from "@oxen/pptx-render";
import type { SlideWithId } from "@oxen/pptx/app";
import { createRenderContext as createApiRenderContext } from "@oxen/pptx/app";
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
  /** ZipFile adapter for PPTX resources (required for render context building) */
  readonly zipFile: ZipFile;
};

export type SlideThumbnailRenderer = {
  /**
   * Get thumbnail SVG for a slide.
   * Returns cached version if available, otherwise renders and caches.
   */
  readonly getThumbnailSvg: (slideWithId: SlideWithId) => string;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for generating cached slide thumbnails
 *
 * Uses reference equality for cache invalidation - when a slide is modified,
 * its reference changes, automatically invalidating the cache entry.
 */
export function useSlideThumbnails(
  options: UseSlideThumbnailsOptions
): SlideThumbnailRenderer {
  const { slideWidth, slideHeight, slides, zipFile } = options;
  const cacheRef = useRef<ThumbnailCache>(createThumbnailCache());

  // Base slide size for render context
  const slideSize = useMemo(
    () => ({ width: slideWidth, height: slideHeight }),
    [slideWidth, slideHeight]
  );

  // Prune stale cache entries when slide list changes
  useMemo(() => {
    const validIds = new Set(slides.map((s) => s.id));
    pruneCacheForSlideIds(cacheRef.current, validIds);
  }, [slides]);

  const getThumbnailSvg = useCallback(
    (slideWithId: SlideWithId): string => {
      const { id, slide, apiSlide } = slideWithId;
      const cache = cacheRef.current;

      // Check cache first
      const cached = getCachedThumbnail(cache, id, slide);
      if (cached !== undefined) {
        return cached;
      }

      // Build render context with full theme/master/layout context if available
      // Layout shapes are now included in context and rendered by renderSlideSvg
      const ctx = apiSlide
        ? createApiRenderContext(apiSlide, zipFile, slideSize)
        : createCoreRenderContext({ slideSize });

      // Render the edited domain slide and cache
      const result = renderSlideSvg(slide, ctx);
      setCachedThumbnail(cache, id, slide, result.svg);
      return result.svg;
    },
    [slideSize, zipFile]
  );

  return { getThumbnailSvg };
}
