/**
 * @file MS-CFB sector helpers
 */

import { CFB_HEADER_SIZE, ENDOFCHAIN, FREESECT, MAXREGSECT } from "../constants";
import { CfbFormatError } from "../errors";
import type { CfbHeader } from "../types";

/** Get the number of addressable sectors in the file. */
export function getSectorCount(bytes: Uint8Array, header: CfbHeader): number {
  const payloadBytes = bytes.length - CFB_HEADER_SIZE;
  if (payloadBytes < 0) {
    return 0;
  }
  return Math.floor(payloadBytes / header.sectorSize);
}

/** Assert that a sector number is a valid REGSECT within the file. */
export function assertRegSect(sector: number, sectorCount: number, where: string): void {
  if (sector === ENDOFCHAIN || sector === FREESECT) {
    throw new CfbFormatError(`${where}: invalid sector value: 0x${sector.toString(16)}`);
  }
  if (sector > MAXREGSECT) {
    throw new CfbFormatError(`${where}: sector is out of REGSECT range: 0x${sector.toString(16)}`);
  }
  if (sector >= sectorCount) {
    throw new CfbFormatError(`${where}: sector is out of file range: ${sector} >= ${sectorCount}`);
  }
}

/** Read a full sector by number. */
export function readSector(bytes: Uint8Array, header: CfbHeader, sectorNumber: number): Uint8Array {
  const sectorCount = getSectorCount(bytes, header);
  assertRegSect(sectorNumber, sectorCount, "readSector");

  const start = (sectorNumber + 1) * header.sectorSize;
  const end = start + header.sectorSize;
  if (end > bytes.length) {
    throw new CfbFormatError(`readSector: sector ${sectorNumber} is truncated`);
  }
  return bytes.subarray(start, end);
}
