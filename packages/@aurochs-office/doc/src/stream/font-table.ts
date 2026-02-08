/**
 * @file Font table (SttbfFfn) parser for .doc binary format
 *
 * Reference: [MS-DOC] 2.9.267 – SttbfFfn
 *
 * The SttbfFfn is an STTB (String Table) containing FFN (Font Family Name) entries.
 * Each entry describes a font used in the document.
 *
 * STTB structure: fExtend(2B) + cData(2B) + cbExtra(2B) + entries[]
 * Each entry: cchData(2B) + FFN data
 *
 * FFN structure starts with cbFfnM1(1B) = total FFN size - 1
 * Font name is extracted from the FFN data as UTF-16LE after fixed header bytes.
 */

/** Parsed font entry. */
export type FontEntry = {
  readonly index: number;
  readonly name: string;
};

/** Parse the SttbfFfn (font table) from the table stream. */
export function parseFontTable(tableStream: Uint8Array, fc: number, lcb: number): readonly FontEntry[] {
  if (lcb === 0) return [];

  if (fc + lcb > tableStream.length) {
    throw new Error(`Font table extends beyond table stream: ${fc} + ${lcb} > ${tableStream.length}`);
  }

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);

  // STTB header
  const fExtend = view.getUint16(fc, true);
  if (fExtend !== 0xffff) {
    // Non-extended STTB: 8-bit strings (very old format). Skip.
    return [];
  }

  const cData = view.getUint16(fc + 2, true);
  const cbExtra = view.getUint16(fc + 4, true);

  const fonts: FontEntry[] = [];
  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 6;

  for (let i = 0; i < cData; i++) {
    if (offset + 2 > fc + lcb) break;

    // Each entry starts with cbData (2B, in bytes = data length including FFN)
    const cbData = view.getUint16(offset, true);
    offset += 2;

    if (cbData === 0 || offset + cbData > fc + lcb) {
      offset += cbData + cbExtra;
      continue;
    }

    // FFN starts at current offset
    // cbFfnM1 (1B): total size of FFN structure minus 1
    // prq+fTrueType+ff (1B): font flags
    // wWeight (2B): font weight
    // chs (1B): charset
    // ixchSzAlt (1B): alt name offset
    // panose (10B): PANOSE classification
    // fs (24B): font signature (in some versions) or fewer bytes
    // Total fixed header = 1 + 1 + 2 + 1 + 1 + 10 = 16B minimum before font name
    // But the actual layout depends on cbFfnM1 and embedded name.
    //
    // The font name starts at offset 40 within FFN for full structures,
    // but simpler approach: FFN name is a null-terminated UTF-16LE string
    // at a known offset after the fixed part.
    //
    // Practical approach: scan for the font name in the FFN data.
    // The font name starts after the PANOSE and font signature bytes.
    // For Word97+, the name starts at byte 40 within FFN.

    const ffnData = tableStream.subarray(offset, offset + cbData);
    const name = extractFontName(ffnData);
    if (name) {
      fonts.push({ index: i, name });
    }

    offset += cbData + cbExtra;
  }

  return fonts;
}

/**
 * Extract the font name from FFN data.
 *
 * The FFN data layout (after cbFfnM1):
 *   byte 0: cbFfnM1
 *   byte 1: flags (prq, fTrueType, ff)
 *   bytes 2-3: wWeight
 *   byte 4: chs (charset)
 *   byte 5: ixchSzAlt
 *   bytes 6-15: panose[10]
 *   bytes 16-39: fs (font signature, 24 bytes)
 *   bytes 40+: xszFfn (font name, null-terminated UTF-16LE)
 *
 * For shorter FFN entries (older formats), the name may start earlier.
 */
function extractFontName(ffnData: Uint8Array): string | undefined {
  if (ffnData.length < 2) return undefined;

  // Try standard offset (40 bytes into FFN, which is 39 after cbFfnM1)
  const nameOffset = 40;

  if (ffnData.length > nameOffset) {
    const name = readUtf16NullTerminated(ffnData, nameOffset);
    if (name) return name;
  }

  // Fallback: try offset 6+10=16 (minimal FFN: after panose, no font signature)
  const minNameOffset = 16;
  if (ffnData.length > minNameOffset) {
    const name = readUtf16NullTerminated(ffnData, minNameOffset);
    if (name) return name;
  }

  return undefined;
}

/** Read a null-terminated UTF-16LE string from a buffer. */
function readUtf16NullTerminated(data: Uint8Array, offset: number): string | undefined {
  const chars: number[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  for (let i = offset; i + 1 < data.length; i += 2) {
    const ch = view.getUint16(i, true);
    if (ch === 0) break;
    chars.push(ch);
  }

  if (chars.length === 0) return undefined;
  return String.fromCharCode(...chars);
}

/** Build a font index → name lookup from parsed font entries. */
export function buildFontLookup(fonts: readonly FontEntry[]): ReadonlyMap<number, string> {
  const map = new Map<number, string>();
  for (const font of fonts) {
    map.set(font.index, font.name);
  }
  return map;
}
