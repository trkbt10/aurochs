/**
 * @file BIFF DEFCOLWIDTH record parser
 */

export type DefcolwidthRecord = {
  /** Default width (in characters) for columns not explicitly sized */
  readonly defaultCharWidth: number;
};

/** Parse a BIFF DEFCOLWIDTH (0x0055) record payload. */
export function parseDefcolwidthRecord(data: Uint8Array): DefcolwidthRecord {
  if (data.length !== 2) {
    throw new Error(`Invalid DEFCOLWIDTH payload length: ${data.length} (expected 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { defaultCharWidth: view.getUint16(0, true) };
}
