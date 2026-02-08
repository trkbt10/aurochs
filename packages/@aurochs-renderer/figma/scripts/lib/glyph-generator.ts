/**
 * @file Generate glyph outline blobs from opentype.js fonts
 *
 * Extracts glyph outlines and encodes them as normalized blobs
 * compatible with FigFileBuilder's derivedTextData format.
 *
 * Coordinate system:
 *   Blob space: normalized (0-1 range), y-up from baseline
 *   Font units: glyph.path has y-up convention, divide by unitsPerEm to normalize
 *   Screen space (at extraction): screen_x = pos.x + norm_x * fontSize
 *                                  screen_y = pos.y - norm_y * fontSize
 */

import type { Font, Glyph, PathCommand } from "opentype.js";
import type { FigBlob, DerivedBaselineData } from "@aurochs/fig/builder";

export type GlyphRecord = {
  commandsBlob: number;
  position: { x: number; y: number };
  styleID: number;
  fontSize: number;
  firstCharacter: number;
  advance: number;
};

export type GlyphGenResult = {
  glyphs: GlyphRecord[];
  blobs: FigBlob[];
  baselines: DerivedBaselineData[];
  layoutSize: { x: number; y: number };
};

/**
 * Encode a glyph's path commands as a normalized blob.
 *
 * All coordinates are divided by unitsPerEm to produce 0-1 range.
 * Quadratic curves (Q) are converted to cubic (C) inline.
 */
function encodeGlyphBlob(glyph: Glyph, unitsPerEm: number): FigBlob | null {
  const commands = glyph.path.commands;
  if (!commands || commands.length === 0) return null;

  // Figma glyph blobs: leading 0x00 byte, NO close (Z) commands,
  // contours separated by M only. Matches real Figma .fig format.
  const data: number[] = [0x00]; // leading header byte
  const s = 1 / unitsPerEm;

  let curX = 0;
  let curY = 0;

  function writeFloat32(value: number): void {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, value, true);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < 4; i++) data.push(bytes[i]);
  }

  for (const cmd of commands as PathCommand[]) {
    switch (cmd.type) {
      case "M":
        data.push(0x01); // CMD_MOVE_TO
        writeFloat32(cmd.x * s);
        writeFloat32(cmd.y * s);
        curX = cmd.x;
        curY = cmd.y;
        break;
      case "L":
        data.push(0x02); // CMD_LINE_TO
        writeFloat32(cmd.x * s);
        writeFloat32(cmd.y * s);
        curX = cmd.x;
        curY = cmd.y;
        break;
      case "C":
        data.push(0x04); // CMD_CUBIC_TO
        writeFloat32(cmd.x1 * s);
        writeFloat32(cmd.y1 * s);
        writeFloat32(cmd.x2 * s);
        writeFloat32(cmd.y2 * s);
        writeFloat32(cmd.x * s);
        writeFloat32(cmd.y * s);
        curX = cmd.x;
        curY = cmd.y;
        break;
      case "Q": {
        // Convert quadratic to cubic: CP1 = P0 + 2/3*(P1-P0), CP2 = P2 + 2/3*(P1-P2)
        const p0x = curX;
        const p0y = curY;
        const p1x = cmd.x1;
        const p1y = cmd.y1;
        const p2x = cmd.x;
        const p2y = cmd.y;
        const cp1x = p0x + (2 / 3) * (p1x - p0x);
        const cp1y = p0y + (2 / 3) * (p1y - p0y);
        const cp2x = p2x + (2 / 3) * (p1x - p2x);
        const cp2y = p2y + (2 / 3) * (p1y - p2y);
        data.push(0x04); // CMD_CUBIC_TO
        writeFloat32(cp1x * s);
        writeFloat32(cp1y * s);
        writeFloat32(cp2x * s);
        writeFloat32(cp2y * s);
        writeFloat32(p2x * s);
        writeFloat32(p2y * s);
        curX = p2x;
        curY = p2y;
        break;
      }
      case "Z":
        // Figma glyph blobs do NOT use close commands.
        // Contours are implicitly closed by the fill rule.
        break;
    }
  }

  // Trailing end marker
  data.push(0x00);

  return { bytes: data };
}

/**
 * Generate derived text glyph data for a single-line text string.
 *
 * @param text - The text string
 * @param font - opentype.js Font object
 * @param fontSize - Font size in pixels
 * @param baselineX - X position of first glyph (text node local coords)
 * @param baselineY - Y baseline position (text node local coords)
 * @param letterSpacing - Extra spacing between characters (pixels)
 * @returns Glyph records and blob data (commandsBlob indices are 0-based, must be remapped)
 */
export function generateTextGlyphs(params: {
  text: string;
  font: Font;
  fontSize: number;
  baselineX: number;
  baselineY: number;
  letterSpacing?: number;
}): GlyphGenResult {
  const { text, font, fontSize, baselineX, baselineY, letterSpacing = 0 } = params;
  const unitsPerEm = font.unitsPerEm;
  const scale = fontSize / unitsPerEm;

  const glyphs: GlyphRecord[] = [];
  const blobs: FigBlob[] = [];

  // Cache: glyph index → blob array index (for deduplication)
  const blobCache = new Map<number, number>();

  let curX = baselineX;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const glyph = font.charToGlyph(char);
    const advanceWidth = (glyph.advanceWidth ?? 0) / unitsPerEm;

    // Skip whitespace glyphs (no outline) but still advance position
    let blobIndex: number;
    const cachedIndex = blobCache.get(glyph.index);

    if (cachedIndex !== undefined) {
      blobIndex = cachedIndex;
    } else {
      const blob = encodeGlyphBlob(glyph, unitsPerEm);
      if (blob && blob.bytes.length > 1) {
        // Has actual path data (more than just the 0x00 terminator)
        blobIndex = blobs.length;
        blobs.push(blob);
        blobCache.set(glyph.index, blobIndex);
      } else {
        // Space or empty glyph - advance but no blob
        curX += advanceWidth * fontSize + (i < text.length - 1 ? letterSpacing : 0);
        continue;
      }
    }

    glyphs.push({
      commandsBlob: blobIndex,
      position: { x: curX, y: baselineY },
      styleID: 0,
      fontSize,
      firstCharacter: i,
      advance: advanceWidth,
    });

    curX += advanceWidth * fontSize + (i < text.length - 1 ? letterSpacing : 0);
  }

  // Compute text width for this line
  const textWidth = curX - baselineX;

  // Compute baseline data for this single line
  const lineAscent = (font.ascender / unitsPerEm) * fontSize;
  const lineHeight = ((font.ascender - font.descender) / unitsPerEm) * fontSize;
  const lineY = baselineY - lineAscent;

  const baselines: DerivedBaselineData[] = [
    {
      position: { x: baselineX, y: baselineY },
      width: textWidth,
      lineY,
      lineHeight,
      lineAscent,
      firstCharacter: 0,
      endCharacter: text.length,
    },
  ];

  const layoutSize = { x: textWidth, y: lineHeight };

  return { glyphs, blobs, baselines, layoutSize };
}

/**
 * Generate derived text glyph data for multi-line text.
 *
 * @param lines - Array of text lines (split by \n)
 * @param font - opentype.js Font object
 * @param fontSize - Font size in pixels
 * @param baselineX - X position of first glyph
 * @param firstBaselineY - Y baseline of first line
 * @param lineHeight - Line height in pixels
 * @param letterSpacing - Extra letter spacing in pixels
 * @returns Combined glyph records and blobs for all lines
 */
export function generateMultilineTextGlyphs(params: {
  lines: string[];
  font: Font;
  fontSize: number;
  baselineX: number;
  firstBaselineY: number;
  lineHeight: number;
  letterSpacing?: number;
}): GlyphGenResult {
  const { lines, font, fontSize, baselineX, firstBaselineY, lineHeight, letterSpacing } = params;

  const allGlyphs: GlyphRecord[] = [];
  const allBlobs: FigBlob[] = [];
  const allBaselines: DerivedBaselineData[] = [];

  let charOffset = 0;
  let maxWidth = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx];
    const baselineY = firstBaselineY + lineIdx * lineHeight;
    const result = generateTextGlyphs({
      text: lineText,
      font,
      fontSize,
      baselineX,
      baselineY,
      letterSpacing,
    });

    // Remap blob indices to the combined blobs array
    const indexMap = new Map<number, number>();
    for (let i = 0; i < result.blobs.length; i++) {
      const newIndex = allBlobs.length;
      allBlobs.push(result.blobs[i]);
      indexMap.set(i, newIndex);
    }

    for (const glyph of result.glyphs) {
      allGlyphs.push({
        ...glyph,
        commandsBlob: indexMap.get(glyph.commandsBlob) ?? glyph.commandsBlob,
        firstCharacter: glyph.firstCharacter + charOffset,
      });
    }

    // Remap baseline character indices
    for (const baseline of result.baselines) {
      allBaselines.push({
        ...baseline,
        firstCharacter: baseline.firstCharacter + charOffset,
        endCharacter: baseline.endCharacter + charOffset,
      });
      if (baseline.width > maxWidth) maxWidth = baseline.width;
    }

    charOffset += lineText.length + 1; // +1 for \n
  }

  const totalHeight = lines.length * lineHeight;
  const layoutSize = { x: maxWidth, y: totalHeight };

  return { glyphs: allGlyphs, blobs: allBlobs, baselines: allBaselines, layoutSize };
}

/**
 * Compute the total rendered width of a text string in pixels.
 *
 * Includes letter spacing between characters (not after the last).
 */
export function computeTextWidth(params: {
  text: string;
  font: Font;
  fontSize: number;
  letterSpacing?: number;
}): number {
  const { text, font, fontSize, letterSpacing = 0 } = params;
  const unitsPerEm = font.unitsPerEm;

  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    const advanceWidth = (glyph.advanceWidth ?? 0) / unitsPerEm;
    width += advanceWidth * fontSize;
    if (i < text.length - 1) {
      width += letterSpacing;
    }
  }
  return width;
}

/**
 * Compute baseline X offset for text alignment within a box.
 *
 * @param align - "LEFT", "CENTER", or "RIGHT"
 * @param boxWidth - Width of the text box
 * @param textWidth - Measured width of the text string
 */
export function computeAlignmentOffset(
  align: "LEFT" | "CENTER" | "RIGHT",
  boxWidth: number,
  textWidth: number,
): number {
  switch (align) {
    case "CENTER":
      return (boxWidth - textWidth) / 2;
    case "RIGHT":
      return boxWidth - textWidth;
    case "LEFT":
    default:
      return 0;
  }
}

/**
 * Compute baseline Y for top-aligned text.
 *
 * For Inter: ascender=1984, unitsPerEm=2048 → baselineY ≈ fontSize * 0.969
 */
export function computeBaselineY(font: Font, fontSize: number): number {
  return (font.ascender / font.unitsPerEm) * fontSize;
}

/**
 * Compute default line height (Figma "Auto").
 *
 * lineHeight = (ascender - descender) / unitsPerEm * fontSize
 */
export function computeAutoLineHeight(font: Font, fontSize: number): number {
  return ((font.ascender - font.descender) / font.unitsPerEm) * fontSize;
}
