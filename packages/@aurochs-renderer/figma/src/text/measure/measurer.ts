/**
 * @file Text measurer - main class for text measurement and line breaking
 */

import type {
  MeasurementProvider,
  FontSpec,
  TextMeasurement,
  MultiLineMeasurement,
  TextMeasurerConfig,
  LineBreakMode,
  LineBreakOptions,
} from "./types";
import { createMeasurementProvider } from "./provider";
import { breakLines } from "./line-break";

/**
 * Default line height multiplier (when not specified)
 */
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

/**
 * Text measurer class
 *
 * Provides text measurement and line breaking capabilities.
 */
export class TextMeasurer {
  private readonly provider: MeasurementProvider;
  private readonly defaultLineBreakMode: LineBreakMode;

  constructor(config?: Partial<TextMeasurerConfig>) {
    this.provider = config?.provider ?? createMeasurementProvider();
    this.defaultLineBreakMode = config?.defaultLineBreakMode ?? "auto";
  }

  /**
   * Measure single-line text
   *
   * @param text - Text to measure
   * @param font - Font specification
   * @returns Text measurement result
   */
  measureText(text: string, font: FontSpec): TextMeasurement {
    return this.provider.measureText(text, font);
  }

  /**
   * Measure text with line breaking
   *
   * @param text - Text to measure
   * @param font - Font specification
   * @param options - Line break options
   * @returns Multi-line measurement result
   */
  measureMultiLine(
    text: string,
    font: FontSpec,
    options?: LineBreakOptions
  ): MultiLineMeasurement {
    // Get character widths
    const charWidths = this.provider.measureCharWidths
      ? this.provider.measureCharWidths(text, font)
      : this.estimateCharWidths(text, font);

    // Break lines
    const mode = options?.mode ?? this.defaultLineBreakMode;
    const maxWidth = options?.maxWidth ?? Infinity;
    const maxLines = options?.maxLines ?? 0;

    const lines = breakLines(text, charWidths, maxWidth, mode, maxLines);

    // Calculate total dimensions
    const lineHeight = this.getLineHeight(font);
    const maxLineWidth = Math.max(...lines.map((l) => l.width));
    const totalHeight = lines.length * lineHeight;

    return {
      lines,
      maxWidth: maxLineWidth,
      totalHeight,
      lineHeight,
    };
  }

  /**
   * Get effective line height for a font
   */
  getLineHeight(font: FontSpec): number {
    // If font metrics are available, use them
    if (this.provider.getFontMetrics) {
      const metrics = this.provider.getFontMetrics(font);
      const emHeight =
        (metrics.ascender - metrics.descender + metrics.lineGap) /
        metrics.unitsPerEm;
      return font.fontSize * emHeight;
    }

    // Fall back to default multiplier
    return font.fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  }

  /**
   * Estimate character widths when measureCharWidths is not available
   */
  private estimateCharWidths(text: string, font: FontSpec): readonly number[] {
    // Measure each character individually
    const widths: number[] = [];
    const letterSpacing = font.letterSpacing ?? 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const measurement = this.provider.measureText(char, font);
      // Add letter spacing for all but the last character
      widths.push(
        i < text.length - 1
          ? measurement.width + letterSpacing
          : measurement.width
      );
    }

    return widths;
  }

  /**
   * Calculate the width of a specific substring
   *
   * @param text - Full text
   * @param start - Start index
   * @param end - End index
   * @param font - Font specification
   * @returns Width of the substring
   */
  measureSubstring(
    text: string,
    start: number,
    end: number,
    font: FontSpec
  ): number {
    const substring = text.slice(start, end);
    return this.provider.measureText(substring, font).width;
  }

  /**
   * Find the character index at a given x position
   *
   * Useful for text cursor positioning.
   *
   * @param text - Text to measure
   * @param x - X position in pixels
   * @param font - Font specification
   * @returns Character index (0 to text.length)
   */
  findCharIndexAtX(text: string, x: number, font: FontSpec): number {
    if (x <= 0) {
      return 0;
    }

    const charWidths = this.provider.measureCharWidths
      ? this.provider.measureCharWidths(text, font)
      : this.estimateCharWidths(text, font);

    let currentX = 0;
    for (let i = 0; i < charWidths.length; i++) {
      const charWidth = charWidths[i];
      const midpoint = currentX + charWidth / 2;

      if (x <= midpoint) {
        return i;
      }
      currentX += charWidth;
    }

    return text.length;
  }

  /**
   * Get the x position of a character
   *
   * @param text - Text to measure
   * @param charIndex - Character index
   * @param font - Font specification
   * @returns X position in pixels
   */
  getCharX(text: string, charIndex: number, font: FontSpec): number {
    if (charIndex <= 0) {
      return 0;
    }

    const measureText = text.slice(0, charIndex);
    return this.provider.measureText(measureText, font).width;
  }
}

/**
 * Create a text measurer with default configuration
 */
export function createTextMeasurer(
  config?: Partial<TextMeasurerConfig>
): TextMeasurer {
  return new TextMeasurer(config);
}
