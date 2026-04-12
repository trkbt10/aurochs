/**
 * @file Browser font loader implementation using Local Font Access API
 *
 * Uses the Local Font Access API to enumerate and load system fonts.
 * Falls back to CSS Font Loading API for availability checks.
 *
 * @see https://developer.chrome.com/docs/capabilities/web-apis/local-fonts
 */

import { parse as parseFont } from "opentype.js";
import type { FontLoader } from "../../font/loader";
import type { AbstractFont, FontLoadOptions, LoadedFont } from "../../font/types";
import { CJK_FALLBACK_FONTS } from "../../font/helpers";

/**
 * Parse font data and cast to AbstractFont
 *
 * opentype.js Font type is compatible with AbstractFont interface.
 * This function provides a type-safe way to convert.
 */
function parseOpentypeAsAbstractFont(data: ArrayBuffer): AbstractFont {
  const font = parseFont(data);
  // opentype.js Font satisfies AbstractFont interface
  // eslint-disable-next-line custom/no-as-outside-guard -- opentype.js Font is compatible with AbstractFont
  return font as unknown as AbstractFont;
}

/**
 * Type definitions for Local Font Access API
 */
type FontData = {
  readonly family: string;
  readonly fullName: string;
  readonly postscriptName: string;
  readonly style: string;
  blob(): Promise<Blob>;
};

type WindowWithLocalFonts = Window & {
  queryLocalFonts?: (options?: { postscriptNames?: string[] }) => Promise<FontData[]>;
};

/**
 * Get font weight from font style name
 */
function getWeightFromStyle(style: string): number {
  const lower = style.toLowerCase();
  if (lower.includes("thin") || lower.includes("hairline")) {
    return 100;
  }
  if (lower.includes("extralight") || lower.includes("ultralight")) {
    return 200;
  }
  if (lower.includes("light")) {
    return 300;
  }
  if (lower.includes("regular") || lower.includes("normal") || lower.includes("book")) {
    return 400;
  }
  if (lower.includes("medium")) {
    return 500;
  }
  if (lower.includes("semibold") || lower.includes("demibold")) {
    return 600;
  }
  if (lower.includes("extrabold") || lower.includes("ultrabold")) {
    return 800;
  }
  if (lower.includes("bold")) {
    return 700;
  }
  if (lower.includes("black") || lower.includes("heavy")) {
    return 900;
  }
  return 400;
}

/**
 * Get font style from font style name
 */
function getFontStyleFromName(style: string): "normal" | "italic" | "oblique" {
  const lower = style.toLowerCase();
  if (lower.includes("italic")) {
    return "italic";
  }
  if (lower.includes("oblique")) {
    return "oblique";
  }
  return "normal";
}

/**
 * Calculate weight distance (closer to 0 is better)
 */
function weightDistance(requested: number, actual: number): number {
  return Math.abs(requested - actual);
}

/**
 * Check if Local Font Access API is available
 */
export function isBrowserFontLoaderSupported(): boolean {
  return typeof window !== "undefined" && "queryLocalFonts" in window;
}

/** Browser font loader with permission tracking */
export type BrowserFontLoaderInstance = FontLoader & {
  /** Check if permission has been granted */
  hasPermission(): boolean;
  /** List available font families */
  listFontFamilies(): Promise<readonly string[]>;
  /** Load a fallback font for CJK characters */
  loadFallbackFont(options: FontLoadOptions): Promise<LoadedFont | undefined>;
};

/**
 * Detect platform from user agent
 */
function detectPlatform(): "darwin" | "win32" | "linux" {
  if (typeof navigator === "undefined") {
    return "darwin";
  }

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) {
    return "darwin";
  }
  if (ua.includes("win")) {
    return "win32";
  }
  return "linux";
}

/**
 * Create a browser font loader using Local Font Access API
 *
 * Requires user permission to access local fonts. The browser will
 * prompt the user when queryLocalFonts() is first called.
 */
export function createBrowserFontLoader(): BrowserFontLoaderInstance {
  const fontIndexRef = { value: null as Map<string, FontData[]> | null };
  const indexPromiseRef = { value: null as Promise<void> | null };
  const permissionGrantedRef = { value: false };

  async function buildFontIndex(): Promise<void> {
    if (!isBrowserFontLoaderSupported()) {
      fontIndexRef.value = new Map();
      return;
    }

    try {
      const fonts = await (window as WindowWithLocalFonts).queryLocalFonts!();
      permissionGrantedRef.value = true;

      // Index by family name (lowercase)
      const index = new Map<string, FontData[]>();
      for (const font of fonts) {
        const familyLower = font.family.toLowerCase();
        const existing = index.get(familyLower) ?? [];
        index.set(familyLower, [...existing, font]);
      }

      fontIndexRef.value = index;
    } catch (error) {
      console.debug("Font access API error:", error);
      fontIndexRef.value = new Map();
    }
  }

  async function ensureIndex(): Promise<Map<string, FontData[]>> {
    if (fontIndexRef.value) {
      return fontIndexRef.value;
    }

    if (!indexPromiseRef.value) {
      indexPromiseRef.value = buildFontIndex();
    }

    await indexPromiseRef.value;
    return fontIndexRef.value!;
  }

  async function loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    const index = await ensureIndex();
    const familyLower = options.family.toLowerCase();
    const variants = index.get(familyLower);

    if (!variants || variants.length === 0) {
      return undefined;
    }

    // Find best match
    const targetWeight = options.weight ?? 400;
    const targetStyle = options.style ?? "normal";

    // Sort by match quality
    const sorted = [...variants].sort((a, b) => {
      const aWeight = getWeightFromStyle(a.style);
      const bWeight = getWeightFromStyle(b.style);
      const aFontStyle = getFontStyleFromName(a.style);
      const bFontStyle = getFontStyleFromName(b.style);

      // Style match is primary
      const aStyleMatch = aFontStyle === targetStyle ? 0 : 1;
      const bStyleMatch = bFontStyle === targetStyle ? 0 : 1;
      if (aStyleMatch !== bStyleMatch) {
        return aStyleMatch - bStyleMatch;
      }

      // Weight distance is secondary
      return weightDistance(targetWeight, aWeight) - weightDistance(targetWeight, bWeight);
    });

    const bestMatch = sorted[0];
    if (!bestMatch) {
      return undefined;
    }

    // Load the font data
    try {
      const blob = await bestMatch.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const font = parseOpentypeAsAbstractFont(arrayBuffer);

      return {
        font,
        family: bestMatch.family,
        weight: getWeightFromStyle(bestMatch.style),
        style: getFontStyleFromName(bestMatch.style),
        postscriptName: bestMatch.postscriptName,
      };
    } catch (error) {
      console.debug("Font loading failed - intentionally ignored" + ":", error);
      return undefined;
    }
  }

  async function isFontAvailable(family: string): Promise<boolean> {
    // First try Local Font Access API
    const index = await ensureIndex();
    if (index.has(family.toLowerCase())) {
      return true;
    }

    // Fall back to CSS Font Loading API
    if (typeof document !== "undefined" && document.fonts) {
      return document.fonts.check(`16px "${family}"`);
    }

    return false;
  }

  async function listFontFamilies(): Promise<readonly string[]> {
    const index = await ensureIndex();
    // Return original family names (from first variant of each family)
    return Array.from(index.values()).map((variants) => variants[0].family);
  }

  async function loadFallbackFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    // Detect platform (best effort in browser)
    const platform = detectPlatform();
    const fallbackFonts = CJK_FALLBACK_FONTS[platform] ?? CJK_FALLBACK_FONTS.darwin;

    for (const family of fallbackFonts) {
      const font = await loadFont({
        family,
        weight: options.weight,
        style: options.style,
      });
      if (font) {
        return font;
      }
    }

    return undefined;
  }

  return {
    loadFont,
    isFontAvailable,
    listFontFamilies,
    loadFallbackFont,
    hasPermission(): boolean {
      return permissionGrantedRef.value;
    },
  };
}
