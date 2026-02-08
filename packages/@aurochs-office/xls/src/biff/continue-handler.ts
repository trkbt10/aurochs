/**
 * @file BIFF CONTINUE record handling helpers
 */

import { BIFF_RECORD_TYPES } from "./record-types";
import { readRecord } from "./record-reader";
import type { BiffRecord, ReadRecordOptions } from "./types";

export type ReadRecordWithContinuesResult = {
  record: BiffRecord;
  continues: BiffRecord[];
  nextOffset: number;
};

/**
 * Concatenate multiple chunks into a single contiguous Uint8Array.
 */
function concatUint8Arrays(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const out = new Uint8Array(totalLength);
  chunks.reduce((writeOffset, chunk) => {
    out.set(chunk, writeOffset);
    return writeOffset + chunk.length;
  }, 0);
  return out;
}

/** Read a BIFF record and merge subsequent CONTINUE record payloads. */
export function readRecordWithContinues(
  bytes: Uint8Array,
  offset: number,
  opts: ReadRecordOptions = {},
): ReadRecordWithContinuesResult {
  const first = readRecord(bytes, offset, opts);

  const continues: BiffRecord[] = [];
  const chunks: Uint8Array[] = [first.data];
  const merged = { length: first.length, nextOffset: offset + 4 + first.length };

  while (merged.nextOffset < bytes.length) {
    const next = readRecord(bytes, merged.nextOffset, opts);
    if (next.type !== BIFF_RECORD_TYPES.CONTINUE) {
      break;
    }

    continues.push(next);
    chunks.push(next.data);
    merged.length += next.length;
    merged.nextOffset += 4 + next.length;
  }

  if (continues.length === 0) {
    return { record: first, continues, nextOffset: merged.nextOffset };
  }

  return {
    record: {
      ...first,
      length: merged.length,
      data: concatUint8Arrays(chunks, merged.length),
    },
    continues,
    nextOffset: merged.nextOffset,
  };
}
