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
export class FontResolver {
  private readonly config: Required<FontResolverConfig>;
  private readonly cache = new Map<string, ResolvedFont>();

  constructor(config?: FontResolverConfig) {
    this.config = {
      fontMappings: config?.fontMappings ?? DEFAULT_CONFIG.fontMappings,
      defaultFallbacks: config?.defaultFallbacks ?? DEFAULT_CONFIG.defaultFallbacks,
      availabilityChecker: config?.availabilityChecker ?? DEFAULT_CONFIG.availabilityChecker,
    };
  }

  /**
   * Resolve a Figma font reference to CSS font properties
   *
   * @param fontRef - Figma font reference
   * @returns Resolved font information
   */
  resolve(fontRef: FigmaFontRef): ResolvedFont {
    const cacheKey = `${fontRef.family}|${fontRef.style}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const resolved = this.doResolve(fontRef);
    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  /**
   * Resolve a Figma font reference (internal implementation)
   */
  private doResolve(fontRef: FigmaFontRef): ResolvedFont {
    const { family, style } = fontRef;

    // Detect weight and style from Figma style string
    const fontWeight = detectWeight(style) ?? FONT_WEIGHTS.REGULAR;
    const fontStyle = detectStyle(style);

    // Build fallback chain
    const fallbackChain = this.buildFallbackChain(family);
    const isExactMatch = this.checkAvailability(family);

    // Build CSS font-family string
    const fontFamily = this.buildFontFamilyString(fallbackChain);

    return {
      fontFamily,
      fontWeight,
      fontStyle,
      isExactMatch,
      source: fontRef,
      fallbackChain,
    };
  }

  /**
   * Build fallback chain for a font family
   */
  private buildFallbackChain(family: string): readonly string[] {
    // Check custom mappings first
    const mapped = this.config.fontMappings.get(family);
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

  /**
   * Check if a font family is available
   */
  private checkAvailability(family: string): boolean {
    const result = this.config.availabilityChecker.isAvailable(family);
    // Handle both sync and async (for sync, Promise.resolve wraps it)
    if (typeof result === "boolean") {
      return result;
    }
    // For async, we can't wait - return true optimistically
    // Caller should use resolveAsync for accurate results
    return true;
  }

  /**
   * Resolve a Figma font reference asynchronously
   *
   * Use this when font availability needs to be checked asynchronously
   * (e.g., with CSS Font Loading API)
   */
  async resolveAsync(fontRef: FigmaFontRef): Promise<ResolvedFont> {
    const { family, style } = fontRef;

    const fontWeight = detectWeight(style) ?? FONT_WEIGHTS.REGULAR;
    const fontStyle = detectStyle(style);
    const fallbackChain = this.buildFallbackChain(family);

    // Check availability asynchronously
    const availabilityResult = this.config.availabilityChecker.isAvailable(family);
    const isExactMatch =
      typeof availabilityResult === "boolean"
        ? availabilityResult
        : await availabilityResult;

    const fontFamily = this.buildFontFamilyString(fallbackChain);

    return {
      fontFamily,
      fontWeight,
      fontStyle,
      isExactMatch,
      source: fontRef,
      fallbackChain,
    };
  }

  /**
   * Build CSS font-family string from fallback chain
   */
  private buildFontFamilyString(chain: readonly string[]): string {
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

  /**
   * Clear the resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }
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
 * Create a default font resolver
 */
export function createFontResolver(config?: FontResolverConfig): FontResolver {
  return new FontResolver(config);
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
