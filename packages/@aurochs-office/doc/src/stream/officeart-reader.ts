/**
 * @file OfficeArt record reader for [MS-ODRAW] binary format
 *
 * OfficeArt records share the same 8-byte header format used by PPT and DOC:
 *   verAndInstance (2B LE) + recType (2B LE) + recLen (4B LE)
 *
 * This is a lightweight reader without PPT package dependencies.
 */

/** Record header size in bytes. */
export const OFFICEART_HEADER_SIZE = 8;

/** An OfficeArt record parsed from binary data. */
export type OfficeArtRecord = {
  /** Record version (4 bits). 0x0F = container record. */
  readonly recVer: number;
  /** Record instance (12 bits). Usage depends on recType. */
  readonly recInstance: number;
  /** Record type identifier. */
  readonly recType: number;
  /** Total size of record data (excluding the 8-byte header). */
  readonly recLen: number;
  /** Record data (subarray of the source buffer). */
  readonly data: Uint8Array;
};

/** Well-known OfficeArt record type constants. */
export const OA_RT = {
  DggContainer: 0xf000,
  BStoreContainer: 0xf001,
  DgContainer: 0xf002,
  SpgrContainer: 0xf003,
  SpContainer: 0xf004,
  FDGG: 0xf006,
  BStoreEntry: 0xf007,
  FDG: 0xf008,
  FSPGR: 0xf009,
  FSP: 0xf00a,
  FOPT: 0xf00b,
  ClientTextbox: 0xf00d,
  ChildAnchor: 0xf00f,
  ClientAnchor: 0xf010,
  ClientData: 0xf011,
  SecondaryFOPT: 0xf121,
  TertiaryFOPT: 0xf122,
  // BLIP types
  BlipEMF: 0xf01a,
  BlipWMF: 0xf01b,
  BlipPICT: 0xf01c,
  BlipJPEG1: 0xf01d,
  BlipPNG: 0xf01e,
  BlipDIB: 0xf01f,
  BlipTIFF: 0xf029,
  BlipJPEG2: 0xf02a,
} as const;

/**
 * Read a single OfficeArt record at the given offset.
 * Returns undefined if there isn't enough data for a complete header.
 */
export function readOfficeArtRecord(data: Uint8Array, offset: number): OfficeArtRecord | undefined {
  if (offset + OFFICEART_HEADER_SIZE > data.length) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const verAndInstance = view.getUint16(offset, true);
  const recType = view.getUint16(offset + 2, true);
  const recLen = view.getUint32(offset + 4, true);

  const recVer = verAndInstance & 0x0f;
  const recInstance = (verAndInstance >> 4) & 0x0fff;

  const dataStart = offset + OFFICEART_HEADER_SIZE;
  const dataEnd = Math.min(dataStart + recLen, data.length);
  const recordData = data.subarray(dataStart, dataEnd);

  return { recVer, recInstance, recType, recLen, data: recordData };
}

/**
 * Iterate all OfficeArt records within a byte range [offset, end).
 * Reads records sequentially until end of range or invalid record.
 */
export function iterateOfficeArtRecords(
  data: Uint8Array,
  offset: number,
  end: number,
): readonly OfficeArtRecord[] {
  const records: OfficeArtRecord[] = [];
  const limit = Math.min(end, data.length);
  let pos = offset;

  while (pos + OFFICEART_HEADER_SIZE <= limit) {
    const record = readOfficeArtRecord(data, pos);
    if (!record) break;

    records.push(record);
    pos += OFFICEART_HEADER_SIZE + record.recLen;
  }

  return records;
}

/** Check if an OfficeArt record is a container (has child records). */
export function isContainerRecord(record: OfficeArtRecord): boolean {
  return record.recVer === 0x0f;
}

/** Find the first child record with the given type within a container record. */
export function findChildRecord(container: OfficeArtRecord, recType: number): OfficeArtRecord | undefined {
  if (!isContainerRecord(container)) return undefined;
  const children = iterateOfficeArtRecords(container.data, 0, container.data.length);
  return children.find((r) => r.recType === recType);
}

/** Check if a record type is a BLIP (image) type. */
export function isBlipType(recType: number): boolean {
  return (
    recType === OA_RT.BlipEMF ||
    recType === OA_RT.BlipWMF ||
    recType === OA_RT.BlipPICT ||
    recType === OA_RT.BlipJPEG1 ||
    recType === OA_RT.BlipPNG ||
    recType === OA_RT.BlipDIB ||
    recType === OA_RT.BlipTIFF ||
    recType === OA_RT.BlipJPEG2
  );
}
