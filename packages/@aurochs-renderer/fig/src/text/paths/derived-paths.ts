/**
 * @file Extract glyph outline paths from derived text data (pre-computed in .fig files)
 *
 * Derived text data contains pre-computed glyph paths stored as blobs.
 * These paths achieve exact visual match (0% diff) with Figma's export.
 */

import { decodePathCommands, type FigBlob } from "@aurochs/fig/parser";
import type { PathCommand } from "../../font/types";
import type { PathContour, DecorationRect, TextPathResult } from "./types";
import type {
  DerivedGlyph,
  DerivedDecoration,
  DerivedTextData,
} from "@aurochs/fig/domain";

/**
 * Transform normalized glyph path commands to screen coordinates
 *
 * Blob paths are stored in normalized coordinates (0-1 range).
 * - x_screen = position.x + alignmentOffset.x + (normalized_x * fontSize)
 * - y_screen = round(position.y + alignmentOffset.y) - (normalized_y * fontSize)
 *
 * Y-axis is flipped: normalized space y increases upward (from baseline),
 * screen space y increases downward.
 *
 * `alignmentOffset` accounts for the translation Figma applies when the
 * resolved text block (`derivedTextData.layoutSize`) is smaller than the
 * TEXT node's own box and alignment is not top-left. For single-codepoint
 * SF Symbol glyphs this is often the difference between a raw (x,y) in the
 * glyph's pre-layout coordinate and the centered rendering Figma exports.
 */
export function transformGlyphCommands(
  commands: readonly PathCommand[],
  position: { x: number; y: number },
  fontSize: number,
  alignmentOffset: { x: number; y: number } = { x: 0, y: 0 },
): PathCommand[] {
  const baselineY = Math.round(position.y + alignmentOffset.y);
  const tx = (x: number) => position.x + alignmentOffset.x + x * fontSize;
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
 * @param alignmentOffset - Translation to apply on top of `glyph.position`
 * @returns PathCommand array in screen coordinates, or null
 */
export function extractDerivedGlyphCommands(
  glyph: DerivedGlyph,
  blobs: readonly FigBlob[],
  alignmentOffset: { x: number; y: number } = { x: 0, y: 0 },
): PathCommand[] | null {
  if (glyph.commandsBlob === undefined || glyph.commandsBlob >= blobs.length) {
    return null;
  }

  const blob = blobs[glyph.commandsBlob];
  if (!blob) {
    return null;
  }

  const commands = decodePathCommands(blob);
  if (commands.length === 0) {
    return null;
  }

  // Transform to screen coordinates
  return transformGlyphCommands(commands, glyph.position, glyph.fontSize, alignmentOffset);
}

/**
 * Extract decoration rectangles from derived text data
 */
export function extractDerivedDecorations(
  decorations: readonly DerivedDecoration[] | undefined,
  alignmentOffset: { x: number; y: number } = { x: 0, y: 0 },
): DecorationRect[] {
  if (!decorations || decorations.length === 0) {
    return [];
  }

  const result: DecorationRect[] = [];
  for (const decoration of decorations) {
    for (const rect of decoration.rects) {
      result.push({
        x: rect.x + alignmentOffset.x,
        y: rect.y + alignmentOffset.y,
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
 * @param alignmentOffset - Translation to apply on top of every glyph's
 *   `position`, accounting for the difference between the node's text box
 *   and the resolved `layoutSize`. Must include alignment-aware offsets
 *   for both decorations (applied as-is) and glyphs (passed through).
 * @returns TextPathResult with glyph contours and decorations
 */
export function extractDerivedTextPathData(
  derivedTextData: DerivedTextData,
  blobs: readonly FigBlob[],
  alignmentOffset: { x: number; y: number } = { x: 0, y: 0 },
): TextPathResult {
  const glyphContours: PathContour[] = [];

  if (derivedTextData.glyphs) {
    // When the node has `truncationStartIndex >= 0`, Figma's layout engine
    // has already inserted an ellipsis glyph (the one with
    // `firstCharacter === undefined`) in the position where truncation
    // happens. The glyphs for source characters with
    // `firstCharacter >= truncationStartIndex` are still present in the
    // array — Figma carries the full source text in the glyph set and
    // relies on the renderer to suppress the post-truncation tail.
    //
    // Our SVG clip-path trims glyphs that overflow the text box's y
    // extent, but glyphs that overflow horizontally within the same
    // line (or wrap to extra lines beyond the truncated line) slip
    // through — e.g. "Add Bookmark to..." glyphs place ` to` after
    // the ellipsis on the same line, and remain visible in the 78×30
    // TEXT box. The fix: drop any glyph whose `firstCharacter` is at or
    // past `truncationStartIndex`. The ellipsis glyph itself carries
    // `firstCharacter === undefined` and is preserved.
    const truncStart = derivedTextData.truncationStartIndex;
    const hasTrunc = typeof truncStart === "number" && truncStart >= 0;
    for (const glyph of derivedTextData.glyphs) {
      if (hasTrunc && typeof glyph.firstCharacter === "number" && glyph.firstCharacter >= truncStart) {
        continue;
      }
      const commands = extractDerivedGlyphCommands(glyph, blobs, alignmentOffset);
      if (commands && commands.length > 0) {
        glyphContours.push({ commands });
      }
    }
  }

  const decorations = extractDerivedDecorations(derivedTextData.decorations, alignmentOffset);

  return { glyphContours, decorations };
}

/**
 * Check if derived text data has glyph paths
 */
export function hasDerivedGlyphs(derivedTextData: DerivedTextData | undefined): boolean {
  return !!(derivedTextData?.glyphs && derivedTextData.glyphs.length > 0);
}
