/**
 * @file BIFF COLINFO record parser
 */

export type ColinfoRecord = {
  readonly colFirst: number;
  readonly colLast: number;
  /** Column width in 1/256 character units */
  readonly width256: number;
  readonly xfIndex: number;
  readonly isHidden: boolean;
  readonly outlineLevel: number;
  readonly isCollapsed: boolean;
};

/** Parse a BIFF COLINFO (0x007D) record payload. */
export function parseColinfoRecord(data: Uint8Array): ColinfoRecord {
  if (data.length < 10) {
    throw new Error(`Invalid COLINFO payload length: ${data.length} (expected >= 10)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const colFirst = view.getUint16(0, true);
  const colLast = view.getUint16(2, true);
  const coldx = view.getUint16(4, true);
  const ixfe = view.getUint16(6, true);
  const grbit = view.getUint16(8, true);
  // Some XLS writers set reserved to non-zero; ignore for interoperability.

  return {
    colFirst,
    colLast,
    width256: coldx,
    xfIndex: ixfe,
    isHidden: (grbit & 0x0001) !== 0,
    outlineLevel: (grbit >> 8) & 0x0007,
    isCollapsed: ((grbit >> 8) & 0x0010) !== 0,
  };
}
