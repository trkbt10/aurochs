/**
 * @file PPT record types
 *
 * PPT records have an 8-byte header:
 *   recVer (4 bits) | recInstance (12 bits) | recType (u16) | recLen (u32)
 *
 * Container records (recVer=0xF) have children; atom records contain raw data.
 */

export type PptRecord = {
  readonly recVer: number;
  readonly recInstance: number;
  readonly recType: number;
  readonly recLen: number;
  readonly data: Uint8Array;
  readonly offset: number;
  readonly children?: readonly PptRecord[];
};
