/**
 * @file MS-CFB stream readers
 */

import { ENDOFCHAIN } from "../constants";
import { CfbFormatError } from "../errors";
import type { CfbHeader } from "../types";
import type { CfbWarningSink } from "../warnings";
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

function requireWarningSink(opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink }, where: string): CfbWarningSink {
  if (opts.strict) {
    throw new Error(`${where}: internal error (warning sink required only in non-strict mode)`);
  }
  if (!opts.onWarning) {
    throw new Error(`${where}: non-strict mode requires onWarning sink`);
  }
  return opts.onWarning;
}

function readFatChainOrFallback(params: {
  readonly fat: Uint32Array;
  readonly startSector: number;
  readonly requiredSectors: number;
  readonly opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink };
}): readonly number[] {
  const { fat, startSector, requiredSectors, opts } = params;
  try {
    return walkFatChain(fat, startSector, { maxSteps: requiredSectors + 10_000 });
  } catch (err) {
    if (opts.strict) {
      throw err;
    }
    const onWarning = requireWarningSink(opts, "readStreamFromFat");
    onWarning({
      code: "FAT_CHAIN_INVALID",
      where: "readStreamFromFat",
      message: `FAT chain walk failed; returning zero-filled stream: ${err instanceof Error ? err.message : String(err)}`,
      meta: { startSector, required: requiredSectors },
    });
    return [];
  }
}

function readMiniFatChainOrFallback(params: {
  readonly miniFat: Uint32Array;
  readonly startMiniSector: number;
  readonly requiredSectors: number;
  readonly opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink };
}): readonly number[] {
  const { miniFat, startMiniSector, requiredSectors, opts } = params;
  try {
    return walkMiniFatChain(miniFat, startMiniSector, { maxSteps: requiredSectors + 10_000 });
  } catch (err) {
    if (opts.strict) {
      throw err;
    }
    const onWarning = requireWarningSink(opts, "readStreamFromMiniFat");
    onWarning({
      code: "MINIFAT_CHAIN_INVALID",
      where: "readStreamFromMiniFat",
      message: `MiniFAT chain walk failed; returning zero-filled stream: ${err instanceof Error ? err.message : String(err)}`,
      meta: { startMiniSector, required: requiredSectors },
    });
    return [];
  }
}

/**
 * Read a stream stored as a FAT chain.
 *
 * In strict mode, format errors throw. In non-strict mode, problems emit warnings (via `onWarning`) and return a
 * zero-filled/truncated stream to allow higher layers to attempt recovery.
 */
export function readStreamFromFat(params: {
  readonly bytes: Uint8Array;
  readonly header: CfbHeader;
  readonly fat: Uint32Array;
  readonly startSector: number;
  readonly streamSize: bigint;
  readonly opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink };
}): Uint8Array {
  const { bytes, header, fat, startSector, streamSize, opts } = params;
  const size = assertSafeSize(streamSize, "readStreamFromFat");
  if (size === 0) {
    return new Uint8Array();
  }
  if (startSector === ENDOFCHAIN) {
    throw new CfbFormatError("readStreamFromFat: non-empty stream has ENDOFCHAIN as starting sector");
  }

  const requiredSectors = Math.ceil(size / header.sectorSize);
  const out = new Uint8Array(requiredSectors * header.sectorSize);

  const chain = readFatChainOrFallback({ fat, startSector, requiredSectors, opts });

  if (chain.length < requiredSectors) {
    try {
      throw new CfbFormatError(`readStreamFromFat: chain too short: ${chain.length} < ${requiredSectors}`);
    } catch (err) {
      if (opts.strict) {
        throw err;
      }
      const onWarning = requireWarningSink(opts, "readStreamFromFat");
      onWarning({
        code: "FAT_CHAIN_TOO_SHORT",
        where: "readStreamFromFat",
        message: `FAT chain too short; zero-filling missing sectors: chain=${chain.length}, required=${requiredSectors}`,
        meta: { chain: chain.length, required: requiredSectors, startSector },
      });
    }
  } else if (chain.length !== requiredSectors) {
    try {
      throw new CfbFormatError(`readStreamFromFat: chain length mismatch: ${chain.length} !== ${requiredSectors}`);
    } catch (err) {
      if (opts.strict) {
        throw err;
      }
      const onWarning = requireWarningSink(opts, "readStreamFromFat");
      onWarning({
        code: "FAT_CHAIN_LENGTH_MISMATCH",
        where: "readStreamFromFat",
        message: `FAT chain length mismatch; using first required sectors: chain=${chain.length}, required=${requiredSectors}`,
        meta: { chain: chain.length, required: requiredSectors, startSector },
      });
    }
  }

  for (let i = 0; i < requiredSectors; i++) {
    const sectorNumber = chain[i];
    if (sectorNumber === undefined) {
      break;
    }
    try {
      out.set(readSector(bytes, header, sectorNumber), i * header.sectorSize);
    } catch (err) {
      if (opts.strict) {
        throw err;
      }
      const onWarning = requireWarningSink(opts, "readStreamFromFat");
      onWarning({
        code: "FAT_SECTOR_READ_FAILED",
        where: "readStreamFromFat",
        message: `Failed to read FAT sector; truncating stream read and zero-filling remainder: sector=${sectorNumber}`,
        meta: { sectorNumber, sectorIndex: i, startSector },
      });
      break;
    }
  }
  return out.subarray(0, size);
}

/** Read the Directory stream (stored in FAT, fixed sector size). */
export function readDirectoryStreamBytes(bytes: Uint8Array, header: CfbHeader, fat: Uint32Array): Uint8Array {
  if (header.firstDirectorySector === ENDOFCHAIN) {
    throw new CfbFormatError("Directory stream missing (firstDirectorySector=ENDOFCHAIN)");
  }
  const chain = walkFatChain(fat, header.firstDirectorySector, { maxSteps: 1_000_000 });
  if (chain.length === 0) {
    throw new CfbFormatError("Directory stream chain is empty");
  }
  const out = new Uint8Array(chain.length * header.sectorSize);
  for (const [i, sectorNumber] of chain.entries()) {
    out.set(readSector(bytes, header, sectorNumber), i * header.sectorSize);
  }
  return out;
}

/**
 * Read a stream stored as a MiniFAT chain.
 *
 * In strict mode, format errors throw. In non-strict mode, problems emit warnings (via `onWarning`) and return a
 * zero-filled/truncated stream to allow higher layers to attempt recovery.
 */
export function readStreamFromMiniFat(params: {
  readonly miniFat: Uint32Array;
  readonly miniStreamBytes: Uint8Array;
  readonly header: CfbHeader;
  readonly startMiniSector: number;
  readonly streamSize: bigint;
  readonly opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink };
}): Uint8Array {
  const { miniFat, miniStreamBytes, header, startMiniSector, streamSize, opts } = params;
  const size = assertSafeSize(streamSize, "readStreamFromMiniFat");
  if (size === 0) {
    return new Uint8Array();
  }

  const requiredSectors = Math.ceil(size / header.miniSectorSize);
  const out = new Uint8Array(requiredSectors * header.miniSectorSize);

  const chain = readMiniFatChainOrFallback({ miniFat, startMiniSector, requiredSectors, opts });

  if (chain.length < requiredSectors) {
    try {
      throw new CfbFormatError(`readStreamFromMiniFat: chain too short: ${chain.length} < ${requiredSectors}`);
    } catch (err) {
      if (opts.strict) {
        throw err;
      }
      const onWarning = requireWarningSink(opts, "readStreamFromMiniFat");
      onWarning({
        code: "MINIFAT_CHAIN_TOO_SHORT",
        where: "readStreamFromMiniFat",
        message: `MiniFAT chain too short; zero-filling missing mini sectors: chain=${chain.length}, required=${requiredSectors}`,
        meta: { chain: chain.length, required: requiredSectors, startMiniSector },
      });
    }
  } else if (chain.length !== requiredSectors) {
    try {
      throw new CfbFormatError(`readStreamFromMiniFat: chain length mismatch: ${chain.length} !== ${requiredSectors}`);
    } catch (err) {
      if (opts.strict) {
        throw err;
      }
      const onWarning = requireWarningSink(opts, "readStreamFromMiniFat");
      onWarning({
        code: "MINIFAT_CHAIN_LENGTH_MISMATCH",
        where: "readStreamFromMiniFat",
        message: `MiniFAT chain length mismatch; using first required mini sectors: chain=${chain.length}, required=${requiredSectors}`,
        meta: { chain: chain.length, required: requiredSectors, startMiniSector },
      });
    }
  }

  for (let i = 0; i < requiredSectors; i++) {
    const miniSectorNumber = chain[i];
    if (miniSectorNumber === undefined) {
      break;
    }
    const start = miniSectorNumber * header.miniSectorSize;
    const end = start + header.miniSectorSize;
    if (end > miniStreamBytes.length) {
      try {
        throw new CfbFormatError("readStreamFromMiniFat: mini stream is truncated");
      } catch (err) {
        if (opts.strict) {
          throw err;
        }
        const onWarning = requireWarningSink(opts, "readStreamFromMiniFat");
        onWarning({
          code: "MINISTREAM_TRUNCATED",
          where: "readStreamFromMiniFat",
          message: "Mini stream is truncated; truncating read and zero-filling remainder.",
          meta: { miniStreamBytes: miniStreamBytes.length, end, startMiniSector, miniSectorNumber, miniSectorIndex: i },
        });
      }
      break;
    }
    out.set(miniStreamBytes.subarray(start, end), i * header.miniSectorSize);
  }
  return out.subarray(0, size);
}
