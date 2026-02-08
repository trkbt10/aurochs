/**
 * @file Extract glyph outline paths from opentype.js fonts
 *
 * Format-agnostic glyph path extraction that returns PathCommand arrays.
 * Both SVG and WebGL backends consume these.
 */

import type { AbstractFont } from "../../font/types";
import type { PathCommand, PathContour, DecorationRect, TextPathResult } from "./types";
import type { TextAlignHorizontal } from "../layout/types";
import { convertQuadraticsToCubic } from "./bezier";

/**
 * Calculate width of text using font metrics
 */
export function calculateTextWidth(
  text: string,
  font: AbstractFont,
  fontSize: number,
  letterSpacing?: number
): number {
  const scale = fontSize / font.unitsPerEm;
  const spacing = letterSpacing ?? 0;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    const advanceWidth = glyph.advanceWidth ?? 0;
    width += advanceWidth * scale;
    if (i < text.length - 1) {
      width += spacing;
    }
  }
  return width;
}

/**
 * Calculate x offset for alignment
 */
function getAlignmentOffset(
  align: TextAlignHorizontal,
  totalWidth: number,
  x: number
): number {
  switch (align) {
    case "CENTER":
      return x - totalWidth / 2;
    case "RIGHT":
      return x - totalWidth;
    default:
      return x;
  }
}

/**
 * Extract glyph outline path commands from font for a single line of text
 *
 * @param text - Text string to extract paths for
 * @param font - Abstract font interface
 * @param fontSize - Font size in pixels
 * @param x - X position
 * @param y - Y baseline position
 * @param align - Horizontal alignment
 * @param letterSpacing - Optional letter spacing
 * @returns Path contour with all glyphs combined, or null if empty
 */
export function extractLinePathCommands(
  text: string,
  font: AbstractFont,
  fontSize: number,
  x: number,
  y: number,
  align: TextAlignHorizontal,
  letterSpacing?: number
): PathContour | null {
  const totalWidth = calculateTextWidth(text, font, fontSize, letterSpacing);
  const adjustedX = getAlignmentOffset(align, totalWidth, x);

  const fontPath = font.getPath(text, adjustedX, y, fontSize, {
    letterSpacing: letterSpacing ?? 0,
  });

  const commands = convertQuadraticsToCubic(fontPath.commands);
  if (commands.length === 0) {
    return null;
  }

  return { commands };
}

/**
 * Create underline decoration rectangle
 *
 * Figma positions underline at approximately fontSize * 0.19 below baseline
 * with thickness of approximately fontSize * 0.068.
 */
export function createUnderlineRect(
  text: string,
  font: AbstractFont,
  fontSize: number,
  x: number,
  y: number,
  align: TextAlignHorizontal,
  letterSpacing?: number
): DecorationRect | null {
  if (!text.trim()) {
    return null;
  }

  const totalWidth = calculateTextWidth(text, font, fontSize, letterSpacing);
  const adjustedX = getAlignmentOffset(align, totalWidth, x);

  const underlineOffset = fontSize * 0.19;
  const underlineThickness = fontSize * 0.068;

  return {
    x: adjustedX,
    y: y + underlineOffset,
    width: totalWidth,
    height: underlineThickness,
  };
}

/**
 * Extract multi-line text path data
 *
 * @param lines - Text lines to render
 * @param font - Abstract font
 * @param fontSize - Font size in pixels
 * @param x - X position
 * @param baseY - Y position of first line baseline
 * @param lineHeight - Line height in pixels
 * @param align - Horizontal alignment
 * @param letterSpacing - Optional letter spacing
 * @param textDecoration - Text decoration type
 * @returns TextPathResult with glyph contours and decorations
 */
export function extractTextPathData(
  lines: readonly string[],
  font: AbstractFont,
  fontSize: number,
  x: number,
  baseY: number,
  lineHeight: number,
  align: TextAlignHorizontal,
  letterSpacing?: number,
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH"
): TextPathResult {
  const glyphContours: PathContour[] = [];
  const decorations: DecorationRect[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (!lineText) continue;

    const y = baseY + i * lineHeight;
    const contour = extractLinePathCommands(
      lineText,
      font,
      fontSize,
      x,
      y,
      align,
      letterSpacing
    );

    if (contour) {
      glyphContours.push(contour);
    }

    if (textDecoration === "UNDERLINE") {
      const rect = createUnderlineRect(
        lineText,
        font,
        fontSize,
        x,
        y,
        align,
        letterSpacing
      );
      if (rect) {
        decorations.push(rect);
      }
    }
  }

  return { glyphContours, decorations };
}
