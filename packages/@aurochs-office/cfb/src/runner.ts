/**
 * @file MS-CFB runner (path resolution / stream reading)
 */

import { ENDOFCHAIN, NOSTREAM } from "./constants";
import { CfbFormatError } from "./errors";
import type { CfbDirectoryEntry, CfbFile, CfbHeader, CfbListEntry } from "./types";
import { readStreamFromFat, readStreamFromMiniFat } from "./parser/streams";
import type { CfbWarningSink } from "./warnings";

function normalizeName(name: string): string {
  return name.toUpperCase();
}

function assertEntryId(entries: readonly CfbDirectoryEntry[], id: number, where: string): CfbDirectoryEntry {
  const entry = entries[id];
  if (!entry) {
    throw new CfbFormatError(`${where}: entry id out of range: ${id}`);
  }
  return entry;
}

function walkRbTreeInOrder(entries: readonly CfbDirectoryEntry[], rootId: number): readonly number[] {
  const out: number[] = [];
  const visited = new Set<number>();

  function visit(id: number): void {
    if (id === NOSTREAM) {
      return;
    }
    if (visited.has(id)) {
      throw new CfbFormatError("Directory tree has a cycle");
    }
    visited.add(id);
    const entry = assertEntryId(entries, id, "Directory tree");
    visit(entry.leftSiblingId);
    out.push(id);
    visit(entry.rightSiblingId);
  }

  visit(rootId);
  return out;
}

function buildChildIndex(entries: readonly CfbDirectoryEntry[], storageId: number): ReadonlyMap<string, number> {
  const storage = assertEntryId(entries, storageId, "buildChildIndex");
  if (storage.type !== "root" && storage.type !== "storage") {
    throw new CfbFormatError(`buildChildIndex: entry ${storageId} is not a storage/root`);
  }
  if (storage.childId === NOSTREAM) {
    return new Map();
  }

  const childIds = walkRbTreeInOrder(entries, storage.childId);
  const map = new Map<string, number>();
  for (const childId of childIds) {
    const child = assertEntryId(entries, childId, "buildChildIndex");
    if (child.type !== "storage" && child.type !== "stream") {
      continue;
    }
    const key = normalizeName(child.name);
    if (map.has(key)) {
      throw new CfbFormatError(`Duplicate child name in storage ${storageId}: ${child.name}`);
    }
    map.set(key, childId);
  }
  return map;
}

/** Create a CFB runner that resolves paths and reads streams from parsed directory + FAT/MiniFAT data. */
export function createCfbRunner(args: {
  readonly bytes: Uint8Array;
  readonly header: CfbHeader;
  readonly directory: readonly CfbDirectoryEntry[];
  readonly fat: Uint32Array;
  readonly miniFat?: Uint32Array;
  readonly miniStreamBytes?: Uint8Array;
  readonly strict: boolean;
  readonly onWarning?: CfbWarningSink;
}): CfbFile {
  const childIndexByStorageId = new Map<number, ReadonlyMap<string, number>>();

  function getEntryById(id: number): CfbDirectoryEntry | undefined {
    return args.directory[id];
  }

  function getChildIndex(storageId: number): ReadonlyMap<string, number> {
    const cached = childIndexByStorageId.get(storageId);
    if (cached) {
      return cached;
    }
    const built = buildChildIndex(args.directory, storageId);
    childIndexByStorageId.set(storageId, built);
    return built;
  }

  function getEntry(path: readonly string[]): CfbDirectoryEntry {
    if (!Array.isArray(path) || path.length === 0) {
      throw new CfbFormatError("getEntry: path must be a non-empty string[]");
    }

    const cursor: { currentId: number } = { currentId: 0 };
    for (let i = 0; i < path.length; i++) {
      const part = path[i];
      if (!part) {
        throw new CfbFormatError("getEntry: path contains empty segment");
      }
      const index = getChildIndex(cursor.currentId);
      const nextId = index.get(normalizeName(part));
      if (nextId === undefined) {
        throw new CfbFormatError(`Path not found: ${path.join("/")}`);
      }
      const entry = assertEntryId(args.directory, nextId, "getEntry");
      const isLast = i === path.length - 1;
      if (!isLast && entry.type !== "storage") {
        throw new CfbFormatError(`Path segment is not a storage: ${part}`);
      }
      cursor.currentId = nextId;
    }
    return assertEntryId(args.directory, cursor.currentId, "getEntry");
  }

  function list(path?: readonly string[]): readonly CfbListEntry[] {
    const storage = path ? getEntry(path) : assertEntryId(args.directory, 0, "list");
    if (storage.type !== "root" && storage.type !== "storage") {
      throw new CfbFormatError("list: path must refer to a storage/root");
    }

    const index = getChildIndex(storage.id);
    const out: CfbListEntry[] = [];
    for (const id of index.values()) {
      const entry = assertEntryId(args.directory, id, "list");
      if (entry.type === "storage" || entry.type === "stream") {
        out.push({ name: entry.name, type: entry.type });
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  function readStreamByEntry(entry: CfbDirectoryEntry): Uint8Array {
    if (entry.type !== "stream") {
      throw new CfbFormatError(`readStream: entry is not a stream: ${entry.name}`);
    }

    const isMini = entry.streamSize < BigInt(args.header.miniStreamCutoffSize);
    if (!isMini) {
      return readStreamFromFat({ bytes: args.bytes, header: args.header, fat: args.fat, startSector: entry.startingSector, streamSize: entry.streamSize, opts: { strict: args.strict, ...(args.onWarning ? { onWarning: args.onWarning } : {}) } });
    }

    if (!args.miniFat || !args.miniStreamBytes) {
      throw new CfbFormatError(`readStream: mini stream data not available for ${entry.name}`);
    }
    if (entry.startingSector === ENDOFCHAIN && entry.streamSize !== 0n) {
      throw new CfbFormatError("readStream: non-empty mini stream has ENDOFCHAIN as starting sector");
    }
    return readStreamFromMiniFat({ miniFat: args.miniFat, miniStreamBytes: args.miniStreamBytes, header: args.header, startMiniSector: entry.startingSector, streamSize: entry.streamSize, opts: { strict: args.strict, ...(args.onWarning ? { onWarning: args.onWarning } : {}) } });
  }

  function readStream(path: readonly string[]): Uint8Array {
    const entry = getEntry(path);
    return readStreamByEntry(entry);
  }

  function readStreamText(path: readonly string[], enc: "utf-8" | "utf-16le"): string {
    const bytes = readStream(path);
    const decoder = new TextDecoder(enc);
    return decoder.decode(bytes);
  }

  const root = assertEntryId(args.directory, 0, "createCfbRunner");
  if (args.strict && root.type !== "root") {
    throw new CfbFormatError("Directory entry 0 must be the root entry");
  }

  return {
    header: args.header,
    directory: args.directory,
    getEntryById,
    getEntry,
    list,
    readStream,
    readStreamText,
  };
}
