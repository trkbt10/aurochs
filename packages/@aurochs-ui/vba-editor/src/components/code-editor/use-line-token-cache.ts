/**
 * @file Line Token Cache Hook
 *
 * LRU cache for tokenized lines to avoid re-tokenizing unchanged lines.
 */

import { useCallback, useRef } from "react";
import { tokenizeLine, type Token } from "./syntax-highlight";

// =============================================================================
// Types
// =============================================================================

export type LineTokenCache = {
  /** Get cached tokens for a line, tokenizing if not cached */
  readonly getTokens: (line: string) => readonly Token[];
  /** Clear the entire cache */
  readonly clear: () => void;
};

// =============================================================================
// LRU Cache Implementation
// =============================================================================

/**
 * Simple LRU cache using Map's insertion order.
 * Map maintains insertion order, so we can evict the oldest entries.
 */
class LRUCache<K, V> {
  private readonly cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Delete first to update insertion order if exists
    this.cache.delete(key);
    this.cache.set(key, value);

    // Evict oldest entries if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// =============================================================================
// Hook
// =============================================================================

const DEFAULT_CACHE_SIZE = 2000;

/**
 * Hook that provides an LRU cache for tokenized lines.
 *
 * @param maxSize - Maximum number of lines to cache (default: 2000)
 * @returns Cache accessor with getTokens and clear methods
 *
 * @example
 * ```tsx
 * const tokenCache = useLineTokenCache();
 *
 * // In render:
 * const tokens = tokenCache.getTokens(line);
 * ```
 */
export function useLineTokenCache(maxSize: number = DEFAULT_CACHE_SIZE): LineTokenCache {
  const cacheRef = useRef<LRUCache<string, readonly Token[]> | null>(null);

  // Lazy initialization
  if (cacheRef.current === null) {
    cacheRef.current = new LRUCache(maxSize);
  }

  const getTokens = useCallback((line: string): readonly Token[] => {
    const cache = cacheRef.current!;
    const cached = cache.get(line);
    if (cached !== undefined) {
      return cached;
    }

    const tokens = tokenizeLine(line);
    cache.set(line, tokens);
    return tokens;
  }, []);

  const clear = useCallback((): void => {
    cacheRef.current?.clear();
  }, []);

  return { getTokens, clear };
}
