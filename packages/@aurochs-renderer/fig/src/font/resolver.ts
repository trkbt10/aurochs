/**
 * @file Font resolver - resolves Figma fonts to CSS font stacks
 */

import type {
  FigmaFontRef,
  ResolvedFont,
  FontResolverConfig,
  FontAvailabilityChecker,
} from "./types";
import { detectWeight, FONT_WEIGHTS } from "./weight";
import { detectStyle } from "./style";
import { COMMON_FONT_MAPPINGS, getDefaultFallbacks } from "./mappings";

/**
 * Default font resolver configuration
 */
const DEFAULT_CONFIG: Required<FontResolverConfig> = {
  fontMappings: COMMON_FONT_MAPPINGS,
  defaultFallbacks: ["sans-serif"],
  availabilityChecker: {
    isAvailable: () => true, // Assume all fonts are available by default
  },
};

/**
 * Font resolver class
 *
 * Resolves Figma font references to CSS font stacks with appropriate
 * fallbacks based on font availability and mappings.
 */
/** Resolve an availability check that may be synchronous or async */
async function resolveAvailability(result: boolean | Promise<boolean>): Promise<boolean> {
  if (typeof result === "boolean") {
    return result;
  }
  return result;
}

/** Font resolver instance */
export type FontResolverInstance = {
  /** Resolve a Figma font reference to CSS font properties */
  resolve(fontRef: FigmaFontRef): ResolvedFont;
  /** Resolve a Figma font reference asynchronously */
  resolveAsync(fontRef: FigmaFontRef): Promise<ResolvedFont>;
  /** Clear the resolution cache */
  clearCache(): void;
};

/** Resolves Figma font names to CSS font stacks with fallbacks */
export function createFontResolver(config?: FontResolverConfig): FontResolverInstance {
  const resolvedConfig: Required<FontResolverConfig> = {
    fontMappings: config?.fontMappings ?? DEFAULT_CONFIG.fontMappings,
    defaultFallbacks: config?.defaultFallbacks ?? DEFAULT_CONFIG.defaultFallbacks,
    availabilityChecker: config?.availabilityChecker ?? DEFAULT_CONFIG.availabilityChecker,
  };
  const cache = new Map<string, ResolvedFont>();

  function buildFallbackChain(family: string): readonly string[] {
    // Check custom mappings first
    const mapped = resolvedConfig.fontMappings.get(family);
    if (mapped) {
      return mapped;
    }

    // Check common mappings
    const common = COMMON_FONT_MAPPINGS.get(family);
    if (common) {
      return common;
    }

    // Build generic fallback chain
    const genericFallbacks = getDefaultFallbacks(family);
    return [family, ...genericFallbacks];
  }

  function checkAvailability(family: string): boolean {
    const result = resolvedConfig.availabilityChecker.isAvailable(family);
    // Handle both sync and async (for sync, Promise.resolve wraps it)
    if (typeof result === "boolean") {
      return result;
    }
    // For async, we can't wait - return true optimistically
    // Caller should use resolveAsync for accurate results
    return true;
  }

  function buildFontFamilyString(chain: readonly string[]): string {
    return chain
      .map((f) => {
        // Don't quote generic family names
        if (isGenericFamily(f)) {
          return f;
        }
        // Quote family names that contain spaces or special characters
        if (f.includes(" ") || f.includes("-") || /^\d/.test(f)) {
          return `"${f}"`;
        }
        return f;
      })
      .join(", ");
  }

  function doResolve(fontRef: FigmaFontRef): ResolvedFont {
    const { family, style } = fontRef;

    // Detect weight and style from Figma style string
    const fontWeight = detectWeight(style) ?? FONT_WEIGHTS.REGULAR;
    const fontStyle = detectStyle(style);

    // Build fallback chain
    const fallbackChain = buildFallbackChain(family);
    const isExactMatch = checkAvailability(family);

    // Build CSS font-family string
    const fontFamily = buildFontFamilyString(fallbackChain);

    return {
      fontFamily,
      fontWeight,
      fontStyle,
      isExactMatch,
      source: fontRef,
      fallbackChain,
    };
  }

  return {
    resolve(fontRef: FigmaFontRef): ResolvedFont {
      const cacheKey = `${fontRef.family}|${fontRef.style}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const resolved = doResolve(fontRef);
      cache.set(cacheKey, resolved);
      return resolved;
    },

    async resolveAsync(fontRef: FigmaFontRef): Promise<ResolvedFont> {
      const { family, style } = fontRef;

      const fontWeight = detectWeight(style) ?? FONT_WEIGHTS.REGULAR;
      const fontStyle = detectStyle(style);
      const fallbackChain = buildFallbackChain(family);

      // Check availability asynchronously
      const availabilityResult = resolvedConfig.availabilityChecker.isAvailable(family);
      const isExactMatch = await resolveAvailability(availabilityResult);

      const fontFamily = buildFontFamilyString(fallbackChain);

      return {
        fontFamily,
        fontWeight,
        fontStyle,
        isExactMatch,
        source: fontRef,
        fallbackChain,
      };
    },

    clearCache(): void {
      cache.clear();
    },
  };
}

/**
 * Generic CSS font family keywords
 */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
]);

/**
 * Check if a font family name is a generic CSS keyword
 */
function isGenericFamily(family: string): boolean {
  return GENERIC_FAMILIES.has(family);
}

/**
 * Browser font availability checker using CSS Font Loading API
 */
export function createBrowserAvailabilityChecker(): FontAvailabilityChecker {
  return {
    isAvailable(family: string): boolean | Promise<boolean> {
      if (typeof document === "undefined" || !document.fonts) {
        return true; // Can't check, assume available
      }

      // Check if font is already loaded
      const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return document.fonts.check(`16px "${family}"`, testString);
    },
  };
}
