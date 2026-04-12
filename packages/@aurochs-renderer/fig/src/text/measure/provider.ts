/**
 * @file Measurement provider implementations
 */

import type { FontMetrics } from "../../font/index";
import type { MeasurementProvider, FontSpec, TextMeasurement } from "./types";

/** Compute cap height from actual bounding box ascent, or undefined if not available */
function computeCapHeight(
  actualBoundingBoxAscent: number | undefined,
  fontSize: number
): number | undefined {
  if (actualBoundingBoxAscent) {
    return (actualBoundingBoxAscent / fontSize) * 1000;
  }
  return undefined;
}

/**
 * Minimal interface for canvas context text measurement
 */
type TextMeasureContext = {
  font: string;
  measureText(text: string): TextMetrics;
};

/**
 * Build CSS font string from font spec
 */
function buildFontString(font: FontSpec): string {
  const style = font.fontStyle ?? "normal";
  const weight = font.fontWeight ?? 400;
  const size = font.fontSize;
  const family = font.fontFamily;

  return `${style} ${weight} ${size}px ${family}`;
}

/**
 * Adjust width for letter spacing
 */
function adjustForLetterSpacing(
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
 * Create a Canvas-based measurement provider
 *
 * Uses the Canvas 2D API for text measurement.
 * Works in browser and Node.js (with canvas package).
 */
export function createCanvasMeasurementProvider(): MeasurementProvider {
  const contextRef = { value: null as TextMeasureContext | null };

  function getContext(): TextMeasureContext {
    if (contextRef.value) {
      return contextRef.value;
    }

    if (typeof document !== "undefined") {
      // Browser environment
      const canvas = document.createElement("canvas");
      contextRef.value = canvas.getContext("2d");
    } else if (typeof OffscreenCanvas !== "undefined") {
      // Web Worker or modern environment with OffscreenCanvas
      const canvas = new OffscreenCanvas(1, 1);
      contextRef.value = canvas.getContext("2d");
    }

    if (!contextRef.value) {
      throw new Error(
        "Canvas context not available. " +
          "Use a different measurement provider in non-browser environments."
      );
    }

    return contextRef.value;
  }

  return {
    measureText(text: string, font: FontSpec): TextMeasurement {
      const ctx = getContext();
      ctx.font = buildFontString(font);

      const metrics = ctx.measureText(text);

      const width = adjustForLetterSpacing(
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
    },

    measureCharWidths(text: string, font: FontSpec): readonly number[] {
      const ctx = getContext();
      ctx.font = buildFontString(font);

      const widths: number[] = [];
      const letterSpacing = font.letterSpacing ?? 0;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charWidth = ctx.measureText(char).width;
        widths.push(i < text.length - 1 ? charWidth + letterSpacing : charWidth);
      }

      return widths;
    },

    getFontMetrics(font: FontSpec): FontMetrics {
      const ctx = getContext();
      ctx.font = buildFontString(font);

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
        unitsPerEm: 1000,
        ascender: (ascender / font.fontSize) * 1000,
        descender: -(descender / font.fontSize) * 1000,
        lineGap: 0,
        capHeight: computeCapHeight(metrics.actualBoundingBoxAscent, font.fontSize),
      };
    },
  };
}

/**
 * Average character width ratios for different font categories
 */
const WIDTH_RATIOS: Record<string, number> = {
  monospace: 0.6,
  serif: 0.5,
  "sans-serif": 0.5,
  default: 0.5,
};

/**
 * Detect font category from font family string
 */
function detectCategory(fontFamily: string): string {
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
 * Create a fallback measurement provider for environments without Canvas
 *
 * Uses estimated character widths based on font metrics.
 * Less accurate but works everywhere.
 */
export function createFallbackMeasurementProvider(): MeasurementProvider {
  return {
    measureText(text: string, font: FontSpec): TextMeasurement {
      const category = detectCategory(font.fontFamily);
      const widthRatio = WIDTH_RATIOS[category];

      const widthRef = { value: text.length * font.fontSize * widthRatio };

      if (font.letterSpacing && text.length > 1) {
        widthRef.value += font.letterSpacing * (text.length - 1);
      }

      const ascent = font.fontSize * 0.8;
      const descent = font.fontSize * 0.2;

      return {
        width: widthRef.value,
        height: ascent + descent,
        ascent,
        descent,
      };
    },

    measureCharWidths(text: string, font: FontSpec): readonly number[] {
      const category = detectCategory(font.fontFamily);
      const widthRatio = WIDTH_RATIOS[category];
      const charWidth = font.fontSize * widthRatio;
      const letterSpacing = font.letterSpacing ?? 0;

      return Array.from(text).map((_, i) =>
        i < text.length - 1 ? charWidth + letterSpacing : charWidth
      );
    },
  };
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
      const provider = createCanvasMeasurementProvider();
      // Test if it works
      provider.measureText("test", { fontFamily: "sans-serif", fontSize: 12 });
      return provider;
    } catch (error) {
      console.debug("Fall through to fallback" + ":", error);
    }
  }

  // Use fallback provider
  return createFallbackMeasurementProvider();
}
