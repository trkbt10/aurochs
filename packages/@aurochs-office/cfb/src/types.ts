/**
 * @file MS-CFB types
 */

export type CfbHeader = {
  readonly majorVersion: 3 | 4;
  readonly sectorSize: number;
  readonly miniSectorSize: number;
  readonly miniStreamCutoffSize: number;

  readonly numberOfFatSectors: number;
  readonly firstDirectorySector: number;

  readonly firstMiniFatSector: number;
  readonly numberOfMiniFatSectors: number;

  readonly firstDifatSector: number;
  readonly numberOfDifatSectors: number;

  /** Header DIFAT entries (109 entries) */
  readonly difat: readonly number[];
};

export type CfbDirectoryEntryType = "root" | "storage" | "stream" | "unused";

export type CfbDirectoryEntry = {
  readonly id: number;
  readonly name: string;
  readonly type: CfbDirectoryEntryType;
  readonly leftSiblingId: number;
  readonly rightSiblingId: number;
  readonly childId: number;
  readonly startingSector: number;
  readonly streamSize: bigint;
};

export type CfbListEntry = {
  readonly name: string;
  readonly type: "storage" | "stream";
};

export type CfbFile = {
  readonly header: CfbHeader;
  readonly directory: readonly CfbDirectoryEntry[];

  getEntryById(id: number): CfbDirectoryEntry | undefined;
  getEntry(path: readonly string[]): CfbDirectoryEntry;
  list(path?: readonly string[]): readonly CfbListEntry[];
  readStream(path: readonly string[]): Uint8Array;
  readStreamText(path: readonly string[], enc: "utf-8" | "utf-16le"): string;
};

