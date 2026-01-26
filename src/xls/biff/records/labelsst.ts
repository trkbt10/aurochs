/**
 * @file BIFF LABELSST record parser
 */

export type LabelSstRecord = {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly sstIndex: number;
};

/** Parse a BIFF LABELSST (0x00FD) record payload. */
export function parseLabelSstRecord(data: Uint8Array): LabelSstRecord {
  if (data.length !== 10) {
    throw new Error(`Invalid LABELSST payload length: ${data.length} (expected 10)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  return {
    row: view.getUint16(0, true),
    col: view.getUint16(2, true),
    xfIndex: view.getUint16(4, true),
    sstIndex: view.getUint32(6, true),
  };
}
