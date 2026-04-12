/**
 * @file OpenType.js based measurement provider
 *
 * Provides accurate text measurement using opentype.js font parsing.
 * Requires FontLoader to load font files.
 */

import type { FontLoader, LoadedFont, FontMetrics, AbstractFont } from "../../font/index";
import type { MeasurementProvider, FontSpec, TextMeasurement } from "./types";

/** OpenType.js based measurement provider instance */
export type OpentypeMeasurementProviderInstance = MeasurementProvider & {
  /** Preload fonts for later synchronous use */
  preloadFont(font: FontSpec): Promise<boolean>;
  /** Get ascender ratio (ascender / unitsPerEm) */
  getAscenderRatio(font: FontSpec): number;
  /** Get font metrics */
  getFontMetrics(font: FontSpec): FontMetrics;
};

/**
 * Create an OpenType.js based measurement provider
 *
 * Uses actual font files for precise text measurement.
 */
export function createOpentypeMeasurementProvider(fontLoader: FontLoader): OpentypeMeasurementProviderInstance {
  const fontCache = new Map<string, LoadedFont>();

  function getCacheKey(font: FontSpec): string {
    return `${font.fontFamily}:${font.fontWeight ?? 400}:${font.fontStyle ?? "normal"}`;
  }

  async function loadFontForSpec(font: FontSpec): Promise<LoadedFont | undefined> {
    const key = getCacheKey(font);
    const cached = fontCache.get(key);
    if (cached) {return cached;}

    const loaded = await fontLoader.loadFont({
      family: font.fontFamily,
      weight: font.fontWeight,
      style: font.fontStyle,
    });

    if (loaded) {
      fontCache.set(key, loaded);
    }

    return loaded;
  }

  function getCachedFont(font: FontSpec): AbstractFont | undefined {
    const key = getCacheKey(font);
    return fontCache.get(key)?.font;
  }

  function estimateMeasurement(text: string, font: FontSpec): TextMeasurement {
    const avgWidth = font.fontSize * 0.5;
    const letterSpacing = font.letterSpacing ?? 0;
    const width = text.length * avgWidth + (text.length - 1) * letterSpacing;
    const ascent = font.fontSize * 0.8;
    const descent = font.fontSize * 0.2;

    return {
      width,
      height: ascent + descent,
      ascent,
      descent,
    };
  }

  function estimateCharWidths(text: string, font: FontSpec): readonly number[] {
    const avgWidth = font.fontSize * 0.5;
    const letterSpacing = font.letterSpacing ?? 0;
    return Array.from(text).map((_, i) =>
      i < text.length - 1 ? avgWidth + letterSpacing : avgWidth
    );
  }

  function estimateFontMetrics(_font: FontSpec): FontMetrics {
    return {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
    };
  }

  function getFontMetrics(font: FontSpec): FontMetrics {
    const opentypeFont = getCachedFont(font);

    if (!opentypeFont) {
      return estimateFontMetrics(font);
    }

    return {
      unitsPerEm: opentypeFont.unitsPerEm,
      ascender: opentypeFont.ascender,
      descender: opentypeFont.descender,
      lineGap: (opentypeFont.tables?.hhea?.lineGap as number) ?? 0,
      capHeight: (opentypeFont.tables?.os2?.sCapHeight as number) ?? undefined,
      xHeight: (opentypeFont.tables?.os2?.sxHeight as number) ?? undefined,
    };
  }

  return {
    async preloadFont(font: FontSpec): Promise<boolean> {
      const loaded = await loadFontForSpec(font);
      return loaded !== undefined;
    },

    measureText(text: string, font: FontSpec): TextMeasurement {
      const opentypeFont = getCachedFont(font);

      if (!opentypeFont) {
        return estimateMeasurement(text, font);
      }

      const scale = font.fontSize / opentypeFont.unitsPerEm;
      const letterSpacing = font.letterSpacing ?? 0;

      const widthRef = { value: 0 };
      for (let i = 0; i < text.length; i++) {
        const glyph = opentypeFont.charToGlyph(text[i]);
        widthRef.value += (glyph.advanceWidth ?? 0) * scale;
        if (i < text.length - 1) {
          widthRef.value += letterSpacing;
        }
      }

      const ascent = opentypeFont.ascender * scale;
      const descent = Math.abs(opentypeFont.descender * scale);

      return {
        width: widthRef.value,
        height: ascent + descent,
        ascent,
        descent,
      };
    },

    measureCharWidths(text: string, font: FontSpec): readonly number[] {
      const opentypeFont = getCachedFont(font);

      if (!opentypeFont) {
        return estimateCharWidths(text, font);
      }

      const scale = font.fontSize / opentypeFont.unitsPerEm;
      const letterSpacing = font.letterSpacing ?? 0;
      const widths: number[] = [];

      for (let i = 0; i < text.length; i++) {
        const glyph = opentypeFont.charToGlyph(text[i]);
        const charWidthRef = { value: (glyph.advanceWidth ?? 0) * scale };
        if (i < text.length - 1) {
          charWidthRef.value += letterSpacing;
        }
        widths.push(charWidthRef.value);
      }

      return widths;
    },

    getFontMetrics,

    getAscenderRatio(font: FontSpec): number {
      const metrics = getFontMetrics(font);
      return metrics.ascender / metrics.unitsPerEm;
    },
  };
}

/**
 * Async measurement helpers
 */
export async function measureTextAsync(
  provider: OpentypeMeasurementProviderInstance,
  text: string,
  font: FontSpec
): Promise<TextMeasurement> {
  await provider.preloadFont(font);
  return provider.measureText(text, font);
}






/** Get the ascender ratio for a font asynchronously */
export async function getAscenderRatioAsync(
  provider: OpentypeMeasurementProviderInstance,
  font: FontSpec
): Promise<number> {
  await provider.preloadFont(font);
  return provider.getAscenderRatio(font);
}
