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
  let writeOffset = 0;
  for (const chunk of chunks) {
    out.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }
  return out;
}

export function readRecordWithContinues(
  bytes: Uint8Array,
  offset: number,
  opts: ReadRecordOptions = {},
): ReadRecordWithContinuesResult {
  const first = readRecord(bytes, offset, opts);

  const continues: BiffRecord[] = [];
  const chunks: Uint8Array[] = [first.data];
  let mergedLength = first.length;

  let nextOffset = offset + 4 + first.length;
  while (nextOffset < bytes.length) {
    const next = readRecord(bytes, nextOffset, opts);
    if (next.type !== BIFF_RECORD_TYPES.CONTINUE) {
      break;
    }

    continues.push(next);
    chunks.push(next.data);
    mergedLength += next.length;
    nextOffset += 4 + next.length;
  }

  if (continues.length === 0) {
    return { record: first, continues, nextOffset };
  }

  return {
    record: {
      ...first,
      length: mergedLength,
      data: concatUint8Arrays(chunks, mergedLength),
    },
    continues,
    nextOffset,
  };
}
