/**
 * @file Text measurer - main class for text measurement and line breaking
 */

import type {
  FontSpec,
  TextMeasurement,
  MultiLineMeasurement,
  TextMeasurerConfig,
  LineBreakOptions,
} from "./types";
import { createMeasurementProvider } from "./provider";
import { breakLines } from "./line-break";

/**
 * Default line height multiplier (when not specified)
 */
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

/** Text measurer instance */
export type TextMeasurerInstance = {
  measureText(text: string, font: FontSpec): TextMeasurement;
  measureMultiLine(text: string, font: FontSpec, options?: LineBreakOptions): MultiLineMeasurement;
  getLineHeight(font: FontSpec): number;
  measureSubstring(params: { text: string; start: number; end: number; font: FontSpec }): number;
  findCharIndexAtX(text: string, x: number, font: FontSpec): number;
  getCharX(text: string, charIndex: number, font: FontSpec): number;
};

/**
 * Create a text measurer with default configuration
 *
 * Provides text measurement and line breaking capabilities.
 */
export function createTextMeasurer(
  config?: Partial<TextMeasurerConfig>
): TextMeasurerInstance {
  const provider = config?.provider ?? createMeasurementProvider();
  const defaultLineBreakMode = config?.defaultLineBreakMode ?? "auto";

  function getCharWidths(text: string, font: FontSpec): readonly number[] {
    if (provider.measureCharWidths) {
      return provider.measureCharWidths(text, font);
    }
    return estimateCharWidths(text, font);
  }

  function estimateCharWidths(text: string, font: FontSpec): readonly number[] {
    // Measure each character individually
    const widths: number[] = [];
    const letterSpacing = font.letterSpacing ?? 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const measurement = provider.measureText(char, font);
      // Add letter spacing for all but the last character
      const spacingForChar = i < text.length - 1 ? letterSpacing : 0;
      widths.push(measurement.width + spacingForChar);
    }

    return widths;
  }

  function getLineHeight(font: FontSpec): number {
    // If font metrics are available, use them
    if (provider.getFontMetrics) {
      const metrics = provider.getFontMetrics(font);
      const emHeight =
        (metrics.ascender - metrics.descender + metrics.lineGap) /
        metrics.unitsPerEm;
      return font.fontSize * emHeight;
    }

    // Fall back to default multiplier
    return font.fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  }

  return {
    measureText(text: string, font: FontSpec): TextMeasurement {
      return provider.measureText(text, font);
    },

    measureMultiLine(
      text: string,
      font: FontSpec,
      options?: LineBreakOptions
    ): MultiLineMeasurement {
      const charWidths = getCharWidths(text, font);
      const mode = options?.mode ?? defaultLineBreakMode;
      const maxWidth = options?.maxWidth ?? Infinity;
      const maxLines = options?.maxLines ?? 0;

      const lines = breakLines({ text, charWidths, maxWidth, mode, maxLines });

      const lineHeightValue = getLineHeight(font);
      const maxLineWidth = Math.max(...lines.map((l) => l.width));
      const totalHeight = lines.length * lineHeightValue;

      return {
        lines,
        maxWidth: maxLineWidth,
        totalHeight,
        lineHeight: lineHeightValue,
      };
    },

    getLineHeight,

    measureSubstring(
      { text, start, end, font }: { text: string; start: number; end: number; font: FontSpec }
    ): number {
      const substring = text.slice(start, end);
      return provider.measureText(substring, font).width;
    },

    findCharIndexAtX(text: string, x: number, font: FontSpec): number {
      if (x <= 0) {
        return 0;
      }

      const charWidths = getCharWidths(text, font);

      const currentXRef = { value: 0 };
      for (let i = 0; i < charWidths.length; i++) {
        const charWidth = charWidths[i];
        const midpoint = currentXRef.value + charWidth / 2;

        if (x <= midpoint) {
          return i;
        }
        currentXRef.value += charWidth;
      }

      return text.length;
    },

    getCharX(text: string, charIndex: number, font: FontSpec): number {
      if (charIndex <= 0) {
        return 0;
      }

      const measureText = text.slice(0, charIndex);
      return provider.measureText(measureText, font).width;
    },
  };
}
