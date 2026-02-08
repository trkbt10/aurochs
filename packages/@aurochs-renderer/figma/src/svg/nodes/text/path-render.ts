/**
 * @file Path-based text rendering using opentype.js
 *
 * Converts text to SVG paths for pixel-perfect rendering.
 * This matches Figma's export behavior where text is outlined.
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../../types";
import { path, g, type SvgString, EMPTY_SVG } from "../../primitives";
import { buildTransformAttr } from "../../transform";
import { extractTextProps } from "../../../text/layout/extract-props";
import { getFillColorAndOpacity } from "../../../text/layout/fill";
import { getAlignedX, getAlignedYWithMetrics } from "../../../text/layout/alignment";
import type { FontLoader, LoadedFont, AbstractFont } from "../../../font";
import { fontHasGlyph, isCJKCharacter } from "../../../font";
import type { ExtractedTextProps } from "../../../text/layout/types";

/**
 * Path render context
 */
export type PathRenderContext = FigSvgRenderContext & {
  fontLoader: FontLoader;
};

/**
 * Check if text wrapping is needed
 */
function needsTextWrapping(props: ExtractedTextProps): boolean {
  return props.textAutoResize !== "WIDTH_AND_HEIGHT" && props.size !== undefined && props.size.width > 0;
}

/**
 * Break text into lines based on width using opentype.js font metrics
 */
function breakTextWithFont(
  text: string,
  font: AbstractFont,
  fontSize: number,
  maxWidth: number,
  letterSpacing?: number,
): readonly string[] {
  const scale = fontSize / font.unitsPerEm;
  const spacing = letterSpacing ?? 0;
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  const words = text.split(/(\s+)/); // Keep whitespace as separate items

  for (const word of words) {
    // Calculate word width
    let wordWidth = 0;
    for (let i = 0; i < word.length; i++) {
      const glyph = font.charToGlyph(word[i]);
      const advanceWidth = glyph.advanceWidth ?? 0;
      wordWidth += advanceWidth * scale;
      if (i < word.length - 1) {
        wordWidth += spacing;
      }
    }

    // Check if adding this word would exceed max width
    if (currentLine && currentWidth + wordWidth > maxWidth) {
      // Start new line
      lines.push(currentLine.trimEnd());
      currentLine = word.trimStart();
      // Recalculate width for trimmed word
      currentWidth = 0;
      for (let i = 0; i < currentLine.length; i++) {
        const glyph = font.charToGlyph(currentLine[i]);
        const advanceWidth = glyph.advanceWidth ?? 0;
        currentWidth += advanceWidth * scale;
        if (i < currentLine.length - 1) {
          currentWidth += spacing;
        }
      }
    } else {
      currentLine += word;
      currentWidth += wordWidth;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Get lines for path rendering with text wrapping support
 */
function getTextLinesForPath(props: ExtractedTextProps, font: AbstractFont): readonly string[] {
  const characters = props.characters;
  const explicitLines = characters.split("\n");

  if (!needsTextWrapping(props)) {
    return explicitLines;
  }

  const maxWidth = props.size!.width;
  const allLines: string[] = [];

  for (const explicitLine of explicitLines) {
    if (!explicitLine) {
      allLines.push("");
      continue;
    }

    const brokenLines = breakTextWithFont(explicitLine, font, props.fontSize, maxWidth, props.letterSpacing);

    for (const line of brokenLines) {
      allLines.push(line);
    }
  }

  return allLines;
}

/**
 * Render text node as SVG path
 *
 * Uses opentype.js to convert text to paths.
 * Falls back to regular text rendering if font loading fails.
 */
export async function renderTextNodeAsPath(node: FigNode, ctx: PathRenderContext): Promise<SvgString> {
  const props = extractTextProps(node);

  if (!props.characters) {
    return EMPTY_SVG;
  }

  // Try to load the font
  const loadedFont = await ctx.fontLoader.loadFont({
    family: props.fontFamily,
    weight: props.fontWeight,
    style: props.fontStyle === "italic" ? "italic" : "normal",
  });

  if (!loadedFont) {
    // Font not available - this will need fallback handling
    console.warn(`Font not found: ${props.fontFamily} ${props.fontWeight}`);
    return EMPTY_SVG;
  }

  // Try to load a fallback font for CJK characters
  let fallbackFont: LoadedFont | undefined;
  if (ctx.fontLoader.loadFallbackFont) {
    fallbackFont = await ctx.fontLoader.loadFallbackFont({
      family: props.fontFamily,
      weight: props.fontWeight,
      style: props.fontStyle === "italic" ? "italic" : "normal",
    });
  }

  const transformStr = buildTransformAttr(props.transform);
  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);

  // Get font metrics for accurate baseline and line height calculation
  const font = loadedFont.font;
  const ascenderRatio = font.ascender / font.unitsPerEm;

  // Calculate the natural line height from font metrics
  // Figma's 100% line height = fontSize * (ascender + |descender|) / unitsPerEm
  // Note: There may be small differences (~0.2px at 64px) due to Figma's internal
  // line height calculation, but the main source of visual diff is glyph outline
  // differences between font versions (e.g., @fontsource vs system fonts).
  const naturalLineHeight = (props.fontSize * (font.ascender + Math.abs(font.descender))) / font.unitsPerEm;

  // If props.lineHeight equals fontSize, it was set to 100% in Figma
  // In that case, use the natural line height from font metrics
  const lineHeight = Math.abs(props.lineHeight - props.fontSize) < 0.01 ? naturalLineHeight : props.lineHeight;

  // Get lines with text wrapping applied
  const lines = getTextLinesForPath(props, font);

  // Calculate text position using actual font metrics
  const x = getAlignedX(props.textAlignHorizontal, props.size?.width);
  const baseY = getAlignedYWithMetrics({
    align: props.textAlignVertical,
    height: props.size?.height,
    fontSize: props.fontSize,
    lineCount: lines.length,
    lineHeight,
    ascenderRatio,
  });

  // Render each line as a path
  const pathElements: SvgString[] = [];
  const underlinePaths: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (!lineText) continue;

    const y = baseY + i * lineHeight;
    const linePath = renderLineAsPathWithFallback(
      lineText,
      font,
      fallbackFont?.font,
      props.fontSize,
      x,
      y,
      props.textAlignHorizontal,
      props.letterSpacing,
    );

    if (linePath) {
      pathElements.push(
        path({
          d: linePath,
          fill: fillColor,
          "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
        }),
      );
    }

    // Render underline if needed
    if (props.textDecoration === "UNDERLINE") {
      const underlinePath = renderUnderlinePath(
        lineText,
        font,
        props.fontSize,
        x,
        y,
        props.textAlignHorizontal,
        props.letterSpacing,
      );
      if (underlinePath) {
        underlinePaths.push(underlinePath);
      }
    }
  }

  // Combine all underlines into a single path element
  if (underlinePaths.length > 0) {
    pathElements.push(
      path({
        d: underlinePaths.join(""),
        fill: fillColor,
        "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
      }),
    );
  }

  if (pathElements.length === 0) {
    return EMPTY_SVG;
  }

  // Wrap in group if transform or opacity needed
  if (transformStr || props.opacity < 1 || pathElements.length > 1) {
    return g(
      {
        transform: transformStr || undefined,
        opacity: props.opacity < 1 ? props.opacity : undefined,
      },
      ...pathElements,
    );
  }

  return pathElements[0];
}

/**
 * Text segment with associated font
 */
type TextSegment = {
  text: string;
  font: AbstractFont;
  useFallback: boolean;
};

/**
 * Segment text by font capability
 *
 * Groups consecutive characters that can be rendered by the same font.
 */
function segmentTextByFont(
  text: string,
  primaryFont: AbstractFont,
  fallbackFont: AbstractFont | undefined,
): readonly TextSegment[] {
  if (!fallbackFont) {
    // No fallback - use primary for everything
    return [{ text, font: primaryFont, useFallback: false }];
  }

  const segments: TextSegment[] = [];
  let currentText = "";
  let currentUseFallback = false;

  for (const char of text) {
    const needsFallback = isCJKCharacter(char) && !fontHasGlyph(primaryFont, char);

    if (segments.length === 0 && currentText === "") {
      // First character
      currentUseFallback = needsFallback;
      currentText = char;
    } else if (needsFallback === currentUseFallback) {
      // Same font as current segment
      currentText += char;
    } else {
      // Different font - save current segment and start new one
      segments.push({
        text: currentText,
        font: currentUseFallback ? fallbackFont : primaryFont,
        useFallback: currentUseFallback,
      });
      currentText = char;
      currentUseFallback = needsFallback;
    }
  }

  // Add final segment
  if (currentText) {
    segments.push({
      text: currentText,
      font: currentUseFallback ? fallbackFont : primaryFont,
      useFallback: currentUseFallback,
    });
  }

  return segments;
}

/**
 * Calculate width of a text segment
 */
function calculateSegmentWidth(text: string, font: AbstractFont, fontSize: number, letterSpacing?: number): number {
  const scale = fontSize / font.unitsPerEm;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    const advanceWidth = glyph.advanceWidth ?? 0;
    width += advanceWidth * scale;
    if (letterSpacing && i < text.length - 1) {
      width += letterSpacing;
    }
  }
  return width;
}

/**
 * Render a single line of text as SVG path data
 */
function renderLineAsPath(
  text: string,
  font: AbstractFont,
  fontSize: number,
  x: number,
  y: number,
  align: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED",
  letterSpacing?: number,
): string | null {
  const scale = fontSize / font.unitsPerEm;

  // Calculate text width for alignment
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    const advanceWidth = glyph.advanceWidth ?? 0;
    totalWidth += advanceWidth * scale;
    if (letterSpacing && i < text.length - 1) {
      totalWidth += letterSpacing;
    }
  }

  // Adjust x for alignment
  let adjustedX = x;
  if (align === "CENTER") {
    adjustedX = x - totalWidth / 2;
  } else if (align === "RIGHT") {
    adjustedX = x - totalWidth;
  }

  // Convert text to path
  const openTypePath = font.getPath(text, adjustedX, y, fontSize, {
    letterSpacing: letterSpacing ?? 0,
  });

  // Convert quadratic beziers (Q) to cubic beziers (C) to match Figma's export format
  // Figma exports TrueType fonts with cubic curves for better compatibility
  const pathData = convertQuadraticToCubic(openTypePath, 5);
  return pathData || null;
}

/**
 * Render a single line of text as SVG path data with font fallback
 */
function renderLineAsPathWithFallback(
  text: string,
  primaryFont: AbstractFont,
  fallbackFont: AbstractFont | undefined,
  fontSize: number,
  x: number,
  y: number,
  align: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED",
  letterSpacing?: number,
): string | null {
  const segments = segmentTextByFont(text, primaryFont, fallbackFont);

  if (segments.length === 0) {
    return null;
  }

  // Calculate total width for alignment
  let totalWidth = 0;
  for (const segment of segments) {
    totalWidth += calculateSegmentWidth(segment.text, segment.font, fontSize, letterSpacing);
  }

  // Adjust starting X for alignment
  let adjustedX = x;
  if (align === "CENTER") {
    adjustedX = x - totalWidth / 2;
  } else if (align === "RIGHT") {
    adjustedX = x - totalWidth;
  }

  // Render each segment
  const paths: string[] = [];
  let currentX = adjustedX;

  for (const segment of segments) {
    const openTypePath = segment.font.getPath(segment.text, currentX, y, fontSize, {
      letterSpacing: letterSpacing ?? 0,
    });

    const pathData = convertQuadraticToCubic(openTypePath, 5);
    if (pathData) {
      paths.push(pathData);
    }

    // Move to next position
    currentX += calculateSegmentWidth(segment.text, segment.font, fontSize, letterSpacing);
  }

  return paths.join("") || null;
}

/**
 * Render underline as SVG path data
 *
 * Figma renders underlines as rectangles positioned below the text baseline.
 * The underline thickness and position are calculated based on font metrics.
 */
function renderUnderlinePath(
  text: string,
  font: AbstractFont,
  fontSize: number,
  x: number,
  y: number,
  align: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED",
  letterSpacing?: number,
): string | null {
  if (!text.trim()) {
    return null;
  }

  const scale = fontSize / font.unitsPerEm;

  // Calculate text width for the underline
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    const advanceWidth = glyph.advanceWidth ?? 0;
    totalWidth += advanceWidth * scale;
    if (letterSpacing && i < text.length - 1) {
      totalWidth += letterSpacing;
    }
  }

  // Calculate underline position and thickness
  // Figma positions underline at approximately fontSize * 0.19 below baseline
  // Underline thickness is approximately fontSize * 0.068
  const underlineOffset = fontSize * 0.19;
  const underlineThickness = fontSize * 0.068;

  // Round to match Figma's precision
  const round = (n: number) => Math.round(n * 10000) / 10000;

  // Calculate underline X position based on alignment
  let underlineX = x;
  if (align === "CENTER") {
    underlineX = x - totalWidth / 2;
  } else if (align === "RIGHT") {
    underlineX = x - totalWidth;
  }

  // Calculate underline Y position (below baseline)
  const underlineY = y + underlineOffset;

  // Create rectangle path for underline
  // M x y H (x+width) V (y+height) H x V y Z
  return `M${round(underlineX)} ${round(underlineY)}H${round(underlineX + totalWidth)}V${round(underlineY + underlineThickness)}H${round(underlineX)}V${round(underlineY)}Z`;
}

/**
 * Convert path with quadratic beziers to cubic beziers
 *
 * Figma exports all curves as cubic beziers even for TrueType fonts.
 * This conversion matches Figma's behavior.
 *
 * Mathematical conversion:
 * Q(P0, P1, P2) → C(P0, P0 + 2/3*(P1-P0), P2 + 2/3*(P1-P2), P2)
 */
function convertQuadraticToCubic(
  path: {
    commands: ReadonlyArray<{
      type: string;
      x?: number;
      y?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    }>;
  },
  precision: number,
): string {
  const parts: string[] = [];
  let currentX = 0;
  let currentY = 0;

  const round = (n: number) => {
    const factor = Math.pow(10, precision);
    return Math.round(n * factor) / factor;
  };

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;
        parts.push(`M${round(currentX)} ${round(currentY)}`);
        break;

      case "L":
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;
        parts.push(`L${round(currentX)} ${round(currentY)}`);
        break;

      case "Q": {
        // Convert quadratic to cubic
        // P0 = current point, P1 = (x1, y1), P2 = (x, y)
        const p0x = currentX;
        const p0y = currentY;
        const p1x = cmd.x1 ?? 0;
        const p1y = cmd.y1 ?? 0;
        const p2x = cmd.x ?? 0;
        const p2y = cmd.y ?? 0;

        // Cubic control points:
        // CP1 = P0 + 2/3 * (P1 - P0)
        // CP2 = P2 + 2/3 * (P1 - P2)
        const cp1x = p0x + (2 / 3) * (p1x - p0x);
        const cp1y = p0y + (2 / 3) * (p1y - p0y);
        const cp2x = p2x + (2 / 3) * (p1x - p2x);
        const cp2y = p2y + (2 / 3) * (p1y - p2y);

        parts.push(`C${round(cp1x)} ${round(cp1y)} ${round(cp2x)} ${round(cp2y)} ${round(p2x)} ${round(p2y)}`);

        currentX = p2x;
        currentY = p2y;
        break;
      }

      case "C":
        // Already cubic, keep as is
        parts.push(
          `C${round(cmd.x1 ?? 0)} ${round(cmd.y1 ?? 0)} ${round(cmd.x2 ?? 0)} ${round(cmd.y2 ?? 0)} ${round(cmd.x ?? 0)} ${round(cmd.y ?? 0)}`,
        );
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;
        break;

      case "Z":
        parts.push("Z");
        break;
    }
  }

  return parts.join("");
}

/**
 * Batch render multiple text nodes as paths
 *
 * More efficient when rendering multiple nodes with same fonts.
 */
export async function batchRenderTextNodesAsPaths(
  nodes: readonly FigNode[],
  ctx: PathRenderContext,
): Promise<readonly SvgString[]> {
  const results: SvgString[] = [];

  for (const node of nodes) {
    const result = await renderTextNodeAsPath(node, ctx);
    results.push(result);
  }

  return results;
}

/**
 * Get font metrics from loaded font
 */
export function getFontMetricsFromFont(font: AbstractFont): {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
} {
  return {
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    // lineGap is not directly available in opentype.js, estimate from hhea table
    lineGap: (font.tables?.hhea?.lineGap as number) ?? 0,
  };
}

/**
 * Calculate baseline offset for proper vertical positioning
 *
 * Figma uses specific baseline rules that we need to match.
 */
export function calculateBaselineOffset(
  font: AbstractFont,
  fontSize: number,
  verticalAlign: "TOP" | "CENTER" | "BOTTOM",
): number {
  const scale = fontSize / font.unitsPerEm;
  const ascender = font.ascender * scale;
  const descender = Math.abs(font.descender * scale);
  const lineHeight = ascender + descender;

  switch (verticalAlign) {
    case "TOP":
      // Baseline positioned so ascender touches top
      return ascender;
    case "CENTER":
      // Baseline positioned at center of text
      return ascender - lineHeight / 2 + fontSize / 2;
    case "BOTTOM":
      // Baseline positioned so descender touches bottom
      return fontSize - descender;
    default:
      return ascender;
  }
}
