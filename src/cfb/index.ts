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

export type { CfbDirectoryEntry, CfbFile, CfbHeader } from "./types";
export { CfbFormatError, CfbUnsupportedError } from "./errors";

export function openCfb(bytes: Uint8Array, opts?: { readonly strict?: boolean }): CfbFile {
  const strict = opts?.strict ?? true;
  const header = parseCfbHeader(bytes, { strict });
  const difat = buildDifat(bytes, header, { strict });
  const fat = buildFat(bytes, header, difat);

  const directoryBytes = readDirectoryStreamBytes(bytes, header, fat);
  const directory = parseDirectoryStream(directoryBytes);

  // MiniFAT + mini stream are optional.
  let miniFat: Uint32Array | undefined;
  let miniStreamBytes: Uint8Array | undefined;

  if (header.firstMiniFatSector !== ENDOFCHAIN) {
    const chain = walkFatChain(fat, header.firstMiniFatSector, { maxSteps: header.numberOfMiniFatSectors + 10_000 });
    if (strict && chain.length !== header.numberOfMiniFatSectors) {
      throw new CfbFormatError(`MiniFAT chain length mismatch: ${chain.length} !== ${header.numberOfMiniFatSectors}`);
    }

    const raw = new Uint8Array(chain.length * header.sectorSize);
    let offset = 0;
    for (const sectorNumber of chain) {
      raw.set(readSector(bytes, header, sectorNumber), offset);
      offset += header.sectorSize;
    }
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const entries: number[] = [];
    for (let i = 0; i < raw.length; i += 4) {
      entries.push(view.getUint32(i, true));
    }
    miniFat = new Uint32Array(entries);
  }

  const root = directory[0];
  if (root && root.type === "root" && root.streamSize > 0n) {
    miniStreamBytes = readStreamFromFat(bytes, header, fat, root.startingSector, root.streamSize, { strict });
  }

  return createCfbRunner({ bytes, header, directory, fat, miniFat, miniStreamBytes, strict });
}

