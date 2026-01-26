/**
 * @file Minimal CFB writer for XLS fixtures
 */

import { CFB_SIGNATURE, ENDOFCHAIN, FATSECT, FREESECT, NOSTREAM } from "../../../src/cfb/constants";
import { u16le, u32le, u64le } from "./biff";

/** Write a single directory entry into a 512-byte directory sector. */
export function writeDirectoryEntry(args: {
  readonly buf: Uint8Array;
  readonly entryIndex: number;
  readonly name: string;
  readonly type: number;
  readonly leftSiblingId: number;
  readonly rightSiblingId: number;
  readonly childId: number;
  readonly startingSector: number;
  readonly streamSize: bigint;
}): void {
  const base = args.entryIndex * 128;
  const view = new DataView(args.buf.buffer, args.buf.byteOffset, args.buf.byteLength);
  for (let i = 0; i < args.name.length; i++) {
    view.setUint16(base + i * 2, args.name.charCodeAt(i), true);
  }
  view.setUint16(base + args.name.length * 2, 0, true);
  u16le(view, base + 64, (args.name.length + 1) * 2);
  view.setUint8(base + 66, args.type);
  view.setUint8(base + 67, 0x01);
  u32le(view, base + 68, args.leftSiblingId);
  u32le(view, base + 72, args.rightSiblingId);
  u32le(view, base + 76, args.childId);
  u32le(view, base + 116, args.startingSector);
  u64le(view, base + 120, args.streamSize);
}

/**
 * Build a minimal valid CFB file containing a single "Workbook" stream.
 *
 * Notes:
 * - This writer intentionally supports only a small subset of CFB features (enough for our fixtures).
 * - Sector size is fixed to 512.
 */
export function buildMinimalCfbWithWorkbookStream(workbookBytes: Uint8Array): Uint8Array {
  const sectorSize = 512;
  const headerSize = 512;

  const streamSectors = Math.ceil(workbookBytes.length / sectorSize);
  const directorySectors = 1;
  const fatSectors = 1;

  const totalSectors = directorySectors + streamSectors + fatSectors;
  const fileBytes = new Uint8Array(headerSize + totalSectors * sectorSize);
  const headerView = new DataView(fileBytes.buffer);

  fileBytes.set(CFB_SIGNATURE, 0);
  u16le(headerView, 26, 0x0003);
  u16le(headerView, 28, 0xfffe);
  u16le(headerView, 30, 0x0009);
  u16le(headerView, 32, 0x0006);
  u32le(headerView, 44, fatSectors);
  u32le(headerView, 48, 0); // first directory sector
  u32le(headerView, 56, 0x1000);
  u32le(headerView, 60, ENDOFCHAIN);
  u32le(headerView, 64, 0);
  u32le(headerView, 68, ENDOFCHAIN);
  u32le(headerView, 72, 0);

  const fatSectorNumber = totalSectors - 1;
  u32le(headerView, 76, fatSectorNumber);
  for (let i = 1; i < 109; i++) {
    u32le(headerView, 76 + i * 4, FREESECT);
  }

  const directoryOffset = headerSize + 0 * sectorSize;
  const directory = new Uint8Array(fileBytes.buffer, directoryOffset, sectorSize);
  directory.fill(0);
  writeDirectoryEntry({
    buf: directory,
    entryIndex: 0,
    name: "Root Entry",
    type: 0x05,
    leftSiblingId: NOSTREAM,
    rightSiblingId: NOSTREAM,
    childId: 1,
    startingSector: ENDOFCHAIN,
    streamSize: 0n,
  });
  writeDirectoryEntry({
    buf: directory,
    entryIndex: 1,
    name: "Workbook",
    type: 0x02,
    leftSiblingId: NOSTREAM,
    rightSiblingId: NOSTREAM,
    childId: NOSTREAM,
    startingSector: 1,
    streamSize: BigInt(workbookBytes.length),
  });

  for (let i = 0; i < streamSectors; i++) {
    const sectorNumber = 1 + i;
    const offset = headerSize + sectorNumber * sectorSize;
    const slice = workbookBytes.subarray(i * sectorSize, (i + 1) * sectorSize);
    fileBytes.set(slice, offset);
  }

  const fatOffset = headerSize + fatSectorNumber * sectorSize;
  const fat = new Uint8Array(fileBytes.buffer, fatOffset, sectorSize);
  fat.fill(0xff);
  const fatView = new DataView(fat.buffer, fat.byteOffset, fat.byteLength);

  u32le(fatView, 0 * 4, ENDOFCHAIN); // directory
  for (let s = 0; s < streamSectors; s++) {
    const sectorNumber = 1 + s;
    const next = s === streamSectors - 1 ? ENDOFCHAIN : sectorNumber + 1;
    u32le(fatView, sectorNumber * 4, next);
  }
  u32le(fatView, fatSectorNumber * 4, FATSECT);

  return fileBytes;
}
