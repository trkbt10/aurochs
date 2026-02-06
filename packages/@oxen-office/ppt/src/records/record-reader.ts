/**
 * @file PPT record header reader
 *
 * PPT record header is 8 bytes:
 *   Byte 0-1 (u16 LE): recVer (bits 0-3) | recInstance (bits 4-15)
 *   Byte 2-3 (u16 LE): recType
 *   Byte 4-7 (u32 LE): recLen
 */

import type { PptRecord } from "./types";

const RECORD_HEADER_SIZE = 8;

function formatHex(value: number): string {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

/** Read a single PPT record header + payload at the given offset. */
export function readPptRecord(bytes: Uint8Array, offset: number): PptRecord {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`Invalid PPT record offset: ${offset}`);
  }
  if (offset + RECORD_HEADER_SIZE > bytes.length) {
    throw new Error(
      `Truncated PPT record header at offset ${offset} (need ${RECORD_HEADER_SIZE} bytes, have ${bytes.length - offset})`,
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, RECORD_HEADER_SIZE);
  const verAndInstance = view.getUint16(0, true);
  const recVer = verAndInstance & 0x0F;
  const recInstance = (verAndInstance >> 4) & 0x0FFF;
  const recType = view.getUint16(2, true);
  const recLen = view.getUint32(4, true);

  const dataStart = offset + RECORD_HEADER_SIZE;
  const dataEnd = dataStart + recLen;
  if (dataEnd > bytes.length) {
    throw new Error(
      `Truncated PPT record data for type ${formatHex(recType)} at offset ${offset} (need ${recLen} bytes, have ${bytes.length - dataStart})`,
    );
  }

  return {
    recVer,
    recInstance,
    recType,
    recLen,
    data: bytes.subarray(dataStart, dataEnd),
    offset,
  };
}

/** Get the total size of a record including its header. */
export function recordTotalSize(record: PptRecord): number {
  return RECORD_HEADER_SIZE + record.recLen;
}

export { RECORD_HEADER_SIZE };
