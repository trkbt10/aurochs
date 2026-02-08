/**
 * @file MS-CFB FAT builder
 */

import { FREESECT } from "../constants";
import { CfbFormatError } from "../errors";
import type { CfbHeader } from "../types";
import { readSector } from "./sector";

/** Build the FAT (array of next-sector pointers) from DIFAT sector numbers. */
export function buildFat(bytes: Uint8Array, header: CfbHeader, difat: readonly number[]): Uint32Array {
  const entries: number[] = [];
  for (const sectorNumber of difat) {
    const sector = readSector(bytes, header, sectorNumber);
    const view = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
    for (let i = 0; i < header.sectorSize; i += 4) {
      entries.push(view.getUint32(i, true));
    }
  }

  if (entries.length === 0) {
    throw new CfbFormatError("FAT is empty");
  }

  // Note: trailing FAT entries may cover beyond file sector count; in strict mode we could verify FREESECT there.
  return new Uint32Array(entries);
}

/** Get the FAT entry value for the given sector number. */
export function fatGet(fat: Uint32Array, sectorNumber: number): number {
  const v = fat[sectorNumber];
  return v === undefined ? FREESECT : v;
}
