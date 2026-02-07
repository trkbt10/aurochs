/**
 * @file Picture extractor for inline images in .doc format
 *
 * PIC structure layout (at Data Stream offset):
 *   lcb(4B) + cbHeader(2B) + mfp(6B) + bm(14B) +
 *   dxaGoal(2B) + dyaGoal(2B) + mx(2B) + my(2B) +
 *   dxaCropLeft(2B) + dyaCropTop(2B) + dxaCropRight(2B) + dyaCropBottom(2B) +
 *   brcl(2B) + brcTop(4B) + brcLeft(4B) + brcBottom(4B) + brcRight(4B) +
 *   dxaOrigin(2B) + dyaOrigin(2B)
 *
 * After cbHeader bytes: OfficeArt inline data (BLIP or SpContainer).
 *
 * @see [MS-DOC] 2.9.163 (PICF) and [MS-ODRAW]
 */

import {
  readOfficeArtRecord,
  iterateOfficeArtRecords,
  isBlipType,
  isContainerRecord,
  OA_RT,
} from "../stream/officeart-reader";
import { parseBlipData, type BlipEntry } from "../stream/blip-store";

/** Parsed PIC structure data. */
export type PicData = {
  /** Original width in twips */
  readonly widthTwips: number;
  /** Original height in twips */
  readonly heightTwips: number;
  /** Horizontal scale (0-1000, 1000 = 100%) */
  readonly scaleX: number;
  /** Vertical scale (0-1000, 1000 = 100%) */
  readonly scaleY: number;
  /** Cropping in twips */
  readonly cropLeft: number;
  readonly cropTop: number;
  readonly cropRight: number;
  readonly cropBottom: number;
  /** Embedded image content type */
  readonly contentType: string;
  /** Raw image data */
  readonly imageData: Uint8Array;
};

/** Minimum valid cbHeader for a PICF structure. */
const MIN_CB_HEADER = 0x44; // 68 bytes

/** Twips per EMU. 1 twip = 914.4 EMU */
const TWIPS_TO_EMU = 914.4;

/**
 * Parse PIC structure from the data stream at the given offset.
 *
 * @param dataStream - Data Stream (or WordDocument stream) bytes
 * @param offset - Byte offset where the PIC structure begins
 * @param blipStore - Optional BLIP store for resolving blipId references
 * @returns Parsed PIC data, or undefined if the structure is invalid
 */
export function parsePicStructure(
  dataStream: Uint8Array,
  offset: number,
  blipStore?: readonly BlipEntry[],
): PicData | undefined {
  if (offset + 6 > dataStream.length) return undefined;

  const view = new DataView(dataStream.buffer, dataStream.byteOffset, dataStream.byteLength);

  const lcb = view.getInt32(offset, true);
  if (lcb <= 0) return undefined;

  const cbHeader = view.getUint16(offset + 4, true);
  if (cbHeader < MIN_CB_HEADER) return undefined;

  // PIC header fields (after lcb(4B) + cbHeader(2B) + mfp(6B) + bm(14B))
  const hdrBase = offset + 4 + 2 + 6 + 14; // = offset + 26
  if (hdrBase + 16 > dataStream.length) return undefined;

  const dxaGoal = view.getUint16(hdrBase, true);
  const dyaGoal = view.getUint16(hdrBase + 2, true);
  const mx = view.getUint16(hdrBase + 4, true);
  const my = view.getUint16(hdrBase + 6, true);
  const dxaCropLeft = view.getInt16(hdrBase + 8, true);
  const dyaCropTop = view.getInt16(hdrBase + 10, true);
  const dxaCropRight = view.getInt16(hdrBase + 12, true);
  const dyaCropBottom = view.getInt16(hdrBase + 14, true);

  // OfficeArt data starts after the PIC header
  const oaStart = offset + cbHeader;
  if (oaStart >= dataStream.length) return undefined;

  // Try to read OfficeArt record(s) after the PIC header
  const imageResult = extractImageFromOfficeArt(dataStream, oaStart, offset + lcb, blipStore);
  if (!imageResult) return undefined;

  return {
    widthTwips: dxaGoal,
    heightTwips: dyaGoal,
    scaleX: mx,
    scaleY: my,
    cropLeft: dxaCropLeft,
    cropTop: dyaCropTop,
    cropRight: dxaCropRight,
    cropBottom: dyaCropBottom,
    contentType: imageResult.contentType,
    imageData: imageResult.data,
  };
}

/**
 * Extract image data from OfficeArt records after the PIC header.
 *
 * Two cases:
 * 1. Direct BLIP record → parse directly
 * 2. SpContainer → find FOPT → get blipId → resolve from BStoreContainer
 */
function extractImageFromOfficeArt(
  data: Uint8Array,
  offset: number,
  end: number,
  blipStore?: readonly BlipEntry[],
): { contentType: string; data: Uint8Array } | undefined {
  const record = readOfficeArtRecord(data, offset);
  if (!record) return undefined;

  // Case 1: Direct BLIP record
  if (isBlipType(record.recType)) {
    return parseBlipData(record.recType, record.recInstance, record.data);
  }

  // Case 2: SpContainer containing FOPT with blipId
  if (record.recType === OA_RT.SpContainer && isContainerRecord(record)) {
    return extractImageFromSpContainer(record.data, blipStore);
  }

  // Also check if there are multiple records (some PIC structures have SpContainer + BLIP)
  const records = iterateOfficeArtRecords(data, offset, end);
  for (const rec of records) {
    if (isBlipType(rec.recType)) {
      return parseBlipData(rec.recType, rec.recInstance, rec.data);
    }
  }

  return undefined;
}

/** FOPT property ID for picture BLIP index. */
const FOPT_PID_PIB = 0x0104;

/**
 * Extract image from an SpContainer by reading FOPT properties.
 * Finds the blipId (pib) property and resolves it from the BStoreContainer.
 */
function extractImageFromSpContainer(
  containerData: Uint8Array,
  blipStore?: readonly BlipEntry[],
): { contentType: string; data: Uint8Array } | undefined {
  const children = iterateOfficeArtRecords(containerData, 0, containerData.length);

  for (const child of children) {
    // Check for direct BLIP inside SpContainer
    if (isBlipType(child.recType)) {
      return parseBlipData(child.recType, child.recInstance, child.data);
    }

    // Check FOPT for blipId
    if (child.recType === OA_RT.FOPT && blipStore && blipStore.length > 0) {
      const blipId = extractBlipIdFromFopt(child);
      if (blipId !== undefined && blipId > 0) {
        const entry = blipStore.find((e) => e.index === blipId);
        if (entry) {
          return { contentType: entry.contentType, data: entry.data };
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract blipId (pib) from an FOPT record.
 *
 * FOPT format: recInstance = property count
 * Each property: propId(2B) + value(4B)
 * Complex properties: additional data follows the fixed portion
 * propId bit 14 = fBid (BLIP ID), bit 15 = fComplex
 */
function extractBlipIdFromFopt(foptRecord: { recInstance: number; data: Uint8Array }): number | undefined {
  const propCount = foptRecord.recInstance;
  const data = foptRecord.data;
  if (data.length < propCount * 6) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  for (let i = 0; i < propCount; i++) {
    const offset = i * 6;
    const propId = view.getUint16(offset, true);
    const value = view.getUint32(offset + 2, true);

    // Property ID without flags
    const pid = propId & 0x3fff;
    if (pid === FOPT_PID_PIB) {
      return value;
    }
  }

  return undefined;
}

/**
 * Calculate display dimensions in EMU from PIC data.
 * Display size = (original size × scale / 1000) - cropping
 */
export function picToDisplayEmu(pic: PicData): { widthEmu: number; heightEmu: number } {
  const displayWidthTwips = Math.max(0, (pic.widthTwips * pic.scaleX) / 1000 - pic.cropLeft - pic.cropRight);
  const displayHeightTwips = Math.max(0, (pic.heightTwips * pic.scaleY) / 1000 - pic.cropTop - pic.cropBottom);
  return {
    widthEmu: Math.round(displayWidthTwips * TWIPS_TO_EMU),
    heightEmu: Math.round(displayHeightTwips * TWIPS_TO_EMU),
  };
}
