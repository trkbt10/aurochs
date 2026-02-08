/**
 * @file OpenType.js based measurement provider
 *
 * Provides accurate text measurement using opentype.js font parsing.
 * Requires FontLoader to load font files.
 */

import type { FontLoader, LoadedFont, FontMetrics, AbstractFont } from "../../font/index";
import type { MeasurementProvider, FontSpec, TextMeasurement } from "./types";

/**
 * OpenType.js based measurement provider
 *
 * Uses actual font files for precise text measurement.
 */
export class OpentypeMeasurementProvider implements MeasurementProvider {
  private fontCache = new Map<string, LoadedFont>();

  constructor(private readonly fontLoader: FontLoader) {}

  /**
   * Get cache key for font spec
   */
  private getCacheKey(font: FontSpec): string {
    return `${font.fontFamily}:${font.fontWeight ?? 400}:${font.fontStyle ?? "normal"}`;
  }

  /**
   * Load font for measurement
   */
  private async loadFontForSpec(font: FontSpec): Promise<LoadedFont | undefined> {
    const key = this.getCacheKey(font);
    const cached = this.fontCache.get(key);
    if (cached) return cached;

    const loaded = await this.fontLoader.loadFont({
      family: font.fontFamily,
      weight: font.fontWeight,
      style: font.fontStyle,
    });

    if (loaded) {
      this.fontCache.set(key, loaded);
    }

    return loaded;
  }

  /**
   * Synchronously get cached font (for sync measurement API)
   */
  private getCachedFont(font: FontSpec): AbstractFont | undefined {
    const key = this.getCacheKey(font);
    return this.fontCache.get(key)?.font;
  }

  /**
   * Preload fonts for later synchronous use
   */
  async preloadFont(font: FontSpec): Promise<boolean> {
    const loaded = await this.loadFontForSpec(font);
    return loaded !== undefined;
  }

  /**
   * Measure text with given font specification
   *
   * Note: This is synchronous and requires the font to be preloaded.
   * Call preloadFont() first for accurate measurements.
   */
  measureText(text: string, font: FontSpec): TextMeasurement {
    const opentypeFont = this.getCachedFont(font);

    if (!opentypeFont) {
      // Fallback to estimation if font not loaded
      return this.estimateMeasurement(text, font);
    }

    const scale = font.fontSize / opentypeFont.unitsPerEm;
    const letterSpacing = font.letterSpacing ?? 0;

    // Measure total width
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = opentypeFont.charToGlyph(text[i]);
      width += (glyph.advanceWidth ?? 0) * scale;
      if (i < text.length - 1) {
        width += letterSpacing;
      }
    }

    const ascent = opentypeFont.ascender * scale;
    const descent = Math.abs(opentypeFont.descender * scale);

    return {
      width,
      height: ascent + descent,
      ascent,
      descent,
    };
  }

  /**
   * Measure individual character widths
   */
  measureCharWidths(text: string, font: FontSpec): readonly number[] {
    const opentypeFont = this.getCachedFont(font);

    if (!opentypeFont) {
      return this.estimateCharWidths(text, font);
    }

    const scale = font.fontSize / opentypeFont.unitsPerEm;
    const letterSpacing = font.letterSpacing ?? 0;
    const widths: number[] = [];

    for (let i = 0; i < text.length; i++) {
      const glyph = opentypeFont.charToGlyph(text[i]);
      let charWidth = (glyph.advanceWidth ?? 0) * scale;
      if (i < text.length - 1) {
        charWidth += letterSpacing;
      }
      widths.push(charWidth);
    }

    return widths;
  }

  /**
   * Get font metrics
   */
  getFontMetrics(font: FontSpec): FontMetrics {
    const opentypeFont = this.getCachedFont(font);

    if (!opentypeFont) {
      return this.estimateFontMetrics(font);
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

  /**
   * Get ascender ratio (ascender / unitsPerEm)
   *
   * This is the key metric for baseline positioning.
   */
  getAscenderRatio(font: FontSpec): number {
    const metrics = this.getFontMetrics(font);
    return metrics.ascender / metrics.unitsPerEm;
  }

  /**
   * Fallback estimation when font not available
   */
  private estimateMeasurement(text: string, font: FontSpec): TextMeasurement {
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

  private estimateCharWidths(text: string, font: FontSpec): readonly number[] {
    const avgWidth = font.fontSize * 0.5;
    const letterSpacing = font.letterSpacing ?? 0;
    return Array.from(text).map((_, i) =>
      i < text.length - 1 ? avgWidth + letterSpacing : avgWidth
    );
  }

  private estimateFontMetrics(font: FontSpec): FontMetrics {
    // Use typical font metric ratios as fallback
    return {
      unitsPerEm: 1000,
      ascender: 800, // 0.8 ratio
      descender: -200, // -0.2 ratio
      lineGap: 0,
    };
  }
}

/**
 * Async measurement helpers
 */
export async function measureTextAsync(
  provider: OpentypeMeasurementProvider,
  text: string,
  font: FontSpec
): Promise<TextMeasurement> {
  await provider.preloadFont(font);
  return provider.measureText(text, font);
}

export async function getAscenderRatioAsync(
  provider: OpentypeMeasurementProvider,
  font: FontSpec
): Promise<number> {
  await provider.preloadFont(font);
  return provider.getAscenderRatio(font);
}
