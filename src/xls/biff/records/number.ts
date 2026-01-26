/**
 * @file BIFF NUMBER record parser
 */

export type NumberRecord = {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly value: number;
};

/** Parse a BIFF NUMBER (0x0203) record payload. */
export function parseNumberRecord(data: Uint8Array): NumberRecord {
  if (data.length !== 14) {
    throw new Error(`Invalid NUMBER payload length: ${data.length} (expected 14)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  return {
    row: view.getUint16(0, true),
    col: view.getUint16(2, true),
    xfIndex: view.getUint16(4, true),
    value: view.getFloat64(6, true),
  };
}
