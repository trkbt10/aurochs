/**
 * @file Pictures stream parser
 *
 * The "Pictures" CFB stream contains a sequence of OfficeArt BLIP records.
 * Each record contains an embedded image (PNG, JPEG, EMF, WMF, etc.).
 */

import type { PptEmbeddedImage } from "../domain/types";
import { readPptRecord, RECORD_HEADER_SIZE } from "../records/record-reader";
import { isBlipRecordType, parseBlipRecord } from "../records/atoms/picture";

/**
 * Parse the Pictures stream to extract all embedded images.
 */
export function parsePicturesStream(bytes: Uint8Array): readonly PptEmbeddedImage[] {
  const images: PptEmbeddedImage[] = [];
  let offset = 0;
  let index = 0;

  while (offset + RECORD_HEADER_SIZE < bytes.length) {
    try {
      const record = readPptRecord(bytes, offset);

      if (isBlipRecordType(record.recType)) {
        const blip = parseBlipRecord(record);
        images.push({
          index,
          contentType: blip.contentType,
          data: blip.data,
        });
        index++;
      }

      offset += RECORD_HEADER_SIZE + record.recLen;
    } catch {
      // If we can't read a record, we've likely reached the end or corrupt data
      break;
    }
  }

  return images;
}
