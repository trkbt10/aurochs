/**
 * @file Recursive container record parser
 *
 * Container records have recVer=0xF and contain child records.
 */

import type { PptRecord } from "./types";
import { readPptRecord, RECORD_HEADER_SIZE } from "./record-reader";

/**
 * Parse a PPT record, recursively expanding container records (recVer=0xF).
 */
export function parsePptRecordTree(bytes: Uint8Array, offset: number): PptRecord {
  const record = readPptRecord(bytes, offset);

  if (record.recVer === 0xF) {
    const children = parseContainerChildren(bytes, offset + RECORD_HEADER_SIZE, offset + RECORD_HEADER_SIZE + record.recLen);
    return { ...record, children };
  }

  return record;
}

/**
 * Parse all child records within a container's data range.
 */
export function parseContainerChildren(
  bytes: Uint8Array,
  startOffset: number,
  endOffset: number,
): readonly PptRecord[] {
  const children: PptRecord[] = [];
  let pos = startOffset;

  while (pos + RECORD_HEADER_SIZE <= endOffset) {
    const child = parsePptRecordTree(bytes, pos);
    children.push(child);
    pos += RECORD_HEADER_SIZE + child.recLen;
  }

  return children;
}
