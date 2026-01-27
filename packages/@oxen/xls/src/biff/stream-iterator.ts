/**
 * @file BIFF stream record iterator
 */

import { readRecord } from "./record-reader";
import type { BiffRecord, ReadRecordOptions } from "./types";

export type IterateRecordsOptions = ReadRecordOptions & {
  allowTrailingBytes?: boolean;
};

/**
 * Iterate over BIFF records in a raw workbook stream.
 */
export function* iterateRecords(
  bytes: Uint8Array,
  opts: IterateRecordsOptions = {},
): Generator<BiffRecord> {
  for (let offset = 0; offset < bytes.length; ) {
    if (offset + 4 > bytes.length) {
      if (opts.allowTrailingBytes) {
        return;
      }
      throw new Error(
        `Truncated BIFF record header at offset ${offset} (need 4 bytes, have ${bytes.length - offset})`,
      );
    }

    const record = readRecord(bytes, offset, opts);
    yield record;
    offset += 4 + record.length;
  }
}
