/**
 * @file Text atom parsers
 *
 * @see [MS-PPT] Section 2.9.1 (TextHeaderAtom)
 * @see [MS-PPT] Section 2.9.2 (TextCharsAtom - Unicode)
 * @see [MS-PPT] Section 2.9.3 (TextBytesAtom - ANSI)
 * @see [MS-PPT] Section 2.9.17 (StyleTextPropAtom)
 */

import type { PptRecord } from "../types";
import { RT } from "../record-types";

/** Text types from TextHeaderAtom */
export const TEXT_TYPE = {
  TITLE: 0,
  BODY: 1,
  NOTES: 2,
  OTHER: 4,
  CENTER_BODY: 5,
  CENTER_TITLE: 6,
  HALF_BODY: 7,
  QUARTER_BODY: 8,
} as const;

export type TextHeaderAtomData = {
  readonly textType: number;
};

/** Parse TextHeaderAtom (recType=0x0F9F). */
export function parseTextHeaderAtom(record: PptRecord): TextHeaderAtomData {
  if (record.recType !== RT.TextHeaderAtom) {
    throw new Error(`Expected TextHeaderAtom (0x0F9F), got 0x${record.recType.toString(16)}`);
  }
  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  return { textType: view.getUint32(0, true) };
}

/** Decode TextCharsAtom (UTF-16LE Unicode text). */
export function decodeTextCharsAtom(record: PptRecord): string {
  if (record.recType !== RT.TextCharsAtom) {
    throw new Error(`Expected TextCharsAtom (0x0FA0), got 0x${record.recType.toString(16)}`);
  }
  return decodeUtf16Le(record.data);
}

/** Decode TextBytesAtom (single-byte encoded text, typically Latin-1). */
export function decodeTextBytesAtom(record: PptRecord): string {
  if (record.recType !== RT.TextBytesAtom) {
    throw new Error(`Expected TextBytesAtom (0x0FA8), got 0x${record.recType.toString(16)}`);
  }
  // Single-byte characters: treat as Latin-1
  const chars: string[] = [];
  for (let i = 0; i < record.data.length; i++) {
    chars.push(String.fromCharCode(record.data[i]));
  }
  return chars.join("");
}

function decodeUtf16Le(data: Uint8Array): string {
  const chars: string[] = [];
  for (let i = 0; i + 1 < data.length; i += 2) {
    const code = data[i] | (data[i + 1] << 8);
    chars.push(String.fromCharCode(code));
  }
  return chars.join("");
}

// =========================================================================
// StyleTextPropAtom parsing
// =========================================================================

export type ParagraphStyleRun = {
  readonly charCount: number;
  readonly indent?: number;
  readonly alignment?: number;
  readonly bulletFlags?: number;
  readonly bulletChar?: number;
  readonly bulletFontRef?: number;
  readonly bulletSize?: number;
  readonly bulletColor?: number;
  readonly lineSpacing?: number;
  readonly spaceBefore?: number;
  readonly spaceAfter?: number;
  readonly leftMargin?: number;
  readonly defaultTabSize?: number;
};

export type CharacterStyleRun = {
  readonly charCount: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly fontSize?: number;
  readonly fontRef?: number;
  readonly color?: number;
};

export type StyleTextPropData = {
  readonly paragraphRuns: readonly ParagraphStyleRun[];
  readonly characterRuns: readonly CharacterStyleRun[];
};

/**
 * Parse StyleTextPropAtom (recType=0x0FA1).
 *
 * Contains parallel arrays of paragraph-level and character-level style runs.
 * Each run has a charCount and a mask indicating which properties are present.
 *
 * Property read order follows [MS-PPT] / Apache POI convention — mask bits
 * do NOT determine read order; the order is fixed per the spec.
 */
export function parseStyleTextPropAtom(record: PptRecord, textLength: number): StyleTextPropData {
  if (record.recType !== RT.StyleTextPropAtom) {
    throw new Error(`Expected StyleTextPropAtom (0x0FA1), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  let offset = 0;

  function u16(): number { const v = view.getUint16(offset, true); offset += 2; return v; }
  function s16(): number { const v = view.getInt16(offset, true); offset += 2; return v; }
  function u32(): number { const v = view.getUint32(offset, true); offset += 4; return v; }
  function canRead(n: number): boolean { return offset + n <= record.data.byteLength; }

  // Parse paragraph runs
  const paragraphRuns: ParagraphStyleRun[] = [];
  let totalParagraphChars = 0;

  while (totalParagraphChars < textLength && canRead(4)) {
    const charCount = u32();
    totalParagraphChars += charCount;

    if (!canRead(2)) break;
    const indent = u16();

    if (!canRead(4)) { paragraphRuns.push({ charCount, indent }); break; }
    const mask = u32();

    const run: Record<string, number | boolean | undefined> = { charCount, indent };

    // Paragraph properties in FIXED read order per [MS-PPT]:
    if ((mask & 0x000F) && canRead(2)) run.bulletFlags = u16();
    if ((mask & 0x0080) && canRead(4)) run.bulletColor = u32(); // before bulletChar!
    if ((mask & 0x0010) && canRead(2)) run.bulletChar = u16();
    if ((mask & 0x0020) && canRead(2)) run.bulletFontRef = u16();
    if ((mask & 0x0040) && canRead(2)) run.bulletSize = u16();
    if ((mask & 0x0800) && canRead(2)) run.alignment = u16();
    if ((mask & 0x1000) && canRead(2)) run.lineSpacing = s16();
    if ((mask & 0x2000) && canRead(2)) run.spaceBefore = s16();
    if ((mask & 0x4000) && canRead(2)) run.spaceAfter = s16();
    if ((mask & 0x0100) && canRead(2)) run.leftMargin = u16();
    if ((mask & 0x0400) && canRead(2)) { /* indent/bulletOffset - skip */ u16(); }
    if ((mask & 0x8000) && canRead(2)) run.defaultTabSize = u16();
    // tabStops (variable length)
    if ((mask & 0x100000) && canRead(2)) {
      const count = u16();
      // Each tab stop is 4 bytes (position u16 + type u16)
      const skipBytes = count * 4;
      if (canRead(skipBytes)) offset += skipBytes;
    }
    if ((mask & 0x10000) && canRead(2)) { /* fontAlign */ u16(); }
    if ((mask & 0xE0000) && canRead(2)) { /* wrapFlags (charWrap + wordWrap + overflow) */ u16(); }
    if ((mask & 0x200000) && canRead(2)) { /* textDirection */ u16(); }

    paragraphRuns.push(run as unknown as ParagraphStyleRun);
  }

  // Parse character runs
  const characterRuns: CharacterStyleRun[] = [];
  let totalCharChars = 0;

  while (totalCharChars < textLength && canRead(4)) {
    const charCount = u32();
    totalCharChars += charCount;

    if (!canRead(4)) { characterRuns.push({ charCount }); break; }
    const mask = u32();

    const run: Record<string, number | boolean | undefined> = { charCount };

    // Character properties in FIXED read order per [MS-PPT]:
    // 1. Character flags word (if any of bits 0-15)
    if ((mask & 0xFFFF) && canRead(2)) {
      const flags = u16();
      run.bold = !!(flags & 0x0001);
      run.italic = !!(flags & 0x0002);
      run.underline = !!(flags & 0x0004);
      run.strikethrough = !!(flags & 0x0200);
    }
    // 2. Font references and size/color in POI order
    if ((mask & 0x10000) && canRead(2)) run.fontRef = u16();          // typeface (bit 16)
    if ((mask & 0x200000) && canRead(2)) { /* oldEATypeface */ u16(); }   // bit 21
    if ((mask & 0x400000) && canRead(2)) { /* ansiTypeface */ u16(); }    // bit 22
    if ((mask & 0x800000) && canRead(2)) { /* symbolTypeface */ u16(); }  // bit 23
    if ((mask & 0x20000) && canRead(2)) run.fontSize = u16();         // size (bit 17)
    if ((mask & 0x40000) && canRead(4)) run.color = u32();            // color (bit 18)
    if ((mask & 0x80000) && canRead(2)) { /* position */ u16(); }         // bit 19
    // pp10ext (bit 20)
    if ((mask & 0x100000) && canRead(2)) { /* pp10ext */ u16(); }
    // newEATypeface (bit 24)
    if ((mask & 0x1000000) && canRead(2)) { /* newEATypeface */ u16(); }
    // csTypeface (bit 25)
    if ((mask & 0x2000000) && canRead(2)) { /* csTypeface */ u16(); }
    // pp11ext (bit 26)
    if ((mask & 0x4000000) && canRead(2)) { /* pp11ext */ u16(); }

    characterRuns.push(run as unknown as CharacterStyleRun);
  }

  return { paragraphRuns, characterRuns };
}

// =========================================================================
// FontEntityAtom parsing
// =========================================================================

export type FontEntityAtomData = {
  readonly name: string;
  readonly charset: number;
  readonly flags: number;
  readonly pitchAndFamily: number;
};

/** Parse FontEntityAtom (recType=0x0FB7) to extract font name. */
export function parseFontEntityAtom(record: PptRecord): FontEntityAtomData {
  if (record.recType !== RT.FontEntityAtom) {
    throw new Error(`Expected FontEntityAtom (0x0FB7), got 0x${record.recType.toString(16)}`);
  }
  // Font name is stored as 64 bytes of UTF-16LE, null-terminated
  const nameEnd = Math.min(64, record.data.byteLength);
  let name = "";
  for (let i = 0; i + 1 < nameEnd; i += 2) {
    const code = record.data[i] | (record.data[i + 1] << 8);
    if (code === 0) break;
    name += String.fromCharCode(code);
  }

  const charset = record.data.byteLength > 64 ? record.data[64] : 0;
  const flags = record.data.byteLength > 65 ? record.data[65] : 0;
  const pitchAndFamily = record.data.byteLength > 66 ? record.data[66] : 0;

  return { name, charset, flags, pitchAndFamily };
}
