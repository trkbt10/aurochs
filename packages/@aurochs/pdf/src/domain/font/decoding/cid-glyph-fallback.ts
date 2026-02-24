/**
 * @file CID -> Unicode supplemental fallback mapping helpers.
 */

import { parseTrueTypeTableDirectory } from "../truetype-parser";

const MAX_CMAP_ENTRIES = 200_000;

export type CidToGidMapping =
  | { readonly kind: "identity" }
  | { readonly kind: "table"; readonly bytes: Uint8Array };

function isValidCodePoint(codePoint: number): boolean {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff;
}

function chooseSubtableScore(platformId: number, encodingId: number, format: number): number {
  if (format !== 4 && format !== 12) {
    return -1;
  }

  if (platformId === 0) {
    return format === 12 ? 320 : 310;
  }

  if (platformId !== 3) {
    return -1;
  }

  if (encodingId === 10) {
    return format === 12 ? 300 : 290;
  }
  if (encodingId === 1) {
    return format === 12 ? 280 : 270;
  }
  if (encodingId === 0) {
    return format === 12 ? 260 : 250;
  }

  return -1;
}

function parseFormat12Subtable(args: {
  readonly view: DataView;
  readonly subtableOffset: number;
  readonly subtableLength: number;
  readonly codePointToGlyph: Map<number, number>;
}): void {
  const {
    view,
    subtableOffset,
    subtableLength,
    codePointToGlyph,
  } = args;
  if (subtableLength < 16) {
    return;
  }
  const nGroups = view.getUint32(subtableOffset + 12, false);
  const state = { budget: MAX_CMAP_ENTRIES };

  for (let i = 0; i < nGroups; i += 1) {
    if (state.budget <= 0) {
      return;
    }
    const groupOffset = subtableOffset + 16 + i * 12;
    if (groupOffset + 12 > subtableOffset + subtableLength) {
      return;
    }

    const startCharCode = view.getUint32(groupOffset, false);
    const endCharCode = view.getUint32(groupOffset + 4, false);
    const startGlyphId = view.getUint32(groupOffset + 8, false);
    if (endCharCode < startCharCode) {
      continue;
    }

    const rangeLength = endCharCode - startCharCode + 1;
    const takeCount = Math.min(rangeLength, state.budget);
    for (let offset = 0; offset < takeCount; offset += 1) {
      const codePoint = startCharCode + offset;
      if (!isValidCodePoint(codePoint)) {
        continue;
      }
      const glyphId = startGlyphId + offset;
      if (glyphId === 0) {
        continue;
      }
      if (!codePointToGlyph.has(codePoint)) {
        codePointToGlyph.set(codePoint, glyphId);
      }
    }
    state.budget -= takeCount;
  }
}

function parseFormat4Subtable(args: {
  readonly view: DataView;
  readonly subtableOffset: number;
  readonly subtableLength: number;
  readonly codePointToGlyph: Map<number, number>;
}): void {
  const {
    view,
    subtableOffset,
    subtableLength,
    codePointToGlyph,
  } = args;
  if (subtableLength < 16) {
    return;
  }

  const segCountX2 = view.getUint16(subtableOffset + 6, false);
  if (segCountX2 === 0 || segCountX2 % 2 !== 0) {
    return;
  }

  const segCount = segCountX2 / 2;
  const endCodesOffset = subtableOffset + 14;
  const startCodesOffset = endCodesOffset + segCount * 2 + 2;
  const idDeltaOffset = startCodesOffset + segCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segCount * 2;
  const required = idRangeOffsetOffset + segCount * 2;
  if (required > subtableOffset + subtableLength) {
    return;
  }

  const state = { budget: MAX_CMAP_ENTRIES };
  for (let i = 0; i < segCount; i += 1) {
    if (state.budget <= 0) {
      return;
    }

    const endCode = view.getUint16(endCodesOffset + i * 2, false);
    const startCode = view.getUint16(startCodesOffset + i * 2, false);
    const idDelta = view.getInt16(idDeltaOffset + i * 2, false);
    const idRangeOffset = view.getUint16(idRangeOffsetOffset + i * 2, false);
    if (endCode < startCode) {
      continue;
    }

    const segmentEnd = Math.min(endCode, 0xfffe);
    for (let codePoint = startCode; codePoint <= segmentEnd && state.budget > 0; codePoint += 1) {
      const glyphId = resolveFormat4GlyphId({
        view,
        subtableOffset,
        subtableLength,
        idRangeOffsetOffset,
        segmentIndex: i,
        idRangeOffset,
        startCode,
        idDelta,
        codePoint,
      });

      if (glyphId !== 0 && !codePointToGlyph.has(codePoint)) {
        codePointToGlyph.set(codePoint, glyphId);
      }
      state.budget -= 1;
    }
  }
}

function resolveFormat4GlyphId(args: {
  readonly view: DataView;
  readonly subtableOffset: number;
  readonly subtableLength: number;
  readonly idRangeOffsetOffset: number;
  readonly segmentIndex: number;
  readonly idRangeOffset: number;
  readonly startCode: number;
  readonly idDelta: number;
  readonly codePoint: number;
}): number {
  const {
    view,
    subtableOffset,
    subtableLength,
    idRangeOffsetOffset,
    segmentIndex,
    idRangeOffset,
    startCode,
    idDelta,
    codePoint,
  } = args;
  if (idRangeOffset === 0) {
    return (codePoint + idDelta) & 0xffff;
  }

  const idRangeOffsetWord = idRangeOffsetOffset + segmentIndex * 2;
  const glyphIndexOffset = idRangeOffsetWord + idRangeOffset + (codePoint - startCode) * 2;
  if (glyphIndexOffset + 2 > subtableOffset + subtableLength) {
    return 0;
  }

  const glyphIndex = view.getUint16(glyphIndexOffset, false);
  if (glyphIndex === 0) {
    return 0;
  }
  return (glyphIndex + idDelta) & 0xffff;
}

function readCmapSubtableLength(args: {
  readonly view: DataView;
  readonly cmapLength: number;
  readonly subtableOffset: number;
  readonly format: number;
}): number {
  const { view, cmapLength, subtableOffset, format } = args;
  if (format === 4) {
    if (subtableOffset + 4 > cmapLength) {
      return 0;
    }
    return view.getUint16(subtableOffset + 2, false);
  }
  if (subtableOffset + 8 > cmapLength) {
    return 0;
  }
  return view.getUint32(subtableOffset + 4, false);
}

function reverseCodePointToGlyphMap(codePointToGlyph: ReadonlyMap<number, number>): ReadonlyMap<number, string> {
  const glyphToCodePoint = new Map<number, number>();
  for (const [codePoint, glyphId] of codePointToGlyph.entries()) {
    const existing = glyphToCodePoint.get(glyphId);
    if (existing === undefined || codePoint < existing) {
      glyphToCodePoint.set(glyphId, codePoint);
    }
  }

  const glyphToUnicode = new Map<number, string>();
  for (const [glyphId, codePoint] of glyphToCodePoint.entries()) {
    if (!isValidCodePoint(codePoint)) {
      continue;
    }
    glyphToUnicode.set(glyphId, String.fromCodePoint(codePoint));
  }
  return glyphToUnicode;
}

/**
 * Extract glyphId -> Unicode map from raw cmap table bytes.
 */
export function extractGlyphIdToUnicodeFromCmapTable(cmapTable: Uint8Array): ReadonlyMap<number, string> {
  if (cmapTable.length < 4) {
    return new Map();
  }

  const view = new DataView(cmapTable.buffer, cmapTable.byteOffset, cmapTable.byteLength);
  const numTables = view.getUint16(2, false);
  if (numTables === 0) {
    return new Map();
  }

  type Candidate = {
    readonly score: number;
    readonly format: 4 | 12;
    readonly subtableOffset: number;
    readonly subtableLength: number;
  };
  const candidates: Candidate[] = [];

  for (let i = 0; i < numTables; i += 1) {
    const recordOffset = 4 + i * 8;
    if (recordOffset + 8 > cmapTable.length) {
      break;
    }
    const platformId = view.getUint16(recordOffset, false);
    const encodingId = view.getUint16(recordOffset + 2, false);
    const subtableOffset = view.getUint32(recordOffset + 4, false);
    if (subtableOffset + 4 > cmapTable.length) {
      continue;
    }
    const format = view.getUint16(subtableOffset, false);
    const score = chooseSubtableScore(platformId, encodingId, format);
    if (score < 0) {
      continue;
    }

    const subtableLength = readCmapSubtableLength({
      view,
      cmapLength: cmapTable.length,
      subtableOffset,
      format,
    });
    if (subtableLength <= 0 || subtableOffset + subtableLength > cmapTable.length) {
      continue;
    }

    candidates.push({
      score,
      format: format as 4 | 12,
      subtableOffset,
      subtableLength,
    });
  }

  if (candidates.length === 0) {
    return new Map();
  }

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const codePointToGlyph = new Map<number, number>();
  for (const candidate of sorted) {
    if (candidate.format === 12) {
      parseFormat12Subtable({
        view,
        subtableOffset: candidate.subtableOffset,
        subtableLength: candidate.subtableLength,
        codePointToGlyph,
      });
      continue;
    }
    parseFormat4Subtable({
      view,
      subtableOffset: candidate.subtableOffset,
      subtableLength: candidate.subtableLength,
      codePointToGlyph,
    });
  }

  return reverseCodePointToGlyphMap(codePointToGlyph);
}

/**
 * Extract glyphId -> Unicode map from a TrueType/OpenType font program.
 */
export function extractGlyphIdToUnicodeFromTrueTypeLikeFont(fontData: Uint8Array): ReadonlyMap<number, string> {
  const table = parseTrueTypeTableDirectory(fontData).find((entry) => entry.tag === "cmap");
  if (!table) {
    return new Map();
  }
  if (table.offset < 0 || table.length <= 0) {
    return new Map();
  }
  if (table.offset + table.length > fontData.length) {
    return new Map();
  }
  const cmapTable = fontData.subarray(table.offset, table.offset + table.length);
  return extractGlyphIdToUnicodeFromCmapTable(cmapTable);
}

/**
 * Build CID code -> Unicode fallback map from CIDToGID mapping and glyph cmap.
 */
export function buildCidCodeToUnicodeFallbackMap(args: {
  readonly cidToGid: CidToGidMapping;
  readonly glyphIdToUnicode: ReadonlyMap<number, string>;
}): ReadonlyMap<number, string> {
  const { cidToGid, glyphIdToUnicode } = args;
  if (glyphIdToUnicode.size === 0) {
    return new Map();
  }

  if (cidToGid.kind === "identity") {
    const fallback = new Map<number, string>();
    for (const [glyphId, unicode] of glyphIdToUnicode.entries()) {
      if (!Number.isInteger(glyphId) || glyphId < 0 || glyphId > 0xffff) {
        continue;
      }
      fallback.set(glyphId, unicode);
    }
    return fallback;
  }

  const fallback = new Map<number, string>();
  const pairCount = Math.floor(cidToGid.bytes.length / 2);
  const view = new DataView(cidToGid.bytes.buffer, cidToGid.bytes.byteOffset, cidToGid.bytes.byteLength);
  for (let cidCode = 0; cidCode < pairCount; cidCode += 1) {
    const glyphId = view.getUint16(cidCode * 2, false);
    if (glyphId === 0) {
      continue;
    }
    const unicode = glyphIdToUnicode.get(glyphId);
    if (!unicode) {
      continue;
    }
    fallback.set(cidCode, unicode);
  }
  return fallback;
}
