/**
 * @file BIFF DEFAULTROWHEIGHT record parser
 */

export type DefaultrowheightRecord = {
  readonly isUnsynced: boolean;
  readonly isHeightZero: boolean;
  readonly hasExtraSpaceAbove: boolean;
  readonly hasExtraSpaceBelow: boolean;
  /** Default row height in 1/20th of a point (twips) */
  readonly heightTwips: number;
};

/** Parse a BIFF DEFAULTROWHEIGHT (0x0225) record payload. */
export function parseDefaultrowheightRecord(data: Uint8Array): DefaultrowheightRecord {
  if (data.length !== 4) {
    throw new Error(`Invalid DEFAULTROWHEIGHT payload length: ${data.length} (expected 4)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const grbit = view.getUint16(0, true);
  const miyRw = view.getUint16(2, true);

  return {
    isUnsynced: (grbit & 0x0001) !== 0,
    isHeightZero: (grbit & 0x0002) !== 0,
    hasExtraSpaceAbove: (grbit & 0x0004) !== 0,
    hasExtraSpaceBelow: (grbit & 0x0008) !== 0,
    heightTwips: miyRw,
  };
}
