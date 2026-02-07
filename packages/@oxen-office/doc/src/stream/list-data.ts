/**
 * @file List definition (PlfLst / PlfLfo) parser
 *
 * Reference: [MS-DOC] 2.9.160 (PlfLst), 2.9.133 (LSTF), 2.9.131 (LVL)
 *
 * PlfLst: cLst(2B) + LSTF[cLst] + LVL[] (variable, after all LSTFs)
 * LSTF: 28 bytes each (lsid, tplc, rgistdPara[9], flags, grfhic)
 * LVL: LVLF(28B) + grpprlPapx(cbGrpprlPapx bytes) + grpprlChpx(cbGrpprlChpx bytes) + xst
 */

import type { DocListDefinition, DocListLevel, DocListLevelOverride, DocListOverride } from "../domain/types";

/** Parse PlfLst from the table stream. */
export function parseListDefinitions(tableStream: Uint8Array, fc: number, lcb: number): readonly DocListDefinition[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cLst = view.getInt16(fc, true);
  if (cLst <= 0) return [];

  // Parse LSTF entries (28 bytes each)
  const lstfs: Array<{ lsid: number; simpleList: boolean; levelCount: number }> = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 2;

  for (let i = 0; i < cLst; i++) {
    if (offset + 28 > fc + lcb) break;

    const lsid = view.getInt32(offset, true);
    const flags = tableStream[offset + 26];
    const simpleList = (flags & 0x01) !== 0;
    const levelCount = simpleList ? 1 : 9;

    lstfs.push({ lsid, simpleList, levelCount });
    offset += 28;
  }

  // Parse LVL entries (variable length, after all LSTFs)
  const definitions: DocListDefinition[] = [];
  for (const lstf of lstfs) {
    const levels: DocListLevel[] = [];
    for (let lvl = 0; lvl < lstf.levelCount; lvl++) {
      if (offset + 28 > fc + lcb) break;

      const level = parseLvl(tableStream, offset, fc + lcb);
      if (!level) break;

      levels.push(level.level);
      offset = level.nextOffset;
    }

    definitions.push({
      lsid: lstf.lsid,
      levels,
      simpleList: lstf.simpleList,
    });
  }

  return definitions;
}

function parseLvl(
  data: Uint8Array,
  offset: number,
  end: number,
): { level: DocListLevel; nextOffset: number } | undefined {
  if (offset + 28 > end) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // LVLF (28 bytes)
  const iStartAt = view.getInt32(offset, true);
  const nfc = data[offset + 4];
  const jcFlags = data[offset + 5];
  const jc = jcFlags & 0x03;
  const ixchFollow = data[offset + 17];
  const cbGrpprlChpx = data[offset + 26];
  const cbGrpprlPapx = data[offset + 27];

  // Skip LVLF + grpprlPapx + grpprlChpx
  // eslint-disable-next-line no-restricted-syntax -- offset calc
  let pos = offset + 28 + cbGrpprlPapx + cbGrpprlChpx;

  // xst: cch(2B) + UTF-16LE string
  let text = "";
  if (pos + 2 <= end) {
    const cch = view.getUint16(pos, true);
    pos += 2;
    if (cch > 0 && pos + cch * 2 <= end) {
      const textBytes = data.subarray(pos, pos + cch * 2);
      text = new TextDecoder("utf-16le").decode(textBytes);
      pos += cch * 2;
    }
  }

  return {
    level: {
      start: iStartAt,
      format: nfc,
      text,
      alignment: jc,
      follow: ixchFollow,
    },
    nextOffset: pos,
  };
}

/** Parse PlfLfo from the table stream. */
export function parseListOverrides(tableStream: Uint8Array, fc: number, lcb: number): readonly DocListOverride[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cLfo = view.getInt32(fc, true);
  if (cLfo <= 0) return [];

  // First pass: read all LFO entries (16 bytes each), collecting lsid and clfolvl
  const lfoEntries: Array<{ lsid: number; clfolvl: number }> = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 4;

  for (let i = 0; i < cLfo; i++) {
    if (offset + 16 > fc + lcb) break;

    const lsid = view.getInt32(offset, true);
    // clfolvl is at offset +8 within the LFO structure (4B)
    const clfolvl = view.getUint32(offset + 8, true);
    lfoEntries.push({ lsid, clfolvl });
    offset += 16;
  }

  // Second pass: parse LFOLVL entries (after all LFO entries)
  const overrides: DocListOverride[] = [];

  for (const entry of lfoEntries) {
    if (entry.clfolvl === 0) {
      overrides.push({ lsid: entry.lsid });
      continue;
    }

    const levelOverrides: DocListLevelOverride[] = [];
    for (let j = 0; j < entry.clfolvl; j++) {
      if (offset + 8 > fc + lcb) break;

      const lfolvl = parseLfolvl(tableStream, offset, fc + lcb);
      if (!lfolvl) break;

      levelOverrides.push(lfolvl.override);
      offset = lfolvl.nextOffset;
    }

    overrides.push({
      lsid: entry.lsid,
      ...(levelOverrides.length > 0 ? { levelOverrides } : {}),
    });
  }

  return overrides;
}

/**
 * Parse a single LFOLVL entry.
 *
 * Structure:
 *   iStartAt(4B) + flags(4B: ilvl:4 + fStartAt:1 + fFormatting:1 + reserved:26)
 *   If fFormatting=1, a full LVL structure follows.
 */
function parseLfolvl(
  data: Uint8Array,
  offset: number,
  end: number,
): { override: DocListLevelOverride; nextOffset: number } | undefined {
  if (offset + 8 > end) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const iStartAt = view.getInt32(offset, true);
  const flags = view.getUint32(offset + 4, true);
  const ilvl = flags & 0x0f;
  const fStartAt = (flags >> 4) & 0x01;
  const fFormatting = (flags >> 5) & 0x01;

  // eslint-disable-next-line no-restricted-syntax -- offset tracking
  let nextOffset = offset + 8;

  // If fFormatting=1, a full LVL structure follows (skip it)
  if (fFormatting === 1) {
    const lvl = parseLvl(data, nextOffset, end);
    if (lvl) {
      nextOffset = lvl.nextOffset;
    }
  }

  const override: DocListLevelOverride = {
    level: ilvl,
    ...(fStartAt === 1 ? { startOverride: iStartAt } : {}),
  };

  return { override, nextOffset };
}
