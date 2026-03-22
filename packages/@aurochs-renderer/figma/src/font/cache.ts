/**
 * @file Font caching utilities
 */

import type { FontLoader } from "./loader";
import type { FontLoadOptions, LoadedFont } from "./types";

/** Font cache for loaded fonts */
export type FontCache = {
  /** Get cached font */
  get(options: FontLoadOptions): LoadedFont | undefined;
  /** Set cached font */
  set(options: FontLoadOptions, font: LoadedFont): void;
  /** Check if font is cached */
  has(options: FontLoadOptions): boolean;
  /** Clear cache */
  clear(): void;
  /** Get cache size */
  readonly size: number;
};

/** Generate cache key from font load options */
function getCacheKey(options: FontLoadOptions): string {
  return `${options.family}:${options.weight ?? 400}:${options.style ?? "normal"}`;
}

/** Create a font cache */
export function createFontCache(): FontCache {
  const cache = new Map<string, LoadedFont>();

  return {
    get(options) {
      return cache.get(getCacheKey(options));
    },
    set(options, font) {
      cache.set(getCacheKey(options), font);
    },
    has(options) {
      return cache.has(getCacheKey(options));
    },
    clear() {
      cache.clear();
    },
    get size() {
      return cache.size;
    },
  };
}

/** Caching wrapper for font loaders */
export type CachingFontLoader = FontLoader & {
  /** Clear the font cache */
  clearCache(): void;
};

/** Create a caching wrapper for a font loader */
export function createCachingFontLoader(innerLoader: FontLoader): CachingFontLoader {
  const fontCache = createFontCache();
  const fallbackCache = createFontCache();

  return {
    async loadFont(options) {
      const cached = fontCache.get(options);
      if (cached) {
        return cached;
      }

      const font = await innerLoader.loadFont(options);
      if (font) {
        fontCache.set(options, font);
      }

      return font;
    },

    async isFontAvailable(family) {
      return innerLoader.isFontAvailable(family);
    },

    async listFontFamilies() {
      if (innerLoader.listFontFamilies) {
        return innerLoader.listFontFamilies();
      }
      return [];
    },

    async loadFallbackFont(options) {
      const fallbackKey = { family: "__CJK_FALLBACK__", weight: options.weight, style: options.style };
      const cached = fallbackCache.get(fallbackKey);
      if (cached) {
        return cached;
      }

      if (innerLoader.loadFallbackFont) {
        const font = await innerLoader.loadFallbackFont(options);
        if (font) {
          fallbackCache.set(fallbackKey, font);
        }
        return font;
      }

      return undefined;
    },

    clearCache() {
      fontCache.clear();
      fallbackCache.clear();
    },
  };
}
