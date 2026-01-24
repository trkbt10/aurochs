/**
 * @file MS-CFB stream readers
 */

import { ENDOFCHAIN } from "../constants";
import { CfbFormatError } from "../errors";
import type { CfbHeader } from "../types";
import { readSector } from "./sector";
import { walkFatChain, walkMiniFatChain } from "./chain";

function assertSafeSize(size: bigint, where: string): number {
  if (size < 0n) {
    throw new CfbFormatError(`${where}: negative stream size`);
  }
  if (size > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new CfbFormatError(`${where}: stream size too large for JS: ${size.toString()}`);
  }
  return Number(size);
}

export function readStreamFromFat(
  bytes: Uint8Array,
  header: CfbHeader,
  fat: Uint32Array,
  startSector: number,
  streamSize: bigint,
  opts: { readonly strict: boolean },
): Uint8Array {
  const size = assertSafeSize(streamSize, "readStreamFromFat");
  if (size === 0) return new Uint8Array();
  if (startSector === ENDOFCHAIN) {
    throw new CfbFormatError("readStreamFromFat: non-empty stream has ENDOFCHAIN as starting sector");
  }

  const requiredSectors = Math.ceil(size / header.sectorSize);
  const chain = walkFatChain(fat, startSector, { maxSteps: requiredSectors + 10_000 });
  if (chain.length < requiredSectors) {
    throw new CfbFormatError(`readStreamFromFat: chain too short: ${chain.length} < ${requiredSectors}`);
  }
  if (opts.strict && chain.length !== requiredSectors) {
    throw new CfbFormatError(`readStreamFromFat: chain length mismatch: ${chain.length} !== ${requiredSectors}`);
  }

  const out = new Uint8Array(chain.length * header.sectorSize);
  let offset = 0;
  for (const sectorNumber of chain) {
    out.set(readSector(bytes, header, sectorNumber), offset);
    offset += header.sectorSize;
  }
  return out.subarray(0, size);
}

export function readDirectoryStreamBytes(bytes: Uint8Array, header: CfbHeader, fat: Uint32Array): Uint8Array {
  if (header.firstDirectorySector === ENDOFCHAIN) {
    throw new CfbFormatError("Directory stream missing (firstDirectorySector=ENDOFCHAIN)");
  }
  const chain = walkFatChain(fat, header.firstDirectorySector, { maxSteps: 1_000_000 });
  if (chain.length === 0) {
    throw new CfbFormatError("Directory stream chain is empty");
  }
  const out = new Uint8Array(chain.length * header.sectorSize);
  let offset = 0;
  for (const sectorNumber of chain) {
    out.set(readSector(bytes, header, sectorNumber), offset);
    offset += header.sectorSize;
  }
  return out;
}

export function readStreamFromMiniFat(
  miniFat: Uint32Array,
  miniStreamBytes: Uint8Array,
  header: CfbHeader,
  startMiniSector: number,
  streamSize: bigint,
  opts: { readonly strict: boolean },
): Uint8Array {
  const size = assertSafeSize(streamSize, "readStreamFromMiniFat");
  if (size === 0) return new Uint8Array();

  const requiredSectors = Math.ceil(size / header.miniSectorSize);
  const chain = walkMiniFatChain(miniFat, startMiniSector, { maxSteps: requiredSectors + 10_000 });
  if (chain.length < requiredSectors) {
    throw new CfbFormatError(`readStreamFromMiniFat: chain too short: ${chain.length} < ${requiredSectors}`);
  }
  if (opts.strict && chain.length !== requiredSectors) {
    throw new CfbFormatError(`readStreamFromMiniFat: chain length mismatch: ${chain.length} !== ${requiredSectors}`);
  }

  const out = new Uint8Array(chain.length * header.miniSectorSize);
  let offset = 0;
  for (const miniSectorNumber of chain) {
    const start = miniSectorNumber * header.miniSectorSize;
    const end = start + header.miniSectorSize;
    if (end > miniStreamBytes.length) {
      throw new CfbFormatError("readStreamFromMiniFat: mini stream is truncated");
    }
    out.set(miniStreamBytes.subarray(start, end), offset);
    offset += header.miniSectorSize;
  }
  return out.subarray(0, size);
}

