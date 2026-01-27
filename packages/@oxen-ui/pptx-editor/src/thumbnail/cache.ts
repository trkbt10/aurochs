/**
 * @file Thumbnail cache for slide previews
 *
 * Caches rendered SVG strings for slide thumbnails using object identity.
 * Since Slide objects are immutable, reference equality is used for cache hit detection.
 */

import type { Slide } from "@oxen/pptx/domain/index";
import type { SlideId } from "@oxen/pptx/app";

// =============================================================================
// Types
// =============================================================================

/**
 * Single cache entry containing slide reference and rendered SVG
 */
export type ThumbnailCacheEntry = {
  readonly slideRef: Slide;
  readonly svg: string;
};

/**
 * Thumbnail cache mapping slide IDs to cache entries
 */
export type ThumbnailCache = Map<SlideId, ThumbnailCacheEntry>;

// =============================================================================
// Functions
// =============================================================================

/**
 * Create a new empty thumbnail cache
 */
export function createThumbnailCache(): ThumbnailCache {
  return new Map();
}

/**
 * Get cached thumbnail SVG if available and valid
 *
 * Uses reference equality to check cache validity.
 * Returns undefined if cache miss or stale.
 */
export function getCachedThumbnail(
  cache: ThumbnailCache,
  slideId: SlideId,
  slide: Slide
): string | undefined {
  const entry = cache.get(slideId);
  if (entry !== undefined && entry.slideRef === slide) {
    return entry.svg;
  }
  return undefined;
}

/**
 * Store rendered SVG in cache
 */
export function setCachedThumbnail(
  cache: ThumbnailCache,
  slideId: SlideId,
  slide: Slide,
  svg: string
): void {
  cache.set(slideId, { slideRef: slide, svg });
}

/**
 * Remove cache entries for slides that no longer exist
 *
 * Call this when the slide list changes to prevent memory leaks.
 */
export function pruneCacheForSlideIds(
  cache: ThumbnailCache,
  validSlideIds: Set<SlideId>
): void {
  for (const key of cache.keys()) {
    if (!validSlideIds.has(key)) {
      cache.delete(key);
    }
  }
}
