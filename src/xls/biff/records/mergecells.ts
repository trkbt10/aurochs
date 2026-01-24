/**
 * @file BIFF MERGECELLS record parser
 */

export type MergeCellRef = {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstCol: number;
  readonly lastCol: number;
};

export type MergeCellsRecord = {
  readonly refs: readonly MergeCellRef[];
};

export function parseMergeCellsRecord(data: Uint8Array): MergeCellsRecord {
  if (data.length < 2) {
    throw new Error(`Invalid MERGECELLS payload length: ${data.length} (expected >= 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint16(0, true);
  const expectedLength = 2 + count * 8;
  if (data.length !== expectedLength) {
    throw new Error(`Invalid MERGECELLS payload length: ${data.length} (expected ${expectedLength})`);
  }

  const refs = Array.from({ length: count }, (_unused, i): MergeCellRef => {
    void _unused;
    const base = 2 + i * 8;
    return {
      firstRow: view.getUint16(base, true),
      lastRow: view.getUint16(base + 2, true),
      firstCol: view.getUint16(base + 4, true),
      lastCol: view.getUint16(base + 6, true),
    };
  });

  return { refs };
}

