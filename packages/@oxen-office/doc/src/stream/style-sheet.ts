/**
 * @file Style sheet (STSH) parser
 *
 * Reference: [MS-DOC] 2.9.271
 *
 * Structure: STSHI header + STD[] array
 * STSHI: cbStshi(2B) + header bytes
 * Each STD: cbStd(2B) + STD body
 *
 * UPX (UniPe property exception) parsing:
 *   After the style name in each STD, there are `cupx` UPX entries.
 *   Each UPX: cbUpx(2B) + data(cbUpx B) + padding(to even boundary)
 *   For paragraph styles (sgc=1): UPX[0]=PAPX (istd(2B)+grpprl), UPX[1]=CHPX (grpprl)
 *   For character styles (sgc=2): UPX[0]=CHPX (grpprl)
 */

import type { DocStyle, DocStyleType } from "../domain/types";
import type { Sprm } from "../sprm/sprm-decoder";
import { parseGrpprl } from "../sprm/sprm-decoder";

/** UPX-decoded SPRM arrays for a single style. */
export type StyleUpxEntry = {
  readonly paragraphSprms: readonly Sprm[];
  readonly characterSprms: readonly Sprm[];
};

/** Parsed style sheet: styles + UPX SPRM data. */
export type StyleSheetData = {
  readonly styles: readonly DocStyle[];
  readonly upxMap: ReadonlyMap<number, StyleUpxEntry>;
};

/** Parse the STSH (style sheet) from the table stream. */
export function parseStyleSheet(tableStream: Uint8Array, fc: number, lcb: number): StyleSheetData {
  const emptyResult: StyleSheetData = { styles: [], upxMap: new Map() };
  if (lcb === 0) return emptyResult;
  if (fc + lcb > tableStream.length) return emptyResult;

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);

  // STSHI header size
  const cbStshi = view.getUint16(fc, true);
  if (cbStshi < 4) return emptyResult;

  // STSHI header fields
  const cstd = view.getUint16(fc + 2, true);
  const cbSTDBaseInFile = view.getUint16(fc + 4, true);

  // eslint-disable-next-line no-restricted-syntax -- sequential read
  let offset = fc + 2 + cbStshi; // skip header (cbStshi includes its own content)

  const styles: DocStyle[] = [];
  const upxMap = new Map<number, StyleUpxEntry>();

  for (let i = 0; i < cstd; i++) {
    if (offset + 2 > fc + lcb) break;

    const cbStd = view.getUint16(offset, true);
    offset += 2;

    if (cbStd === 0) {
      // Empty style slot
      styles.push({ index: i, type: "paragraph", name: undefined });
      continue;
    }

    if (offset + cbStd > fc + lcb) break;

    const { style, upx } = parseStd(tableStream, offset, cbStd, cbSTDBaseInFile, i);
    styles.push(style);
    if (upx) {
      upxMap.set(i, upx);
    }

    offset += cbStd;
  }

  return { styles, upxMap };
}

function sgcToType(sgc: number): DocStyleType {
  switch (sgc) {
    case 1:
      return "paragraph";
    case 2:
      return "character";
    case 3:
      return "table";
    case 4:
      return "list";
    default:
      return "paragraph";
  }
}

function parseStd(
  data: Uint8Array,
  offset: number,
  cbStd: number,
  cbSTDBaseInFile: number,
  index: number,
): { style: DocStyle; upx?: StyleUpxEntry } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const stdEnd = offset + cbStd;

  if (cbStd < 4) {
    return { style: { index, type: "paragraph" } };
  }

  // STD word 0: sti(12bit) + flags(4bit)
  const word0 = view.getUint16(offset, true);
  const _sti = word0 & 0x0fff;

  // STD word 1: sgc(4bit) + istdBase(12bit)
  const word1 = view.getUint16(offset + 2, true);
  const sgc = word1 & 0x000f;
  const istdBase = (word1 >> 4) & 0x0fff;

  // STD word 2: cupx(4bit) + istdNext(12bit)
  let istdNext: number | undefined;
  let cupx = 0;
  if (cbStd >= 6) {
    const word2 = view.getUint16(offset + 4, true);
    cupx = word2 & 0x000f;
    istdNext = (word2 >> 4) & 0x0fff;
  }

  // Style name: after cbSTDBaseInFile bytes from the STD start
  let name: string | undefined;
  let cch = 0;
  const nameOffset = offset + cbSTDBaseInFile;
  if (nameOffset + 2 <= stdEnd) {
    // xstzName: cch(2B) + UTF-16LE string + null(2B)
    cch = view.getUint16(nameOffset, true);
    if (cch > 0 && nameOffset + 2 + cch * 2 <= stdEnd) {
      const nameBytes = data.subarray(nameOffset + 2, nameOffset + 2 + cch * 2);
      name = new TextDecoder("utf-16le").decode(nameBytes);
    }
  }

  const style: DocStyle = {
    index,
    type: sgcToType(sgc),
    basedOn: istdBase !== 0x0fff ? istdBase : undefined,
    next: istdNext !== undefined && istdNext !== 0x0fff ? istdNext : undefined,
    name,
  };

  // Parse UPX array after name
  // xstzName = cch(2B) + chars(cch*2B) + null(2B)
  const nameDataSize = nameOffset + 2 <= stdEnd ? 2 + cch * 2 + 2 : 0;
  const upxStart = nameOffset + nameDataSize;
  const upx = cupx > 0 && upxStart < stdEnd
    ? parseUpxArray(data, upxStart, stdEnd, cupx, sgc)
    : undefined;

  return { style, upx };
}

/** Parse UPX array from STD body. */
function parseUpxArray(
  data: Uint8Array,
  start: number,
  end: number,
  cupx: number,
  sgc: number,
): StyleUpxEntry | undefined {
  let paragraphSprms: readonly Sprm[] = [];
  let characterSprms: readonly Sprm[] = [];

  // eslint-disable-next-line no-restricted-syntax -- sequential UPX read
  let pos = start;

  for (let u = 0; u < cupx; u++) {
    if (pos + 2 > end) break;

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const cbUpx = view.getUint16(pos, true);
    pos += 2;

    if (cbUpx === 0 || pos + cbUpx > end) {
      pos += cbUpx;
      // Align to even boundary
      if (cbUpx % 2 !== 0) pos++;
      continue;
    }

    if (sgc === 1) {
      // Paragraph style: UPX[0]=PAPX, UPX[1]=CHPX
      if (u === 0 && cbUpx >= 2) {
        // PAPX: istd(2B) + grpprl
        const grpprlData = data.subarray(pos + 2, pos + cbUpx);
        if (grpprlData.length > 0) {
          paragraphSprms = parseGrpprl(grpprlData);
        }
      } else if (u === 1) {
        // CHPX: grpprl
        const grpprlData = data.subarray(pos, pos + cbUpx);
        if (grpprlData.length > 0) {
          characterSprms = parseGrpprl(grpprlData);
        }
      }
    } else if (sgc === 2) {
      // Character style: UPX[0]=CHPX
      if (u === 0) {
        const grpprlData = data.subarray(pos, pos + cbUpx);
        if (grpprlData.length > 0) {
          characterSprms = parseGrpprl(grpprlData);
        }
      }
    }

    pos += cbUpx;
    // Align to even boundary
    if (cbUpx % 2 !== 0) pos++;
  }

  if (paragraphSprms.length === 0 && characterSprms.length === 0) {
    return undefined;
  }

  return { paragraphSprms, characterSprms };
}
