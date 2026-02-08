/**
 * @file MS-CFB (Compound File Binary) public API
 */

import { ENDOFCHAIN } from "./constants";
import { CfbFormatError } from "./errors";
import type { CfbFile } from "./types";
import { parseCfbHeader } from "./parser/header";
import { buildDifat } from "./parser/difat";
import { buildFat } from "./parser/fat";
import { readDirectoryStreamBytes, readStreamFromFat } from "./parser/streams";
import { parseDirectoryStream } from "./parser/directory";
import { createCfbRunner } from "./runner";
import { walkFatChain } from "./parser/chain";
import { readSector } from "./parser/sector";
import type { CfbWarningSink } from "./warnings";
import { warnCfbOrThrow } from "./warnings";

export type { CfbDirectoryEntry, CfbFile, CfbHeader } from "./types";
export { CfbFormatError, CfbUnsupportedError } from "./errors";
export {
  CFB_SIGNATURE,
  CFB_HEADER_SIZE,
  DIFSECT,
  ENDOFCHAIN,
  FATSECT,
  FREESECT,
  MAXREGSECT,
  NOSTREAM,
} from "./constants";

export type { CfbWarning, CfbWarningCode, CfbWarningSink } from "./warnings";
export { warnCfbOrThrow } from "./warnings";

function walkFatChainOrEmpty(args: {
  readonly fat: Uint32Array;
  readonly startSector: number;
  readonly expectedSectors: number;
  readonly opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink };
  readonly where: string;
}): readonly number[] {
  try {
    return walkFatChain(args.fat, args.startSector, { maxSteps: args.expectedSectors + 10_000 });
  } catch (err) {
    warnCfbOrThrow(
      args.opts,
      {
        code: "MINIFAT_CHAIN_INVALID",
        where: args.where,
        message: `MiniFAT chain walk failed; treating MiniFAT as empty: ${err instanceof Error ? err.message : String(err)}`,
        meta: { firstMiniFatSector: args.startSector, miniFatSectors: args.expectedSectors },
      },
      err instanceof Error ? err : new Error(String(err)),
    );
    return [];
  }
}

function tryReadSectorOrTruncate(args: {
  readonly bytes: Uint8Array;
  readonly header: ReturnType<typeof parseCfbHeader>;
  readonly sectorNumber: number;
  readonly sectorIndex: number;
  readonly opts: { readonly strict: boolean; readonly onWarning?: CfbWarningSink };
  readonly where: string;
}): Uint8Array | undefined {
  try {
    return readSector(args.bytes, args.header, args.sectorNumber);
  } catch (err) {
    warnCfbOrThrow(
      args.opts,
      {
        code: "FAT_SECTOR_READ_FAILED",
        where: args.where,
        message: `Failed to read MiniFAT sector; truncating MiniFAT: sector=${args.sectorNumber}`,
        meta: { sectorNumber: args.sectorNumber, sectorIndex: args.sectorIndex },
      },
      err instanceof Error ? err : new Error(String(err)),
    );
    return undefined;
  }
}

/** Open an MS-CFB (Compound File Binary) container from bytes. */
export function openCfb(bytes: Uint8Array, opts?: { readonly strict?: boolean; readonly onWarning?: CfbWarningSink }): CfbFile {
  const strict = opts?.strict ?? true;
  const onWarning = opts?.onWarning;
  if (!strict && !onWarning) {
    throw new Error("openCfb: non-strict mode requires onWarning sink");
  }
  const header = parseCfbHeader(bytes, { strict });
  const difat = buildDifat(bytes, header, { strict });
  const fat = buildFat(bytes, header, difat);

  const directoryBytes = readDirectoryStreamBytes(bytes, header, fat);
  const directory = parseDirectoryStream(directoryBytes);

  // MiniFAT + mini stream are optional.
  const mini: { miniFat?: Uint32Array; miniStreamBytes?: Uint8Array } = {};

  if (header.firstMiniFatSector !== ENDOFCHAIN) {
    const miniFatSectors = header.numberOfMiniFatSectors;
    const optsForRead = { strict, ...(onWarning ? { onWarning } : {}) };
    const chain = walkFatChainOrEmpty({ fat, startSector: header.firstMiniFatSector, expectedSectors: miniFatSectors, opts: optsForRead, where: "openCfb:MiniFAT" });
    if (chain.length < miniFatSectors) {
      warnCfbOrThrow(
        optsForRead,
        {
          code: "MINIFAT_CHAIN_TOO_SHORT",
          where: "openCfb:MiniFAT",
          message: `MiniFAT chain too short; truncating: chain=${chain.length}, required=${miniFatSectors}`,
          meta: { chain: chain.length, required: miniFatSectors },
        },
        new CfbFormatError(`MiniFAT chain too short: ${chain.length} < ${miniFatSectors}`),
      );
    } else if (chain.length !== miniFatSectors) {
      warnCfbOrThrow(
        optsForRead,
        {
          code: "MINIFAT_CHAIN_LENGTH_MISMATCH",
          where: "openCfb:MiniFAT",
          message: `MiniFAT chain length mismatch; using first required sectors: chain=${chain.length}, required=${miniFatSectors}`,
          meta: { chain: chain.length, required: miniFatSectors },
        },
        new CfbFormatError(`MiniFAT chain length mismatch: ${chain.length} !== ${miniFatSectors}`),
      );
    }

    const entryCount = (miniFatSectors * header.sectorSize) / 4;
    const entries = new Uint32Array(entryCount);
    entries.fill(ENDOFCHAIN);

    for (let sectorIndex = 0; sectorIndex < miniFatSectors; sectorIndex++) {
      const sectorNumber = chain[sectorIndex];
      if (sectorNumber === undefined) {
        break;
      }
      const sectorBytes = tryReadSectorOrTruncate({ bytes, header, sectorNumber, sectorIndex, opts: optsForRead, where: "openCfb:MiniFAT" });
      if (!sectorBytes) {
        break;
      }

      const view = new DataView(sectorBytes.buffer, sectorBytes.byteOffset, sectorBytes.byteLength);
      const baseEntry = (sectorIndex * header.sectorSize) / 4;
      for (let i = 0; i < header.sectorSize; i += 4) {
        const idx = baseEntry + i / 4;
        if (idx >= entries.length) {
          break;
        }
        entries[idx] = view.getUint32(i, true);
      }
    }
    mini.miniFat = entries;
  }

  const root = directory[0];
  if (root && root.type === "root" && root.streamSize > 0n) {
    mini.miniStreamBytes = readStreamFromFat({ bytes, header, fat, startSector: root.startingSector, streamSize: root.streamSize, opts: { strict, ...(onWarning ? { onWarning } : {}) } });
  }

  return createCfbRunner({ bytes, header, directory, fat, miniFat: mini.miniFat, miniStreamBytes: mini.miniStreamBytes, strict, ...(onWarning ? { onWarning } : {}) });
}
