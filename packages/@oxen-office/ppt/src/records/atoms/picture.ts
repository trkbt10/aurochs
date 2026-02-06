/**
 * @file BLIP (picture data) record parsers
 *
 * PPT stores embedded images in the "Pictures" CFB stream as
 * a sequence of OfficeArt BLIP records.
 *
 * @see [MS-ODRAW] Section 2.2.32 (OfficeArtBlip)
 */

import type { PptRecord } from "../types";
import { RT } from "../record-types";

export type BlipData = {
  readonly contentType: string;
  readonly data: Uint8Array;
};

/** BLIP record types and their content types / header sizes. */
const BLIP_INFO: Record<number, { contentType: string; headerSize1: number; headerSize2: number }> = {
  [RT.OfficeArtBlipJPEG1]: { contentType: "image/jpeg", headerSize1: 17, headerSize2: 33 },
  [RT.OfficeArtBlipJPEG2]: { contentType: "image/jpeg", headerSize1: 17, headerSize2: 33 },
  [RT.OfficeArtBlipPNG]:   { contentType: "image/png",  headerSize1: 17, headerSize2: 33 },
  [RT.OfficeArtBlipDIB]:   { contentType: "image/bmp",  headerSize1: 17, headerSize2: 33 },
  [RT.OfficeArtBlipEMF]:   { contentType: "image/x-emf", headerSize1: 50, headerSize2: 66 },
  [RT.OfficeArtBlipWMF]:   { contentType: "image/x-wmf", headerSize1: 50, headerSize2: 66 },
  [RT.OfficeArtBlipTIFF]:  { contentType: "image/tiff", headerSize1: 17, headerSize2: 33 },
  [RT.OfficeArtBlipPICT]:  { contentType: "image/pict", headerSize1: 50, headerSize2: 66 },
};

/** Check if a record type is a BLIP type. */
export function isBlipRecordType(recType: number): boolean {
  return recType in BLIP_INFO;
}

/**
 * Parse a BLIP record to extract image data.
 *
 * BLIP records have a variable-length header containing hash(es),
 * followed by the raw image data.
 * The recInstance determines whether 1 or 2 hash UIDs are present.
 */
export function parseBlipRecord(record: PptRecord): BlipData {
  const info = BLIP_INFO[record.recType];
  if (!info) {
    throw new Error(`Unknown BLIP record type: 0x${record.recType.toString(16)}`);
  }

  // recInstance determines UID count:
  // For JPEG/PNG/DIB/TIFF: instance 0x46A (1 UID), 0x6E0/0x6E2 (2 UIDs)
  // For EMF/WMF/PICT: instance 0x3D4/0x216/0x542 (1 UID), +1 (2 UIDs)
  // The header size difference is 16 bytes (one additional 16-byte UID)
  const headerSize = (record.recInstance & 0x01)
    ? info.headerSize2
    : info.headerSize1;

  // For metafiles (EMF/WMF/PICT), there's additional compression info
  // but for now we skip the header and take the rest as raw data
  const dataStart = Math.min(headerSize, record.data.byteLength);
  const data = record.data.subarray(dataStart);

  return {
    contentType: info.contentType,
    data,
  };
}
