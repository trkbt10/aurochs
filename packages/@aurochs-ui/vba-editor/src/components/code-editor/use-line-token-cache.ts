/**
 * @file Line Token Cache Hook
 *
 * LRU cache for tokenized lines to avoid re-tokenizing unchanged lines.
 * Supports module-scoped caching to preserve tokens across module switches.
 */

import { useCallback, useRef, useMemo } from "react";
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
 * LRU cache instance type.
 */
type LRUCacheInstance<K, V> = {
  readonly get: (key: K) => V | undefined;
  readonly set: (key: K, value: V) => void;
  readonly clear: () => void;
};

/**
 * Create an LRU cache using Map's insertion order.
 * Map maintains insertion order, so we can evict the oldest entries.
 */
function createLRUCache<K, V>(maxSize: number): LRUCacheInstance<K, V> {
  const cache = new Map<K, V>();

  const get = (key: K): V | undefined => {
    const value = cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      cache.delete(key);
      cache.set(key, value);
    }
    return value;
  };

  const set = (key: K, value: V): void => {
    // Delete first to update insertion order if exists
    cache.delete(key);
    cache.set(key, value);

    // Evict oldest entries if over capacity
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
  };

  const clear = (): void => {
    cache.clear();
  };

  return { get, set, clear };
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
  const cacheRef = useRef<LRUCacheInstance<string, readonly Token[]> | null>(null);

  // Lazy initialization
  if (cacheRef.current === null) {
    cacheRef.current = createLRUCache(maxSize);
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

// =============================================================================
// Module-Scoped Cache
// =============================================================================

const DEFAULT_MODULE_CACHE_SIZE = 1000;
const MAX_MODULES = 10;

/**
 * Global storage for module-scoped caches.
 * Key: module name, Value: LRU cache for that module.
 * Limited to MAX_MODULES to prevent memory leaks.
 */
const moduleCaches = new Map<string, LRUCacheInstance<string, readonly Token[]>>();

/**
 * Get or create a cache for a specific module.
 */
function getModuleCache(
  moduleName: string,
  maxSize: number
): LRUCacheInstance<string, readonly Token[]> {
  const existing = moduleCaches.get(moduleName);
  if (existing) {
    return existing;
  }

  // Evict oldest module cache if we have too many
  if (moduleCaches.size >= MAX_MODULES) {
    const firstKey = moduleCaches.keys().next().value;
    if (firstKey !== undefined) {
      moduleCaches.delete(firstKey);
    }
  }

  const newCache = createLRUCache<string, readonly Token[]>(maxSize);
  moduleCaches.set(moduleName, newCache);
  return newCache;
}

/**
 * Hook that provides a module-scoped LRU cache for tokenized lines.
 *
 * Unlike `useLineTokenCache`, this preserves tokens when switching between modules.
 * Each module has its own cache, limited to MAX_MODULES total.
 *
 * @param moduleName - Name of the module (undefined uses fallback cache)
 * @param maxSize - Maximum number of lines to cache per module (default: 1000)
 * @returns Cache accessor with getTokens and clear methods
 *
 * @example
 * ```tsx
 * const tokenCache = useModuleTokenCache(activeModule?.name);
 *
 * // Switching modules preserves previous module's cache
 * const tokens = tokenCache.getTokens(line);
 * ```
 */
export function useModuleTokenCache(
  moduleName: string | undefined,
  maxSize: number = DEFAULT_MODULE_CACHE_SIZE
): LineTokenCache {
  // Use "__default__" for undefined module name
  const key = moduleName ?? "__default__";

  // Memoize cache reference for current module
  const cache = useMemo(() => getModuleCache(key, maxSize), [key, maxSize]);

  const getTokens = useCallback(
    (line: string): readonly Token[] => {
      const cached = cache.get(line);
      if (cached !== undefined) {
        return cached;
      }

      const tokens = tokenizeLine(line);
      cache.set(line, tokens);
      return tokens;
    },
    [cache]
  );

  const clear = useCallback((): void => {
    cache.clear();
  }, [cache]);

  return { getTokens, clear };
}
