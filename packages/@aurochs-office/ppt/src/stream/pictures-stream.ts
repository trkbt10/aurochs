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
/** Handle error during picture stream parsing, returning images collected so far. */
function handlePictureStreamError(_error: unknown, images: readonly PptEmbeddedImage[]): readonly PptEmbeddedImage[] {
  return images;
}

/** Parse the Pictures stream to extract all embedded images. */
export function parsePicturesStream(bytes: Uint8Array): readonly PptEmbeddedImage[] {
  const images: PptEmbeddedImage[] = [];
  const state = { offset: 0, index: 0 };

  while (state.offset + RECORD_HEADER_SIZE < bytes.length) {
    try {
      const record = readPptRecord(bytes, state.offset);

      if (isBlipRecordType(record.recType)) {
        const blip = parseBlipRecord(record);
        images.push({
          index: state.index,
          contentType: blip.contentType,
          data: blip.data,
        });
        state.index++;
      }

      state.offset += RECORD_HEADER_SIZE + record.recLen;
    } catch (error) {
      // If we can't read a record, we've likely reached the end or corrupt data
      return handlePictureStreamError(error, images);
    }
  }

  return images;
}
