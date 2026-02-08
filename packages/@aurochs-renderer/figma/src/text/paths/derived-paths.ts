/**
 * @file Extract glyph outline paths from derived text data (pre-computed in .fig files)
 *
 * Derived text data contains pre-computed glyph paths stored as blobs.
 * These paths achieve exact visual match (0% diff) with Figma's export.
 */

import { decodePathCommands, type FigBlob, type PathCommand as FigPathCommand } from "@aurochs/fig/parser";
import type { PathCommand, PathContour, DecorationRect, TextPathResult } from "./types";

/**
 * Baseline data from derivedTextData
 */
export type DerivedBaseline = {
  readonly position: { x: number; y: number };
  readonly width: number;
  readonly lineY: number;
  readonly lineHeight: number;
  readonly lineAscent: number;
  readonly firstCharacter: number;
  readonly endCharacter: number;
};

/**
 * Glyph data from derivedTextData
 */
export type DerivedGlyph = {
  readonly commandsBlob: number;
  readonly position: { x: number; y: number };
  readonly fontSize: number;
  readonly firstCharacter: number;
  readonly advance: number;
  readonly rotation?: number;
  readonly styleOverrideTable?: number;
};

/**
 * Decoration data from derivedTextData
 */
export type DerivedDecoration = {
  readonly rects: readonly { x: number; y: number; w: number; h: number }[];
  readonly styleID?: number;
};

/**
 * Derived text data structure from .fig files
 */
export type DerivedTextData = {
  readonly layoutSize?: { x: number; y: number };
  readonly baselines?: readonly DerivedBaseline[];
  readonly glyphs?: readonly DerivedGlyph[];
  readonly decorations?: readonly DerivedDecoration[];
  readonly fontMetaData?: readonly unknown[];
  readonly derivedLines?: readonly unknown[];
};

/**
 * Convert @aurochs/fig PathCommand to font PathCommand format
 *
 * The fig parser uses cp1x/cp1y/cp2x/cp2y and cpx/cpy names.
 * The font module uses x1/y1/x2/y2 names.
 */
function convertFigPathCommand(cmd: FigPathCommand): PathCommand {
  switch (cmd.type) {
    case "M":
      return { type: "M", x: cmd.x, y: cmd.y };
    case "L":
      return { type: "L", x: cmd.x, y: cmd.y };
    case "C":
      return {
        type: "C",
        x1: cmd.cp1x,
        y1: cmd.cp1y,
        x2: cmd.cp2x,
        y2: cmd.cp2y,
        x: cmd.x,
        y: cmd.y,
      };
    case "Q":
      return {
        type: "Q",
        x1: cmd.cpx,
        y1: cmd.cpy,
        x: cmd.x,
        y: cmd.y,
      };
    case "Z":
      return { type: "Z" };
  }
}

/**
 * Transform normalized glyph path commands to screen coordinates
 *
 * Blob paths are stored in normalized coordinates (0-1 range).
 * - x_screen = position.x + (normalized_x * fontSize)
 * - y_screen = round(position.y) - (normalized_y * fontSize)
 *
 * Y-axis is flipped: normalized space y increases upward (from baseline),
 * screen space y increases downward.
 */
export function transformGlyphCommands(
  commands: readonly PathCommand[],
  position: { x: number; y: number },
  fontSize: number,
): PathCommand[] {
  const baselineY = Math.round(position.y);
  const tx = (x: number) => position.x + x * fontSize;
  const ty = (y: number) => baselineY - y * fontSize;

  return commands.map((cmd): PathCommand => {
    switch (cmd.type) {
      case "M":
        return { type: "M", x: tx(cmd.x!), y: ty(cmd.y!) };
      case "L":
        return { type: "L", x: tx(cmd.x!), y: ty(cmd.y!) };
      case "C":
        return {
          type: "C",
          x1: tx(cmd.x1!),
          y1: ty(cmd.y1!),
          x2: tx(cmd.x2!),
          y2: ty(cmd.y2!),
          x: tx(cmd.x!),
          y: ty(cmd.y!),
        };
      case "Q":
        return {
          type: "Q",
          x1: tx(cmd.x1!),
          y1: ty(cmd.y1!),
          x: tx(cmd.x!),
          y: ty(cmd.y!),
        };
      case "Z":
        return { type: "Z" };
    }
  });
}

/**
 * Extract glyph path commands from a single glyph's blob data
 *
 * @param glyph - Derived glyph data
 * @param blobs - Blob array from .fig file
 * @returns PathCommand array in screen coordinates, or null
 */
export function extractDerivedGlyphCommands(glyph: DerivedGlyph, blobs: readonly FigBlob[]): PathCommand[] | null {
  if (glyph.commandsBlob === undefined || glyph.commandsBlob >= blobs.length) {
    return null;
  }

  const blob = blobs[glyph.commandsBlob];
  if (!blob) {
    return null;
  }

  const figCommands = decodePathCommands(blob);
  if (figCommands.length === 0) {
    return null;
  }

  // Convert from fig PathCommand format to font PathCommand format
  const commands = figCommands.map(convertFigPathCommand);

  // Transform to screen coordinates
  return transformGlyphCommands(commands, glyph.position, glyph.fontSize);
}

/**
 * Extract decoration rectangles from derived text data
 */
export function extractDerivedDecorations(decorations: readonly DerivedDecoration[] | undefined): DecorationRect[] {
  if (!decorations || decorations.length === 0) {
    return [];
  }

  const result: DecorationRect[] = [];
  for (const decoration of decorations) {
    for (const rect of decoration.rects) {
      result.push({
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
      });
    }
  }
  return result;
}

/**
 * Extract all glyph paths from derived text data
 *
 * @param derivedTextData - Derived text data from .fig node
 * @param blobs - Blob array from .fig file
 * @returns TextPathResult with glyph contours and decorations
 */
export function extractDerivedTextPathData(
  derivedTextData: DerivedTextData,
  blobs: readonly FigBlob[],
): TextPathResult {
  const glyphContours: PathContour[] = [];

  if (derivedTextData.glyphs) {
    for (const glyph of derivedTextData.glyphs) {
      const commands = extractDerivedGlyphCommands(glyph, blobs);
      if (commands && commands.length > 0) {
        glyphContours.push({ commands });
      }
    }
  }

  const decorations = extractDerivedDecorations(derivedTextData.decorations);

  return { glyphContours, decorations };
}

/**
 * Check if derived text data has glyph paths
 */
export function hasDerivedGlyphs(derivedTextData: DerivedTextData | undefined): boolean {
  return !!(derivedTextData?.glyphs && derivedTextData.glyphs.length > 0);
}
