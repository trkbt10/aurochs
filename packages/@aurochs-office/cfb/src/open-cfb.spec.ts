/**
 * @file CFB public API tests
 */

import { openCfb } from "./index";
import { CFB_SIGNATURE, ENDOFCHAIN, FATSECT, FREESECT, NOSTREAM } from "./constants";

function u16le(view: DataView, offset: number, v: number): void {
  view.setUint16(offset, v, true);
}

function u32le(view: DataView, offset: number, v: number): void {
  view.setUint32(offset, v >>> 0, true);
}

function u64le(view: DataView, offset: number, v: bigint): void {
  view.setBigUint64(offset, v, true);
}

function writeDirectoryEntry(args: {
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

  // Manual UTF-16LE write
  for (let i = 0; i < args.name.length; i++) {
    const code = args.name.charCodeAt(i);
    view.setUint16(base + i * 2, code, true);
  }
  view.setUint16(base + args.name.length * 2, 0, true);

  const nameLenBytes = (args.name.length + 1) * 2;
  u16le(view, base + 64, nameLenBytes);
  view.setUint8(base + 66, args.type);
  view.setUint8(base + 67, 0x01);
  u32le(view, base + 68, args.leftSiblingId);
  u32le(view, base + 72, args.rightSiblingId);
  u32le(view, base + 76, args.childId);
  u32le(view, base + 116, args.startingSector);
  u64le(view, base + 120, args.streamSize);
}

function buildMinimalCfbWithWorkbookStream(workbookBytes: Uint8Array): Uint8Array {
  const sectorSize = 512;
  const headerSize = 512;

  const streamSectors = Math.ceil(workbookBytes.length / sectorSize);
  const directorySectors = 1;
  const fatSectors = 1;

  const totalSectors = directorySectors + streamSectors + fatSectors;
  const fileBytes = new Uint8Array(headerSize + totalSectors * sectorSize);
  const headerView = new DataView(fileBytes.buffer);

  // Signature
  fileBytes.set(CFB_SIGNATURE, 0);
  // CLSID (16 bytes) stays 0
  u16le(headerView, 24, 0x003e); // minor version (ignored)
  u16le(headerView, 26, 0x0003); // major version 3
  u16le(headerView, 28, 0xfffe); // byte order
  u16le(headerView, 30, 0x0009); // sector shift (512)
  u16le(headerView, 32, 0x0006); // mini sector shift (64)
  // reserved 6 bytes + numDirectorySectors
  u32le(headerView, 44, fatSectors); // number of FAT sectors
  u32le(headerView, 48, 0); // first directory sector = sector 0
  u32le(headerView, 56, 0x1000); // mini stream cutoff
  u32le(headerView, 60, ENDOFCHAIN); // first mini fat sector
  u32le(headerView, 64, 0); // number of mini fat sectors
  u32le(headerView, 68, ENDOFCHAIN); // first difat sector
  u32le(headerView, 72, 0); // number of difat sectors

  // DIFAT entries (109). Only one FAT sector: last sector index.
  const fatSectorNumber = totalSectors - 1;
  u32le(headerView, 76, fatSectorNumber);
  for (let i = 1; i < 109; i++) {
    u32le(headerView, 76 + i * 4, FREESECT);
  }

  // Sector 0: Directory stream
  const directoryOffset = headerSize + 0 * sectorSize;
  const directory = new Uint8Array(fileBytes.buffer, directoryOffset, sectorSize);
  directory.fill(0);

  // Root entry (id=0)
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

  // Workbook stream entry (id=1)
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

  // Sectors 1..streamSectors: stream bytes
  for (let i = 0; i < streamSectors; i++) {
    const sectorNumber = 1 + i;
    const offset = headerSize + sectorNumber * sectorSize;
    const slice = workbookBytes.subarray(i * sectorSize, (i + 1) * sectorSize);
    fileBytes.set(slice, offset);
  }

  // FAT sector
  const fatOffset = headerSize + fatSectorNumber * sectorSize;
  const fat = new Uint8Array(fileBytes.buffer, fatOffset, sectorSize);
  fat.fill(0xff);
  const fatView = new DataView(fat.buffer, fat.byteOffset, fat.byteLength);

  // Directory sector (0)
  u32le(fatView, 0 * 4, ENDOFCHAIN);
  // Stream chain sectors (1..streamSectors)
  for (let s = 0; s < streamSectors; s++) {
    const sectorNumber = 1 + s;
    const next = s === streamSectors - 1 ? ENDOFCHAIN : sectorNumber + 1;
    u32le(fatView, sectorNumber * 4, next);
  }
  // FAT sector itself
  u32le(fatView, fatSectorNumber * 4, FATSECT);
  // Remaining entries already FREESECT (0xFFFFFFFF)

  return fileBytes;
}

describe("openCfb", () => {
  it("opens a minimal CFB and reads a top-level stream", () => {
    const payload = new Uint8Array(4096);
    payload.set([1, 2, 3, 4, 5], 0);
    const cfbBytes = buildMinimalCfbWithWorkbookStream(payload);
    const cfb = openCfb(cfbBytes);
    expect(cfb.list().map((e) => e.name)).toEqual(["Workbook"]);
    expect(Array.from(cfb.readStream(["Workbook"]).subarray(0, 5))).toEqual([1, 2, 3, 4, 5]);
  });

  it("throws on invalid signature", () => {
    const bytes = new Uint8Array(512);
    expect(() => openCfb(bytes)).toThrow(/signature/i);
  });
});
