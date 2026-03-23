/**
 * @file Hook for cached slide thumbnail rendering
 *
 * Provides efficient thumbnail generation with caching based on slide reference equality.
 */

import { useRef, useMemo, useCallback } from "react";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ZipFile } from "@aurochs-office/opc";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createCoreRenderContext, createRenderContext as createApiRenderContext } from "@aurochs-renderer/pptx";
import type { RenderContext } from "@aurochs-renderer/pptx";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import { enrichSlideContent } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { createDefaultChart } from "@aurochs-builder/chart";
import {
  createThumbnailCache,
  getCachedThumbnail,
  setCachedThumbnail,
  pruneCacheForSlideIds,
  type ThumbnailCache,
} from "./cache";

// =============================================================================
// Helpers
// =============================================================================

/** Type guard: checks if context is a full RenderContext with fileReader */
function isRenderContext(ctx: unknown): ctx is RenderContext {
  return ctx !== null && typeof ctx === "object" && "fileReader" in ctx;
}

/** Build render context based on available API slide data */
function buildRenderContext(
  apiSlide: SlideWithId["apiSlide"],
  zipFile: ZipFile,
  slideSize: { width: Pixels; height: Pixels },
) {
  if (apiSlide) {
    return createApiRenderContext({ apiSlide, zip: zipFile, slideSize });
  }
  return createCoreRenderContext({ slideSize });
}

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
export function useSlideThumbnails(options: UseSlideThumbnailsOptions): SlideThumbnailRenderer {
  const { slideWidth, slideHeight, slides, zipFile } = options;
  const cacheRef = useRef<ThumbnailCache>(createThumbnailCache());

  // Base slide size for render context
  const slideSize = useMemo(() => ({ width: slideWidth, height: slideHeight }), [slideWidth, slideHeight]);

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
      const ctx = buildRenderContext(apiSlide, zipFile, slideSize);

      // Enrich slide with chart/diagram data from PPTX archive
      const enrichedSlide = isRenderContext(ctx)
        ? enrichSlideContent(slide, ctx.fileReader, ctx.resourceStore)
        : slide;

      // Populate editor-created charts not in archive
      if (ctx.resourceStore) {
        for (const shape of enrichedSlide.shapes) {
          if (shape.type !== "graphicFrame") continue;
          if (shape.content.type !== "chart") continue;
          const { resourceId, chartType } = shape.content.data;
          if (ctx.resourceStore.has(resourceId as string)) continue;
          if (chartType === undefined) continue;
          const chart = createDefaultChart(chartType);
          ctx.resourceStore.set(resourceId as string, {
            kind: "chart",
            source: "created",
            data: new ArrayBuffer(0),
            parsed: chart,
          });
        }
      }

      // Render the edited domain slide and cache
      const result = renderSlideSvg(enrichedSlide, ctx);
      setCachedThumbnail({ cache, slideId: id, slide, svg: result.svg });
      return result.svg;
    },
    [slideSize, zipFile],
  );

  return { getThumbnailSvg };
}
