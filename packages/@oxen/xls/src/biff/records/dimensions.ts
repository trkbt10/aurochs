/**
 * @file BIFF DIMENSIONS record parser
 */

export type DimensionsRecord = {
  /** First defined row (0-based) */
  readonly firstRow: number;
  /** Last defined row + 1 (0-based, exclusive) */
  readonly lastRowExclusive: number;
  /** First defined column (0-based) */
  readonly firstCol: number;
  /** Last defined column + 1 (0-based, exclusive) */
  readonly lastColExclusive: number;
};

/** Parse a BIFF DIMENSIONS (0x0200) record payload. */
export function parseDimensionsRecord(data: Uint8Array): DimensionsRecord {
  if (data.length !== 16 && data.length !== 14 && data.length !== 10 && data.length !== 8) {
    throw new Error(`Invalid DIMENSIONS payload length: ${data.length} (expected 8, 10, 14, or 16)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  if (data.length === 14 || data.length === 16) {
    return {
      firstRow: view.getUint32(0, true),
      lastRowExclusive: view.getUint32(4, true),
      firstCol: view.getUint16(8, true),
      lastColExclusive: view.getUint16(10, true),
    };
  }

  // BIFF7 and earlier use 16-bit row indexes.
  return {
    firstRow: view.getUint16(0, true),
    lastRowExclusive: view.getUint16(2, true),
    firstCol: view.getUint16(4, true),
    lastColExclusive: view.getUint16(6, true),
  };
}

/** Return true when DIMENSIONS fields indicate an empty sheet. */
export function isEmptyDimensionsRecord(record: DimensionsRecord): boolean {
  return (
    record.firstRow === 0 &&
    record.lastRowExclusive === 0 &&
    record.firstCol === 0 &&
    record.lastColExclusive === 0
  );
}
