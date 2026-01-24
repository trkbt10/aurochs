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

export function parseDimensionsRecord(data: Uint8Array): DimensionsRecord {
  if (data.length !== 14) {
    throw new Error(`Invalid DIMENSIONS payload length: ${data.length} (expected 14)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  return {
    firstRow: view.getUint32(0, true),
    lastRowExclusive: view.getUint32(4, true),
    firstCol: view.getUint16(8, true),
    lastColExclusive: view.getUint16(10, true),
  };
}

export function isEmptyDimensionsRecord(record: DimensionsRecord): boolean {
  return (
    record.firstRow === 0 &&
    record.lastRowExclusive === 0 &&
    record.firstCol === 0 &&
    record.lastColExclusive === 0
  );
}

