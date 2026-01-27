/**
 * @file BIFF BLANK record parser
 */

export type BlankRecord = {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
};

/** Parse a BIFF BLANK (0x0201) record payload. */
export function parseBlankRecord(data: Uint8Array): BlankRecord {
  if (data.length !== 6) {
    throw new Error(`Invalid BLANK payload length: ${data.length} (expected 6)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  return {
    row: view.getUint16(0, true),
    col: view.getUint16(2, true),
    xfIndex: view.getUint16(4, true),
  };
}
