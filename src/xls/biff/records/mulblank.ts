/**
 * @file BIFF MULBLANK record parser
 */

export type MulblankRecord = {
  readonly row: number;
  readonly colFirst: number;
  readonly colLast: number;
  readonly xfIndexes: readonly number[];
};

export function parseMulblankRecord(data: Uint8Array): MulblankRecord {
  if (data.length < 8) {
    throw new Error(`Invalid MULBLANK payload length: ${data.length} (expected >= 8)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const row = view.getUint16(0, true);
  const colFirst = view.getUint16(2, true);
  const colLast = view.getUint16(data.length - 2, true);
  if (colLast < colFirst) {
    throw new Error(`Invalid MULBLANK column range: ${colFirst}..${colLast}`);
  }

  const count = colLast - colFirst + 1;
  const expectedLength = 2 + 2 + count * 2 + 2;
  if (data.length !== expectedLength) {
    throw new Error(`Invalid MULBLANK payload length: ${data.length} (expected ${expectedLength})`);
  }

  const xfIndexes = Array.from({ length: count }, (_unused, i) => {
    void _unused;
    return view.getUint16(4 + i * 2, true);
  });

  return { row, colFirst, colLast, xfIndexes };
}

