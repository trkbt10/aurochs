/**
 * @file MS-CFB directory parser
 */

import { CfbFormatError } from "../errors";
import type { CfbDirectoryEntry, CfbDirectoryEntryType } from "../types";

function parseDirectoryEntryType(v: number): CfbDirectoryEntryType {
  switch (v) {
    case 0x00:
      return "unused";
    case 0x01:
      return "storage";
    case 0x02:
      return "stream";
    case 0x05:
      return "root";
    default:
      throw new CfbFormatError(`Unknown directory entry type: 0x${v.toString(16)}`);
  }
}

function parseUtf16leName(bytes: Uint8Array, nameLenBytes: number): string {
  if (nameLenBytes < 2) {
    return "";
  }
  if (nameLenBytes > 64) {
    throw new CfbFormatError(`Invalid directory name length: ${nameLenBytes}`);
  }
  // Name length includes terminating null (2 bytes).
  const dataBytes = nameLenBytes - 2;
  const nameBytes = bytes.subarray(0, dataBytes);
  const decoder = new TextDecoder("utf-16le");
  return decoder.decode(nameBytes);
}

/** Parse a CFB Directory stream (sequence of 128-byte directory entries). */
export function parseDirectoryStream(directoryBytes: Uint8Array): readonly CfbDirectoryEntry[] {
  if (directoryBytes.length % 128 !== 0) {
    // Directory stream is sector-aligned; allow trailing bytes but keep parsing full entries only.
  }

  const entries: CfbDirectoryEntry[] = [];
  const view = new DataView(directoryBytes.buffer, directoryBytes.byteOffset, directoryBytes.byteLength);
  const count = Math.floor(directoryBytes.length / 128);

  for (let i = 0; i < count; i++) {
    const base = i * 128;
    const nameBytes = directoryBytes.subarray(base, base + 64);
    const nameLenBytes = view.getUint16(base + 64, true);
    const objectType = view.getUint8(base + 66);
    const leftSiblingId = view.getUint32(base + 68, true);
    const rightSiblingId = view.getUint32(base + 72, true);
    const childId = view.getUint32(base + 76, true);
    const startingSector = view.getUint32(base + 116, true);
    const streamSize = view.getBigUint64(base + 120, true);

    const type = parseDirectoryEntryType(objectType);
    const name = parseUtf16leName(nameBytes, nameLenBytes);

    entries.push({
      id: i,
      name,
      type,
      leftSiblingId,
      rightSiblingId,
      childId,
      startingSector,
      streamSize,
    });
  }

  return entries;
}
