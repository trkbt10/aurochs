/**
 * @file BIFF record header/data reader
 */

import type { BiffRecord, ReadRecordOptions } from "./types";

const DEFAULT_MAX_RECORD_DATA_LENGTH = 8224;

/**
 * Format a 16-bit BIFF record type as a fixed-width hex string.
 */
function formatHex(value: number): string {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

/** Read a BIFF record header and payload bytes from a raw stream. */
export function readRecord(bytes: Uint8Array, offset: number, opts: ReadRecordOptions = {}): BiffRecord {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`Invalid BIFF record offset: ${offset}`);
  }
  if (offset + 4 > bytes.length) {
    throw new Error(
      `Truncated BIFF record header at offset ${offset} (need 4 bytes, have ${bytes.length - offset})`,
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
  const type = view.getUint16(0, true);
  const length = view.getUint16(2, true);

  const maxRecordDataLength = opts.maxRecordDataLength ?? DEFAULT_MAX_RECORD_DATA_LENGTH;
  const strict = opts.strict ?? true;
  if (strict && length > maxRecordDataLength) {
    throw new Error(
      `Invalid BIFF record length ${length} (max ${maxRecordDataLength}) for type ${formatHex(type)} at offset ${offset}`,
    );
  }

  const dataStart = offset + 4;
  const dataEnd = dataStart + length;
  if (dataEnd > bytes.length) {
    throw new Error(
      `Truncated BIFF record data for type ${formatHex(type)} at offset ${offset} (need ${length} bytes, have ${bytes.length - dataStart})`,
    );
  }

  return {
    type,
    length,
    data: bytes.subarray(dataStart, dataEnd),
    offset,
  };
}
