/**
 * @file Lazy SVG Cache Hook
 *
 * Provides lazy generation and caching for SVG content.
 * Generates SVG only when requested, then caches it with LRU eviction.
 */

import { useCallback, useRef } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of the useLazySvgCache hook
 */
export type UseLazySvgCacheResult = {
  /**
   * Get SVG from cache, or generate and cache if not present
   *
   * @param key - Cache key (e.g., slide ID)
   * @param generator - Function to generate SVG if not cached
   * @returns The cached or newly generated SVG string
   */
  readonly getOrGenerate: (key: string, generator: () => string) => string;

  /**
   * Check if a key is in the cache
   */
  readonly has: (key: string) => boolean;

  /**
   * Clear specific key or all cache
   *
   * @param key - Optional key to clear. If omitted, clears all cache
   */
  readonly clear: (key?: string) => void;

  /**
   * Current number of items in the cache
   */
  readonly size: number;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Lazy SVG cache hook with LRU eviction
 *
 * Provides a stable cache that persists across renders without causing
 * re-renders when updated. Uses LRU (Least Recently Used) eviction to
 * limit memory usage.
 *
 * @param maxSize - Maximum number of items to cache (default: 50)
 * @returns Cache operations
 *
 * @example
 * ```tsx
 * import { renderSlideToSvg } from "../../../svg";
 *
 * const cache = useLazySvgCache(100);
 *
 * const renderThumbnail = useCallback((slideId: string) => {
 *   const svg = cache.getOrGenerate(
 *     slideId,
 *     () => renderSlideToSvg(presentation.getSlide(slideNumber)).svg
 *   );
 *   return <SvgContentRenderer svg={svg} />;
 * }, [cache, presentation]);
 * ```
 */
export function useLazySvgCache(maxSize = 50): UseLazySvgCacheResult {
  const cacheRef = useRef<Map<string, string>>(new Map());
  const orderRef = useRef<string[]>([]);

  const getOrGenerate = useCallback(
    (key: string, generator: () => string): string => {
      const cache = cacheRef.current;
      const order = orderRef.current;

      if (cache.has(key)) {
        // Move to end for LRU (most recently used)
        const idx = order.indexOf(key);
        if (idx !== -1) {
          order.splice(idx, 1);
          order.push(key);
        }
        return cache.get(key)!;
      }

      // Generate and cache
      const value = generator();
      cache.set(key, value);
      order.push(key);

      // Evict oldest entries if over limit
      while (cache.size > maxSize && order.length > 0) {
        const oldest = order.shift();
        if (oldest !== undefined) {
          cache.delete(oldest);
        }
      }

      return value;
    },
    [maxSize],
  );

  const has = useCallback((key: string): boolean => {
    return cacheRef.current.has(key);
  }, []);

  const clear = useCallback((key?: string): void => {
    if (key === undefined) {
      cacheRef.current.clear();
      orderRef.current.length = 0;
    } else {
      cacheRef.current.delete(key);
      const idx = orderRef.current.indexOf(key);
      if (idx !== -1) {
        orderRef.current.splice(idx, 1);
      }
    }
  }, []);

  return {
    getOrGenerate,
    has,
    clear,
    get size() {
      return cacheRef.current.size;
    },
  };
}
