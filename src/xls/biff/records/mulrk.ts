/**
 * @file BIFF MULRK record parser
 */

import { decodeRkNumber } from "./rk";

export type MulrkCell = {
  readonly xfIndex: number;
  readonly value: number;
};

export type MulrkRecord = {
  readonly row: number;
  readonly colFirst: number;
  readonly colLast: number;
  readonly cells: readonly MulrkCell[];
};

export function parseMulrkRecord(data: Uint8Array): MulrkRecord {
  // Minimum: row(2) + colFirst(2) + 1 rkrec(6) + colLast(2) = 12
  if (data.length < 12) {
    throw new Error(`Invalid MULRK payload length: ${data.length} (expected >= 12)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const row = view.getUint16(0, true);
  const colFirst = view.getUint16(2, true);
  const colLast = view.getUint16(data.length - 2, true);
  if (colLast < colFirst) {
    throw new Error(`Invalid MULRK column range: ${colFirst}..${colLast}`);
  }

  const count = colLast - colFirst + 1;
  const expectedLength = 2 + 2 + count * 6 + 2;
  if (data.length !== expectedLength) {
    throw new Error(`Invalid MULRK payload length: ${data.length} (expected ${expectedLength})`);
  }

  const cells = Array.from({ length: count }, (_unused, i): MulrkCell => {
    void _unused;
    const base = 4 + i * 6;
    const xfIndex = view.getUint16(base, true);
    const rk = view.getUint32(base + 2, true);
    return { xfIndex, value: decodeRkNumber(rk) };
  });

  return { row, colFirst, colLast, cells };
}

