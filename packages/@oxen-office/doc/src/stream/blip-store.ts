/**
 * @file BLIP store parser for extracting embedded images from OfficeArt DggInfo
 *
 * DggInfo structure in the table stream:
 *   OfficeArtDggContainer (RT=0xF000) → contains:
 *     OfficeArtBStoreContainer (RT=0xF001) → contains:
 *       OfficeArtBStoreEntry (RT=0xF007) × N → each contains a BLIP record
 *
 * @see [MS-ODRAW] 2.2.21 (OfficeArtBStoreContainerFileBlock)
 */

import {
  readOfficeArtRecord,
  iterateOfficeArtRecords,
  isContainerRecord,
  findChildRecord,
  isBlipType,
  OA_RT,
  OFFICEART_HEADER_SIZE,
} from "./officeart-reader";

/** An extracted BLIP (image) entry from the BStoreContainer. */
export type BlipEntry = {
  /** 1-based index within the BStoreContainer. Used as blipId reference. */
  readonly index: number;
  /** MIME content type (e.g. "image/jpeg", "image/png"). */
  readonly contentType: string;
  /** Raw image data bytes. */
  readonly data: Uint8Array;
};

/**
 * BLIP record type → content type and header sizes.
 * Header sizes differ based on whether 1 or 2 UID hashes are present.
 * - Bitmap formats (JPEG/PNG/DIB/TIFF): 1 UID = 17B, 2 UIDs = 33B
 * - Metafile formats (EMF/WMF/PICT): 1 UID = 50B, 2 UIDs = 66B
 */
const BLIP_INFO: Readonly<Record<number, { contentType: string; headerSize1: number; headerSize2: number }>> = {
  [OA_RT.BlipJPEG1]: { contentType: "image/jpeg", headerSize1: 17, headerSize2: 33 },
  [OA_RT.BlipJPEG2]: { contentType: "image/jpeg", headerSize1: 17, headerSize2: 33 },
  [OA_RT.BlipPNG]: { contentType: "image/png", headerSize1: 17, headerSize2: 33 },
  [OA_RT.BlipDIB]: { contentType: "image/bmp", headerSize1: 17, headerSize2: 33 },
  [OA_RT.BlipEMF]: { contentType: "image/x-emf", headerSize1: 50, headerSize2: 66 },
  [OA_RT.BlipWMF]: { contentType: "image/x-wmf", headerSize1: 50, headerSize2: 66 },
  [OA_RT.BlipTIFF]: { contentType: "image/tiff", headerSize1: 17, headerSize2: 33 },
  [OA_RT.BlipPICT]: { contentType: "image/pict", headerSize1: 50, headerSize2: 66 },
};

/**
 * Parse a BLIP record and extract image data.
 * Returns undefined if the record type is not a recognized BLIP.
 */
export function parseBlipData(
  recType: number,
  recInstance: number,
  data: Uint8Array,
): { contentType: string; data: Uint8Array } | undefined {
  const info = BLIP_INFO[recType];
  if (!info) return undefined;

  // recInstance bit 0 determines UID count: odd = 2 UIDs, even = 1 UID
  const headerSize = (recInstance & 0x01) ? info.headerSize2 : info.headerSize1;
  const dataStart = Math.min(headerSize, data.length);

  return {
    contentType: info.contentType,
    data: data.subarray(dataStart),
  };
}

/** Size of OfficeArtFBSE (BStoreEntry) header before the embedded BLIP. */
const FBSE_HEADER_SIZE = 44;

/**
 * Parse BStoreContainer from the OfficeArt DggInfo in the table stream.
 *
 * @param tableStream - Table stream bytes
 * @param fcDggInfo - Offset to DggInfo in the table stream
 * @param lcbDggInfo - Size of DggInfo in bytes
 * @returns Array of BLIP entries (1-based indexed)
 */
export function parseBStoreContainer(
  tableStream: Uint8Array,
  fcDggInfo: number,
  lcbDggInfo: number,
): readonly BlipEntry[] {
  if (lcbDggInfo === 0) return [];

  // Read the DggContainer record
  const dggContainer = readOfficeArtRecord(tableStream, fcDggInfo);
  if (!dggContainer || dggContainer.recType !== OA_RT.DggContainer) return [];
  if (!isContainerRecord(dggContainer)) return [];

  // Find BStoreContainer within DggContainer
  const bStoreContainer = findChildRecord(dggContainer, OA_RT.BStoreContainer);
  if (!bStoreContainer) return [];

  // Iterate BStoreEntry records
  const entries = iterateOfficeArtRecords(bStoreContainer.data, 0, bStoreContainer.data.length);
  const blips: BlipEntry[] = [];
  let index = 1; // 1-based

  for (const entry of entries) {
    if (entry.recType !== OA_RT.BStoreEntry) continue;

    // BStoreEntry: 44-byte FBSE header + embedded BLIP record
    const blipEntry = extractBlipFromBStoreEntry(entry.data, entry.recInstance);
    if (blipEntry) {
      blips.push({ index, ...blipEntry });
    }
    index++;
  }

  return blips;
}

/**
 * Extract BLIP image data from a BStoreEntry's data.
 * The BStoreEntry contains a 44-byte FBSE header followed by the BLIP record.
 */
function extractBlipFromBStoreEntry(
  data: Uint8Array,
  _entryInstance: number,
): { contentType: string; data: Uint8Array } | undefined {
  if (data.length <= FBSE_HEADER_SIZE) return undefined;

  // Read the embedded BLIP record after the FBSE header
  const blipRecord = readOfficeArtRecord(data, FBSE_HEADER_SIZE);
  if (!blipRecord) return undefined;

  if (!isBlipType(blipRecord.recType)) return undefined;

  return parseBlipData(blipRecord.recType, blipRecord.recInstance, blipRecord.data);
}
