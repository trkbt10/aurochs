/**
 * @file BIFF ROW record parser
 */

export type RowRecord = {
  readonly row: number;
  readonly firstCol: number;
  /** Last defined column + 1 (exclusive) */
  readonly lastColExclusive: number;
  /** Row height in 1/20th of a point (twips), low 15 bits of miyRw */
  readonly heightTwips: number;
  /** Whether the row uses standard height (miyRw has 0x8000 bit set) */
  readonly isStandardHeight: boolean;
  readonly outlineLevel: number;
  readonly isCollapsed: boolean;
  /** True when row is hidden via 0 height flag (fDyZero) */
  readonly isHeightZero: boolean;
  readonly isUnsynced: boolean;
  readonly hasDefaultFormat: boolean;
  /** Row default XF index (only valid when hasDefaultFormat=true). Low 12 bits only. */
  readonly xfIndex?: number;
};

/** Parse a BIFF ROW (0x0208) record payload. */
export function parseRowRecord(data: Uint8Array): RowRecord {
  if (data.length !== 16) {
    throw new Error(`Invalid ROW payload length: ${data.length} (expected 16)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const row = view.getUint16(0, true);
  const colMic = view.getUint16(2, true);
  const colMac = view.getUint16(4, true);
  const miyRw = view.getUint16(6, true);
  const grbit = view.getUint16(12, true);
  const ixfeRaw = view.getUint16(14, true);

  const outlineLevel = grbit & 0x0007;
  const isCollapsed = (grbit & 0x0010) !== 0;
  const isHeightZero = (grbit & 0x0020) !== 0;
  const isUnsynced = (grbit & 0x0040) !== 0;
  const hasDefaultFormat = (grbit & 0x0080) !== 0;

  const isStandardHeight = (miyRw & 0x8000) !== 0;
  const heightTwips = miyRw & 0x7fff;

  return {
    row,
    firstCol: colMic,
    lastColExclusive: colMac,
    heightTwips,
    isStandardHeight,
    outlineLevel,
    isCollapsed,
    isHeightZero,
    isUnsynced,
    hasDefaultFormat,
    ...(hasDefaultFormat ? { xfIndex: ixfeRaw & 0x0fff } : {}),
  };
}
