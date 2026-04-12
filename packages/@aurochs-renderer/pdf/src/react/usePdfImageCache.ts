/**
 * @file React hook for PdfImageCache lifecycle and deferred-render subscription.
 *
 * Two usage modes:
 *
 * 1. **Owned cache** (no argument): Creates a new cache on mount, disposes on unmount.
 *    Uses `objectUrlStrategy()` by default (browser environment).
 *    Used by PdfEditor which manages its own cache.
 *
 * 2. **External cache** (pass existing cache): Subscribes to an externally-owned cache
 *    without creating or disposing it. Used by PdfViewer which gets its cache
 *    from PdfRenderSession.
 *
 * Both modes subscribe to deferred-encode notifications and trigger React
 * re-renders when background image encoding completes.
 */

import { useEffect, useRef, useState } from "react";
import { createPdfImageCache, objectUrlStrategy, type PdfImageCache, type PdfImageUrlStrategy } from "../image-cache";
import type { PdfImageUrlResolver } from "../types";

export type UsePdfImageCacheResult = {
  /** The underlying cache instance. */
  readonly imageCache: PdfImageCache;
  /** Stable resolver function — pass to PdfSvgRenderOptions.imageUrlResolver. */
  readonly imageUrlResolver: PdfImageUrlResolver;
};

/**
 * Manage a PdfImageCache with React lifecycle.
 *
 * @param externalCache - If provided, subscribe to this cache without
 *   owning it (no creation/disposal). If omitted, create and own a new cache.
 * @param strategy - URL generation strategy for owned caches.
 *   Ignored when externalCache is provided. Default: `objectUrlStrategy()`.
 *
 * Usage (owned):
 * ```tsx
 * const { imageUrlResolver } = usePdfImageCache();
 * ```
 *
 * Usage (external, e.g. from PdfRenderSession):
 * ```tsx
 * const { imageUrlResolver } = usePdfImageCache(session.imageCache);
 * ```
 */
export function usePdfImageCache(externalCache?: PdfImageCache, strategy?: PdfImageUrlStrategy): UsePdfImageCacheResult {
  const ownedCacheRef = useRef<PdfImageCache | null>(null);
  if (!externalCache && ownedCacheRef.current === null) {
    ownedCacheRef.current = createPdfImageCache(strategy ?? objectUrlStrategy());
  }

  const cache = externalCache ?? ownedCacheRef.current!;
  const isOwned = !externalCache;

  // Force re-render when background encoding completes.
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = cache.subscribe(() => setTick((n) => n + 1));
    return () => {
      unsub();
      if (isOwned) {
        cache.dispose();
      }
    };
  }, [cache, isOwned]);

  return {
    imageCache: cache,
    imageUrlResolver: cache.resolve,
  };
}
