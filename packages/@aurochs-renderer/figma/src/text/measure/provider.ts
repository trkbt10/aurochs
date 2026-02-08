/**
 * @file Measurement provider implementations
 */

import type { FontMetrics } from "../../font/index";
import type { MeasurementProvider, FontSpec, TextMeasurement } from "./types";

/**
 * Minimal interface for canvas context text measurement
 */
type TextMeasureContext = {
  font: string;
  measureText(text: string): TextMetrics;
};

/**
 * Canvas-based measurement provider
 *
 * Uses the Canvas 2D API for text measurement.
 * Works in browser and Node.js (with canvas package).
 */
export class CanvasMeasurementProvider implements MeasurementProvider {
  private context: TextMeasureContext | null = null;

  /**
   * Get or create a canvas context for measurement
   */
  private getContext(): TextMeasureContext {
    if (this.context) {
      return this.context;
    }

    if (typeof document !== "undefined") {
      // Browser environment
      const canvas = document.createElement("canvas");
      this.context = canvas.getContext("2d");
    } else if (typeof OffscreenCanvas !== "undefined") {
      // Web Worker or modern environment with OffscreenCanvas
      const canvas = new OffscreenCanvas(1, 1);
      this.context = canvas.getContext("2d");
    }

    if (!this.context) {
      throw new Error(
        "Canvas context not available. " +
          "Use a different measurement provider in non-browser environments."
      );
    }

    return this.context;
  }

  /**
   * Build CSS font string from font spec
   */
  private buildFontString(font: FontSpec): string {
    const style = font.fontStyle ?? "normal";
    const weight = font.fontWeight ?? 400;
    const size = font.fontSize;
    const family = font.fontFamily;

    return `${style} ${weight} ${size}px ${family}`;
  }

  /**
   * Measure text with given font specification
   */
  measureText(text: string, font: FontSpec): TextMeasurement {
    const ctx = this.getContext();
    ctx.font = this.buildFontString(font);

    const metrics = ctx.measureText(text);

    // Canvas TextMetrics provides various metrics
    // Note: Some properties may not be available in older browsers
    const width = this.adjustForLetterSpacing(
      metrics.width,
      text.length,
      font.letterSpacing
    );
    const ascent =
      metrics.fontBoundingBoxAscent ??
      metrics.actualBoundingBoxAscent ??
      font.fontSize * 0.8;
    const descent =
      metrics.fontBoundingBoxDescent ??
      metrics.actualBoundingBoxDescent ??
      font.fontSize * 0.2;

    return {
      width,
      height: ascent + descent,
      ascent,
      descent,
    };
  }

  /**
   * Adjust width for letter spacing
   */
  private adjustForLetterSpacing(
    baseWidth: number,
    charCount: number,
    letterSpacing?: number
  ): number {
    if (!letterSpacing || charCount <= 1) {
      return baseWidth;
    }
    // Letter spacing is applied between characters (n-1 times for n characters)
    return baseWidth + letterSpacing * (charCount - 1);
  }

  /**
   * Measure individual character widths
   */
  measureCharWidths(text: string, font: FontSpec): readonly number[] {
    const ctx = this.getContext();
    ctx.font = this.buildFontString(font);

    const widths: number[] = [];
    const letterSpacing = font.letterSpacing ?? 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = ctx.measureText(char).width;
      // Add letter spacing for all but the last character
      widths.push(i < text.length - 1 ? charWidth + letterSpacing : charWidth);
    }

    return widths;
  }

  /**
   * Get font metrics
   */
  getFontMetrics(font: FontSpec): FontMetrics {
    const ctx = this.getContext();
    ctx.font = this.buildFontString(font);

    // Measure a reference string to get metrics
    const metrics = ctx.measureText("Xg");

    const ascender =
      metrics.fontBoundingBoxAscent ??
      metrics.actualBoundingBoxAscent ??
      font.fontSize * 0.8;
    const descender =
      metrics.fontBoundingBoxDescent ??
      metrics.actualBoundingBoxDescent ??
      font.fontSize * 0.2;

    return {
      unitsPerEm: 1000, // Canvas doesn't provide this, use standard value
      ascender: (ascender / font.fontSize) * 1000,
      descender: -(descender / font.fontSize) * 1000, // Negative for descender
      lineGap: 0, // Canvas doesn't provide line gap
      capHeight: metrics.actualBoundingBoxAscent
        ? (metrics.actualBoundingBoxAscent / font.fontSize) * 1000
        : undefined,
    };
  }
}

/**
 * Fallback measurement provider for environments without Canvas
 *
 * Uses estimated character widths based on font metrics.
 * Less accurate but works everywhere.
 */
export class FallbackMeasurementProvider implements MeasurementProvider {
  /**
   * Average character width ratios for different font categories
   */
  private static readonly WIDTH_RATIOS: Record<string, number> = {
    monospace: 0.6, // Fixed-width fonts
    serif: 0.5, // Variable-width serif fonts
    "sans-serif": 0.5, // Variable-width sans-serif fonts
    default: 0.5,
  };

  /**
   * Detect font category from font family string
   */
  private detectCategory(fontFamily: string): string {
    const lower = fontFamily.toLowerCase();
    if (lower.includes("mono") || lower.includes("courier")) {
      return "monospace";
    }
    if (lower.includes("serif") && !lower.includes("sans")) {
      return "serif";
    }
    return "default";
  }

  /**
   * Measure text with given font specification
   */
  measureText(text: string, font: FontSpec): TextMeasurement {
    const category = this.detectCategory(font.fontFamily);
    const widthRatio = FallbackMeasurementProvider.WIDTH_RATIOS[category];

    // Estimate width based on character count and average width
    let width = text.length * font.fontSize * widthRatio;

    // Add letter spacing
    if (font.letterSpacing && text.length > 1) {
      width += font.letterSpacing * (text.length - 1);
    }

    // Estimate height based on font size
    const ascent = font.fontSize * 0.8;
    const descent = font.fontSize * 0.2;

    return {
      width,
      height: ascent + descent,
      ascent,
      descent,
    };
  }

  /**
   * Measure individual character widths (estimated)
   */
  measureCharWidths(text: string, font: FontSpec): readonly number[] {
    const category = this.detectCategory(font.fontFamily);
    const widthRatio = FallbackMeasurementProvider.WIDTH_RATIOS[category];
    const charWidth = font.fontSize * widthRatio;
    const letterSpacing = font.letterSpacing ?? 0;

    return Array.from(text).map((_, i) =>
      i < text.length - 1 ? charWidth + letterSpacing : charWidth
    );
  }
}

/**
 * Create appropriate measurement provider for the current environment
 */
export function createMeasurementProvider(): MeasurementProvider {
  // Try Canvas-based provider first
  if (
    typeof document !== "undefined" ||
    typeof OffscreenCanvas !== "undefined"
  ) {
    try {
      const provider = new CanvasMeasurementProvider();
      // Test if it works
      provider.measureText("test", { fontFamily: "sans-serif", fontSize: 12 });
      return provider;
    } catch {
      // Fall through to fallback
    }
  }

  // Use fallback provider
  return new FallbackMeasurementProvider();
}
