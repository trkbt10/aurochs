/**
 * @file BIFF RK record parser
 */

export type RkRecord = {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly value: number;
};

function decodeRkFloat(rk: number): number {
  // Upper 30 bits of IEEE754 float64 are stored in bits 31..2.
  // Reconstruct float64 by placing them into the high dword and zeroing the low dword.
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, 0, true);
  view.setUint32(4, rk & 0xfffffffc, true);
  return view.getFloat64(0, true);
}

/** Decode a BIFF RK encoded number into a JavaScript number. */
export function decodeRkNumber(rk: number): number {
  const isDiv100 = (rk & 0x01) !== 0;
  const isInteger = (rk & 0x02) !== 0;

  // 30-bit signed integer stored in bits 31..2 (sign bit is bit 31)
  const value = isInteger ? rk >> 2 : decodeRkFloat(rk);

  return isDiv100 ? value / 100 : value;
}

/** Parse a BIFF RK (0x007E) record payload. */
export function parseRkRecord(data: Uint8Array): RkRecord {
  if (data.length !== 10) {
    throw new Error(`Invalid RK payload length: ${data.length} (expected 10)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const rk = view.getUint32(6, true);
  return {
    row: view.getUint16(0, true),
    col: view.getUint16(2, true),
    xfIndex: view.getUint16(4, true),
    value: decodeRkNumber(rk),
  };
}
