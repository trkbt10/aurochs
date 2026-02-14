/**
 * @file CFB Directory Entry serialization
 *
 * Serializes directory entries to 128-byte blocks.
 * @see MS-CFB 2.6 (Compound File Directory Sectors)
 */

import { NOSTREAM } from "../constants";

/**
 * Directory entry type codes.
 */
const ENTRY_TYPE_UNUSED = 0x00;
const ENTRY_TYPE_STORAGE = 0x01;
const ENTRY_TYPE_STREAM = 0x02;
const ENTRY_TYPE_ROOT = 0x05;

/**
 * Directory entry color (for red-black tree).
 */
const COLOR_RED = 0x00;
const COLOR_BLACK = 0x01;

/**
 * Internal directory entry for building.
 */
export type DirectoryEntryData = {
  readonly name: string;
  readonly type: "root" | "storage" | "stream";
  readonly childId: number;
  readonly leftSiblingId: number;
  readonly rightSiblingId: number;
  readonly startingSector: number;
  readonly streamSize: bigint;
};

/**
 * Encode a string as UTF-16LE.
 */
function encodeUtf16le(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = (code >> 8) & 0xff;
  }
  return bytes;
}

/**
 * Serialize a directory entry to a 128-byte block.
 */
export function serializeDirectoryEntry(entry: DirectoryEntryData): Uint8Array {
  const block = new Uint8Array(128);
  const view = new DataView(block.buffer);

  // Entry Name (64 bytes, UTF-16LE, null-terminated)
  const nameBytes = encodeUtf16le(entry.name);
  if (nameBytes.length > 62) {
    throw new Error(`Directory entry name too long: "${entry.name}" (max 31 chars)`);
  }
  block.set(nameBytes, 0);
  // Null terminator already present (buffer initialized to 0)

  // Entry Name Size (offset 64, 2 bytes) - includes null terminator
  const nameSizeBytes = nameBytes.length + 2;
  view.setUint16(64, nameSizeBytes, true);

  // Object Type (offset 66, 1 byte)
  const typeCode =
    entry.type === "root" ? ENTRY_TYPE_ROOT : entry.type === "storage" ? ENTRY_TYPE_STORAGE : entry.type === "stream" ? ENTRY_TYPE_STREAM : ENTRY_TYPE_UNUSED;
  view.setUint8(66, typeCode);

  // Color Flag (offset 67, 1 byte) - always BLACK for simplicity
  view.setUint8(67, COLOR_BLACK);

  // Left Sibling ID (offset 68, 4 bytes)
  view.setUint32(68, entry.leftSiblingId, true);

  // Right Sibling ID (offset 72, 4 bytes)
  view.setUint32(72, entry.rightSiblingId, true);

  // Child ID (offset 76, 4 bytes)
  view.setUint32(76, entry.childId, true);

  // CLSID (offset 80, 16 bytes) - zeros
  // State Bits (offset 96, 4 bytes) - zeros
  // Creation Time (offset 100, 8 bytes) - zeros
  // Modified Time (offset 108, 8 bytes) - zeros

  // Starting Sector Location (offset 116, 4 bytes)
  view.setUint32(116, entry.startingSector, true);

  // Stream Size (offset 120, 8 bytes)
  view.setBigUint64(120, entry.streamSize, true);

  return block;
}

/**
 * Create an unused directory entry (all zeros).
 */
export function createUnusedEntry(): DirectoryEntryData {
  return {
    name: "",
    type: "stream",
    childId: NOSTREAM,
    leftSiblingId: NOSTREAM,
    rightSiblingId: NOSTREAM,
    startingSector: 0,
    streamSize: 0n,
  };
}

/**
 * Serialize multiple directory entries to a directory stream.
 * Pads to sector boundary (512 bytes for version 3).
 */
export function serializeDirectoryStream(entries: readonly DirectoryEntryData[], sectorSize: number): Uint8Array {
  const entrySizeBytes = entries.length * 128;
  const paddedSize = Math.ceil(entrySizeBytes / sectorSize) * sectorSize;
  const result = new Uint8Array(paddedSize);

  for (let i = 0; i < entries.length; i++) {
    const entryBytes = serializeDirectoryEntry(entries[i]);
    result.set(entryBytes, i * 128);
  }

  // Fill remaining with unused entries
  for (let i = entries.length * 128; i < paddedSize; i += 128) {
    const unusedEntry = serializeDirectoryEntry(createUnusedEntry());
    result.set(unusedEntry, i);
  }

  return result;
}
