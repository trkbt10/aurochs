/**
 * @file FKP (Formatted Disk Page) parser for .doc binary format
 *
 * Reference: [MS-DOC] 2.9.35 (ChpxFkp), 2.9.172 (PapxFkp)
 *
 * FKP = 512-byte page in WordDocument stream.
 * Page number × 512 = byte offset in stream.
 *
 * CHP-FKP: rgfc[crun+1] + rgb[crun] (1B offsets) + CHPX data
 * PAP-FKP: rgfc[crun+1] + rgbx[crun] (13B entries: bOffset(1B) + PHE(12B)) + PAPX data
 */

import { parseGrpprl, type Sprm } from "../sprm/sprm-decoder";

/** A character property run from a CHP-FKP page. */
export type ChpxRun = {
  /** Start FC */
  readonly fcStart: number;
  /** End FC */
  readonly fcEnd: number;
  /** Decoded SPRMs (empty if default properties) */
  readonly sprms: readonly Sprm[];
};

/** A paragraph property run from a PAP-FKP page. */
export type PapxRun = {
  /** Start FC */
  readonly fcStart: number;
  /** End FC */
  readonly fcEnd: number;
  /** Style index from PAPX istd field */
  readonly istd: number;
  /** Decoded SPRMs */
  readonly sprms: readonly Sprm[];
};

const FKP_PAGE_SIZE = 512;

/**
 * Parse a CHP-FKP page.
 *
 * Layout:
 *   rgfc[crun+1]  — FC array (4B each)
 *   rgb[crun]     — CHPX offset array (1B each)
 *   crun          — at byte 511
 *
 *   rgb[i] == 0 → default properties (no CHPX)
 *   rgb[i] * 2 → offset within FKP page to CHPX: cb(1B) + grpprl(cb bytes)
 */
export function parseChpFkp(wordDocStream: Uint8Array, pageNumber: number): readonly ChpxRun[] {
  const pageStart = pageNumber * FKP_PAGE_SIZE;
  if (pageStart + FKP_PAGE_SIZE > wordDocStream.length) {
    throw new Error(`CHP-FKP page ${pageNumber} out of bounds (stream length ${wordDocStream.length})`);
  }

  const page = wordDocStream.subarray(pageStart, pageStart + FKP_PAGE_SIZE);
  const view = new DataView(page.buffer, page.byteOffset, page.byteLength);

  const crun = page[511];
  if (crun === 0) return [];

  const runs: ChpxRun[] = [];
  const rgfcOffset = 0;
  const rgbOffset = (crun + 1) * 4;

  for (let i = 0; i < crun; i++) {
    const fcStart = view.getUint32(rgfcOffset + i * 4, true);
    const fcEnd = view.getUint32(rgfcOffset + (i + 1) * 4, true);
    const chpxOffset = page[rgbOffset + i];

    if (chpxOffset === 0) {
      // Default properties
      runs.push({ fcStart, fcEnd, sprms: [] });
      continue;
    }

    const realOffset = chpxOffset * 2;
    if (realOffset >= FKP_PAGE_SIZE) {
      runs.push({ fcStart, fcEnd, sprms: [] });
      continue;
    }

    const cb = page[realOffset];
    if (cb === 0 || realOffset + 1 + cb > FKP_PAGE_SIZE) {
      runs.push({ fcStart, fcEnd, sprms: [] });
      continue;
    }

    const grpprl = page.subarray(realOffset + 1, realOffset + 1 + cb);
    runs.push({ fcStart, fcEnd, sprms: parseGrpprl(grpprl) });
  }

  return runs;
}

/**
 * Parse a PAP-FKP page.
 *
 * Layout:
 *   rgfc[crun+1]  — FC array (4B each)
 *   rgbx[crun]    — BxPap array (13B each: bOffset(1B) + PHE(12B))
 *   crun          — at byte 511
 *
 *   rgbx[i].bOffset * 2 → offset within FKP page to PAPX
 *   PAPX:
 *     cb(1B): if 0, next byte is actual size, grpprl is cb'-1 bytes
 *     cb > 0: istd(2B) + grpprl(cb*2 - 2 bytes)
 */
export function parsePapFkp(wordDocStream: Uint8Array, pageNumber: number): readonly PapxRun[] {
  const pageStart = pageNumber * FKP_PAGE_SIZE;
  if (pageStart + FKP_PAGE_SIZE > wordDocStream.length) {
    throw new Error(`PAP-FKP page ${pageNumber} out of bounds (stream length ${wordDocStream.length})`);
  }

  const page = wordDocStream.subarray(pageStart, pageStart + FKP_PAGE_SIZE);
  const view = new DataView(page.buffer, page.byteOffset, page.byteLength);

  const crun = page[511];
  if (crun === 0) return [];

  const runs: PapxRun[] = [];
  const rgfcOffset = 0;
  const rgbxOffset = (crun + 1) * 4;

  for (let i = 0; i < crun; i++) {
    const fcStart = view.getUint32(rgfcOffset + i * 4, true);
    const fcEnd = view.getUint32(rgfcOffset + (i + 1) * 4, true);
    const bOffset = page[rgbxOffset + i * 13];

    if (bOffset === 0) {
      runs.push({ fcStart, fcEnd, istd: 0, sprms: [] });
      continue;
    }

    const realOffset = bOffset * 2;
    if (realOffset >= FKP_PAGE_SIZE) {
      runs.push({ fcStart, fcEnd, istd: 0, sprms: [] });
      continue;
    }

    const cb = page[realOffset];

    if (cb === 0) {
      // cb==0: next byte is actual size (cb'), PAPX data is cb' bytes
      if (realOffset + 1 >= FKP_PAGE_SIZE) {
        runs.push({ fcStart, fcEnd, istd: 0, sprms: [] });
        continue;
      }
      const cbPrime = page[realOffset + 1];
      if (cbPrime < 2 || realOffset + 2 + cbPrime > FKP_PAGE_SIZE) {
        runs.push({ fcStart, fcEnd, istd: 0, sprms: [] });
        continue;
      }
      const papxView = new DataView(page.buffer, page.byteOffset + realOffset + 2, cbPrime);
      const istd = papxView.getUint16(0, true);
      const grpprlData = cbPrime > 2 ? page.subarray(realOffset + 4, realOffset + 2 + cbPrime) : new Uint8Array(0);
      runs.push({ fcStart, fcEnd, istd, sprms: parseGrpprl(grpprlData) });
    } else {
      // cb > 0: total size is cb*2 bytes starting after cb byte
      const totalSize = cb * 2;
      if (realOffset + 1 + totalSize > FKP_PAGE_SIZE) {
        runs.push({ fcStart, fcEnd, istd: 0, sprms: [] });
        continue;
      }
      const papxView = new DataView(page.buffer, page.byteOffset + realOffset + 1, totalSize);
      const istd = papxView.getUint16(0, true);
      const grpprlSize = totalSize - 2;
      const grpprlData = grpprlSize > 0
        ? page.subarray(realOffset + 3, realOffset + 1 + totalSize)
        : new Uint8Array(0);
      runs.push({ fcStart, fcEnd, istd, sprms: parseGrpprl(grpprlData) });
    }
  }

  return runs;
}
