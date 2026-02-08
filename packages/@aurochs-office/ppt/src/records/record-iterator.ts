/**
 * @file Flat record iteration (no recursive expansion)
 */

import type { PptRecord } from "./types";
import { readPptRecord, RECORD_HEADER_SIZE } from "./record-reader";

/**
 * Iterate through PPT records sequentially without expanding containers.
 */
export function* iterateRecords(
  bytes: Uint8Array,
  startOffset: number = 0,
  endOffset?: number,
): Generator<PptRecord> {
  const end = endOffset ?? bytes.length;
  let pos = startOffset;

  while (pos + RECORD_HEADER_SIZE <= end) {
    const record = readPptRecord(bytes, pos);
    yield record;
    pos += RECORD_HEADER_SIZE + record.recLen;
  }
}

/** Find the first record of a given type in a container's children. */
export function findChildByType(children: readonly PptRecord[], recType: number): PptRecord | undefined {
  return children.find(c => c.recType === recType);
}

/** Find all records of a given type in a container's children. */
export function findChildrenByType(children: readonly PptRecord[], recType: number): readonly PptRecord[] {
  return children.filter(c => c.recType === recType);
}
