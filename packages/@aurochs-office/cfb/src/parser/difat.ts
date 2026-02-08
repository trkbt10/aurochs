/**
 * @file MS-CFB DIFAT builder
 */

import { ENDOFCHAIN, FREESECT } from "../constants";
import { CfbFormatError } from "../errors";
import type { CfbHeader } from "../types";
import { readSector } from "./sector";

/** Build the DIFAT (list of FAT sector numbers). */
export function buildDifat(bytes: Uint8Array, header: CfbHeader, opts: { readonly strict: boolean }): readonly number[] {
  const fatSectors: number[] = [];
  for (const entry of header.difat) {
    if (entry !== FREESECT) {
      fatSectors.push(entry);
    }
  }

  if (header.numberOfDifatSectors === 0) {
    if (opts.strict && fatSectors.length !== header.numberOfFatSectors) {
      throw new CfbFormatError(
        `DIFAT count mismatch: header lists ${fatSectors.length}, numberOfFatSectors=${header.numberOfFatSectors}`,
      );
    }
    return fatSectors;
  }

  const chainState: { nextDifatSector: number } = { nextDifatSector: header.firstDifatSector };
  const seen = new Set<number>();

  for (let i = 0; i < header.numberOfDifatSectors; i++) {
    const nextDifatSector = chainState.nextDifatSector;
    if (nextDifatSector === ENDOFCHAIN) {
      throw new CfbFormatError("DIFAT chain ended early");
    }
    if (seen.has(nextDifatSector)) {
      throw new CfbFormatError("DIFAT chain has a cycle");
    }
    seen.add(nextDifatSector);

    const sector = readSector(bytes, header, nextDifatSector);
    const view = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
    const entriesPerSector = header.sectorSize / 4;

    for (let j = 0; j < entriesPerSector - 1; j++) {
      const v = view.getUint32(j * 4, true);
      if (v !== FREESECT) {
        fatSectors.push(v);
      }
    }

    chainState.nextDifatSector = view.getUint32((entriesPerSector - 1) * 4, true);
  }

  if (opts.strict && chainState.nextDifatSector !== ENDOFCHAIN) {
    throw new CfbFormatError("DIFAT chain did not end with ENDOFCHAIN");
  }
  if (opts.strict && fatSectors.length !== header.numberOfFatSectors) {
    throw new CfbFormatError(
      `DIFAT count mismatch: collected ${fatSectors.length}, numberOfFatSectors=${header.numberOfFatSectors}`,
    );
  }

  return fatSectors;
}
