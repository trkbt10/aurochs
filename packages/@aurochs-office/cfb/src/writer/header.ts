/**
 * @file CFB Header serialization
 *
 * Serializes the 512-byte CFB header.
 * @see MS-CFB 2.2 (Compound File Header)
 */

import { CFB_SIGNATURE, CFB_HEADER_SIZE, ENDOFCHAIN, FREESECT } from "../constants";

/**
 * Header configuration for building.
 */
export type CfbHeaderConfig = {
  /** Number of FAT sectors */
  readonly numberOfFatSectors: number;
  /** First directory sector number */
  readonly firstDirectorySector: number;
  /** First MiniFAT sector number (ENDOFCHAIN if none) */
  readonly firstMiniFatSector: number;
  /** Number of MiniFAT sectors */
  readonly numberOfMiniFatSectors: number;
  /** First DIFAT sector number (ENDOFCHAIN if FAT fits in header) */
  readonly firstDifatSector: number;
  /** Number of DIFAT sectors */
  readonly numberOfDifatSectors: number;
  /** FAT sector numbers for DIFAT (up to 109 in header) */
  readonly difatEntries: readonly number[];
};

/**
 * Serialize a CFB header (512 bytes).
 *
 * Uses version 3 (512-byte sectors, 64-byte mini sectors).
 */
export function serializeCfbHeader(config: CfbHeaderConfig): Uint8Array {
  const header = new Uint8Array(CFB_HEADER_SIZE);
  const view = new DataView(header.buffer);

  // Signature (offset 0, 8 bytes)
  header.set(CFB_SIGNATURE, 0);

  // Minor version (offset 24, 2 bytes) - should be 0x003E
  view.setUint16(24, 0x003e, true);

  // Major version (offset 26, 2 bytes) - 3 for 512-byte sectors
  view.setUint16(26, 3, true);

  // Byte order (offset 28, 2 bytes) - 0xFFFE for little-endian
  view.setUint16(28, 0xfffe, true);

  // Sector shift (offset 30, 2 bytes) - 9 for 512-byte sectors
  view.setUint16(30, 9, true);

  // Mini sector shift (offset 32, 2 bytes) - 6 for 64-byte mini sectors
  view.setUint16(32, 6, true);

  // Reserved (offset 34, 6 bytes) - zeros

  // Total sectors in FAT (offset 44, 4 bytes)
  view.setUint32(44, config.numberOfFatSectors, true);

  // First directory sector (offset 48, 4 bytes)
  view.setUint32(48, config.firstDirectorySector, true);

  // Transaction signature (offset 52, 4 bytes) - zeros

  // Mini stream cutoff size (offset 56, 4 bytes) - 0x1000
  view.setUint32(56, 0x1000, true);

  // First MiniFAT sector (offset 60, 4 bytes)
  view.setUint32(60, config.firstMiniFatSector, true);

  // Number of MiniFAT sectors (offset 64, 4 bytes)
  view.setUint32(64, config.numberOfMiniFatSectors, true);

  // First DIFAT sector (offset 68, 4 bytes)
  view.setUint32(68, config.firstDifatSector, true);

  // Number of DIFAT sectors (offset 72, 4 bytes)
  view.setUint32(72, config.numberOfDifatSectors, true);

  // DIFAT array (offset 76, 436 bytes = 109 entries)
  // Fill with FREESECT first
  for (let i = 0; i < 109; i++) {
    view.setUint32(76 + i * 4, FREESECT, true);
  }
  // Write actual DIFAT entries
  for (let i = 0; i < Math.min(config.difatEntries.length, 109); i++) {
    view.setUint32(76 + i * 4, config.difatEntries[i], true);
  }

  return header;
}
