/**
 * @file Table property (TAP) extractor
 *
 * Extracts table row/cell properties from TAP SPRMs in row-end (TTP) paragraph PAPX.
 *
 * TAP SPRMs are embedded in the same grpprl as PAP SPRMs but have sgc=5 (table).
 * They define column widths, row height, header rows, cell merge/align, borders, shading.
 */

import type { DocTableBorders } from "../domain/types";
import type { Sprm } from "../sprm/sprm-decoder";
import { SPRM_TAP, sprmUint8, sprmUint16, sprmInt16 } from "../sprm/sprm-decoder";
import { parseBrc80, colorrefToHex } from "./border-utils";

/** Extracted table row/cell properties from TAP SPRMs. */
export type TapProps = {
  readonly rowHeight?: number;
  readonly isHeader?: boolean;
  readonly cellWidths?: readonly number[];
  readonly verticalMerge?: ReadonlyArray<"restart" | "continue" | undefined>;
  readonly verticalAlign?: ReadonlyArray<"top" | "center" | "bottom" | undefined>;
  readonly horizontalMerge?: ReadonlyArray<"restart" | "continue" | undefined>;
  readonly alignment?: "left" | "center" | "right";
  readonly borders?: DocTableBorders;
  readonly cellShading?: readonly (string | undefined)[];
};

function parseTDefTable(sprm: Sprm): readonly number[] | undefined {
  // sprmTDefTable (0xD608) operand:
  //   cb(2B) — total byte count (already consumed by SPRM decoder for variable-length)
  //   itcMac(1B) — number of cells
  //   rgdxaCenter[itcMac+1] — int16 array of cell boundary x-positions
  //   rgtc[itcMac] — TC structure array (20B each, cell properties)
  const data = sprm.operand;
  if (data.length < 3) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // For variable-length SPRMs (spra=6), the operand includes the size prefix
  const _cb = view.getUint16(0, true);
  const itcMac = data[2];

  if (itcMac === 0 || itcMac > 64) return undefined;

  // rgdxaCenter: (itcMac + 1) × int16 values
  const cellWidths: number[] = [];
  const centerOffset = 3;

  if (centerOffset + (itcMac + 1) * 2 > data.length) return undefined;

  const centers: number[] = [];
  for (let i = 0; i <= itcMac; i++) {
    centers.push(view.getInt16(centerOffset + i * 2, true));
  }

  // Cell widths = difference between consecutive centers
  for (let i = 0; i < itcMac; i++) {
    cellWidths.push(centers[i + 1] - centers[i]);
  }

  return cellWidths;
}

function tapJcToAlignment(jc: number): "left" | "center" | "right" | undefined {
  switch (jc) {
    case 0:
      return "left";
    case 1:
      return "center";
    case 2:
      return "right";
    default:
      return undefined;
  }
}

// --- TVertAlign (0xD62C) ---

function parseTVertAlign(sprm: Sprm): ReadonlyArray<"top" | "center" | "bottom" | undefined> | undefined {
  // spra=6 with 1-byte size prefix: operand = cb(1B) + data(cb bytes)
  // data = array of vertAlign values, one per cell: 0=top, 1=center, 2=bottom
  const data = sprm.operand;
  if (data.length < 2) return undefined;

  const cb = data[0];
  if (cb === 0) return undefined;

  const result: Array<"top" | "center" | "bottom" | undefined> = [];
  for (let i = 1; i < 1 + cb && i < data.length; i++) {
    const val = data[i];
    switch (val) {
      case 0:
        result.push("top");
        break;
      case 1:
        result.push("center");
        break;
      case 2:
        result.push("bottom");
        break;
      default:
        result.push(undefined);
    }
  }

  return result.length > 0 ? result : undefined;
}

// --- TVertMerge (0xD62B) ---

function parseTVertMerge(
  sprm: Sprm,
  existing: ReadonlyArray<"restart" | "continue" | undefined> | undefined,
): ReadonlyArray<"restart" | "continue" | undefined> {
  // Variable-length with 1-byte size prefix: cb(1B) + itc(1B) + vertMergeFlags(1B)
  // Sets vertical merge for a single cell at index itc
  // flags: 0=none, 1=continue, 3=restart
  const data = sprm.operand;
  if (data.length < 3) return existing ?? [];

  const _cb = data[0];
  const itc = data[1];
  const flags = data[2];

  const result: Array<"restart" | "continue" | undefined> = existing ? [...existing] : [];

  // Extend array if needed
  while (result.length <= itc) {
    result.push(undefined);
  }

  if (flags === 3) {
    result[itc] = "restart";
  } else if (flags === 1) {
    result[itc] = "continue";
  } else {
    result[itc] = undefined;
  }

  return result;
}

// --- TMerge (0x5624) ---

function parseTMerge(
  sprm: Sprm,
  existing: ReadonlyArray<"restart" | "continue" | undefined> | undefined,
): ReadonlyArray<"restart" | "continue" | undefined> {
  // 2B operand: itcFirst(1B) + itcLim(1B)
  // Merges cells [itcFirst, itcLim)
  const data = sprm.operand;
  if (data.length < 2) return existing ?? [];

  const itcFirst = data[0];
  const itcLim = data[1];

  if (itcFirst >= itcLim) return existing ?? [];

  const result: Array<"restart" | "continue" | undefined> = existing ? [...existing] : [];

  // Extend array if needed
  while (result.length < itcLim) {
    result.push(undefined);
  }

  result[itcFirst] = "restart";
  for (let i = itcFirst + 1; i < itcLim; i++) {
    result[i] = "continue";
  }

  return result;
}

// --- TTableBorders (0xD613) ---

function parseTTableBorders(sprm: Sprm): DocTableBorders | undefined {
  // Variable-length with 1-byte size prefix: cb(1B) + 6 × BRC80 (4B each) = 24B data
  // Order: top, left, bottom, right, insideH, insideV
  const data = sprm.operand;
  if (data.length < 1 + 24) return undefined;

  const top = parseBrc80(data, 1);
  const left = parseBrc80(data, 5);
  const bottom = parseBrc80(data, 9);
  const right = parseBrc80(data, 13);
  const insideH = parseBrc80(data, 17);
  const insideV = parseBrc80(data, 21);

  const result: DocTableBorders = {
    ...(top ? { top } : {}),
    ...(left ? { left } : {}),
    ...(bottom ? { bottom } : {}),
    ...(right ? { right } : {}),
    ...(insideH ? { insideH } : {}),
    ...(insideV ? { insideV } : {}),
  };

  return Object.keys(result).length > 0 ? result : undefined;
}

// --- TDefTableShd (0xD612) ---

function parseTDefTableShd(sprm: Sprm): readonly (string | undefined)[] | undefined {
  // Variable-length with 1-byte size prefix: cb(1B) + SHD[] (each 10B: cvFore(4B) + cvBack(4B) + ipat(2B))
  const data = sprm.operand;
  if (data.length < 1) return undefined;

  const cb = data[0];
  if (cb < 10) return undefined;

  const count = Math.floor(cb / 10);
  const result: Array<string | undefined> = [];

  for (let i = 0; i < count; i++) {
    const shdOffset = 1 + i * 10;
    // cvBack is at offset +4 within SHD
    const cvBack = colorrefToHex(data, shdOffset + 4);
    result.push(cvBack);
  }

  return result.length > 0 ? result : undefined;
}

// --- Main extractor ---

/** Extract table properties from SPRMs (TAP SPRMs in a row-end PAPX grpprl). */
export function extractTapProps(sprms: readonly Sprm[]): TapProps {
  let rowHeight: number | undefined;
  let isHeader: boolean | undefined;
  let cellWidths: readonly number[] | undefined;
  let alignment: "left" | "center" | "right" | undefined;
  let verticalAlign: ReadonlyArray<"top" | "center" | "bottom" | undefined> | undefined;
  let verticalMerge: ReadonlyArray<"restart" | "continue" | undefined> | undefined;
  let horizontalMerge: ReadonlyArray<"restart" | "continue" | undefined> | undefined;
  let borders: DocTableBorders | undefined;
  let cellShading: readonly (string | undefined)[] | undefined;

  for (const sprm of sprms) {
    switch (sprm.opcode.raw) {
      case SPRM_TAP.TDyaRowHeight:
        rowHeight = sprmInt16(sprm);
        break;
      case SPRM_TAP.TTableHeader:
        isHeader = sprmUint8(sprm) !== 0;
        break;
      case SPRM_TAP.TDefTable:
        cellWidths = parseTDefTable(sprm);
        break;
      case SPRM_TAP.TJc:
        alignment = tapJcToAlignment(sprmUint16(sprm));
        break;
      case SPRM_TAP.TVertAlign:
        verticalAlign = parseTVertAlign(sprm);
        break;
      case SPRM_TAP.TVertMerge:
        verticalMerge = parseTVertMerge(sprm, verticalMerge);
        break;
      case SPRM_TAP.TMerge:
        horizontalMerge = parseTMerge(sprm, horizontalMerge);
        break;
      case SPRM_TAP.TTableBorders:
        borders = parseTTableBorders(sprm);
        break;
      case SPRM_TAP.TDefTableShd:
        cellShading = parseTDefTableShd(sprm);
        break;
    }
  }

  return {
    ...(rowHeight !== undefined ? { rowHeight } : {}),
    ...(isHeader !== undefined ? { isHeader } : {}),
    ...(cellWidths !== undefined ? { cellWidths } : {}),
    ...(alignment !== undefined ? { alignment } : {}),
    ...(verticalAlign !== undefined ? { verticalAlign } : {}),
    ...(verticalMerge !== undefined ? { verticalMerge } : {}),
    ...(horizontalMerge !== undefined ? { horizontalMerge } : {}),
    ...(borders !== undefined ? { borders } : {}),
    ...(cellShading !== undefined ? { cellShading } : {}),
  };
}
