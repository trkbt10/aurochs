/**
 * @file CFB Builder
 *
 * Creates MS-CFB (Compound File Binary) containers from scratch.
 * Implements the writer counterpart to openCfb().
 *
 * @see MS-CFB (Microsoft Compound File Binary Format)
 */

import { ENDOFCHAIN, NOSTREAM, FREESECT } from "../constants";
import type { DirectoryEntryData } from "./directory";
import { serializeDirectoryStream } from "./directory";
import { createFatBuilder, serializeFatSectors } from "./fat";
import { serializeCfbHeader } from "./header";

const SECTOR_SIZE = 512; // Version 3 CFB
const MINI_SECTOR_SIZE = 64;
const MINI_STREAM_CUTOFF = 0x1000; // 4096 bytes

/**
 * CFB Builder interface for constructing CFB containers.
 */
export type CfbBuilder = {
  /**
   * Add a storage (directory) to the CFB.
   * Creates parent storages automatically if they don't exist.
   */
  addStorage(path: readonly string[]): void;

  /**
   * Add a stream (file) to the CFB.
   * Creates parent storages automatically if they don't exist.
   */
  addStream(path: readonly string[], data: Uint8Array): void;

  /**
   * Build the CFB container and return the bytes.
   */
  build(): Uint8Array;
};

/**
 * Internal node in the directory tree.
 */
type TreeNode = {
  name: string;
  type: "root" | "storage" | "stream";
  data: Uint8Array | null;
  children: Map<string, TreeNode>;
};

/**
 * Create a CFB builder.
 *
 * @returns A builder for constructing CFB containers
 *
 * @example
 * ```typescript
 * const builder = createCfbBuilder();
 * builder.addStream(["VBA", "dir"], dirData);
 * builder.addStream(["VBA", "Module1"], module1Data);
 * const bytes = builder.build();
 * ```
 */
export function createCfbBuilder(): CfbBuilder {
  // Root node of the directory tree
  const root: TreeNode = {
    name: "Root Entry",
    type: "root",
    data: null,
    children: new Map(),
  };

  function ensureStorage(path: readonly string[]): TreeNode {
    let current = root;
    for (const segment of path) {
      let child = current.children.get(segment.toUpperCase());
      if (!child) {
        child = {
          name: segment,
          type: "storage",
          data: null,
          children: new Map(),
        };
        current.children.set(segment.toUpperCase(), child);
      }
      current = child;
    }
    return current;
  }

  return {
    addStorage(path: readonly string[]): void {
      ensureStorage(path);
    },

    addStream(path: readonly string[], data: Uint8Array): void {
      if (path.length === 0) {
        throw new Error("Stream path cannot be empty");
      }

      const parentPath = path.slice(0, -1);
      const streamName = path[path.length - 1];

      const parent = ensureStorage(parentPath);
      const normalizedName = streamName.toUpperCase();

      if (parent.children.has(normalizedName)) {
        const existing = parent.children.get(normalizedName)!;
        if (existing.type !== "stream") {
          throw new Error(`Cannot replace storage with stream: ${path.join("/")}`);
        }
        existing.data = data;
      } else {
        parent.children.set(normalizedName, {
          name: streamName,
          type: "stream",
          data,
          children: new Map(),
        });
      }
    },

    build(): Uint8Array {
      // Step 1: Flatten tree to directory entries
      const { entries, streamDataByIndex } = flattenTree(root);

      // Step 2: Separate mini stream and regular streams
      const { miniStream, miniStreamMap, regularStreamList } = classifyStreams(entries, streamDataByIndex);

      // Step 3: Build FAT and allocate sectors
      const fatBuilder = createFatBuilder();

      // Allocate directory sectors
      const dirSectorCount = Math.ceil((entries.length * 128) / SECTOR_SIZE);
      const firstDirSector = fatBuilder.allocateChain(dirSectorCount);

      // Allocate mini stream sectors (root entry stream)
      let miniStreamStartSector = ENDOFCHAIN;
      if (miniStream.length > 0) {
        const miniStreamSectorCount = Math.ceil(miniStream.length / SECTOR_SIZE);
        miniStreamStartSector = fatBuilder.allocateChain(miniStreamSectorCount);
      }

      // Allocate sectors for regular streams (>= 4096 bytes)
      const regularStreamSectors = new Map<number, number>();
      for (const { index, data } of regularStreamList) {
        const sectorCount = Math.ceil(data.length / SECTOR_SIZE);
        const startSector = fatBuilder.allocateChain(sectorCount);
        regularStreamSectors.set(index, startSector);
      }

      // Build MiniFAT if we have mini stream
      let miniFatBytes: Uint8Array = new Uint8Array(0);
      let firstMiniFatSector = ENDOFCHAIN;
      let numberOfMiniFatSectors = 0;

      if (miniStream.length > 0) {
        const miniFat = buildMiniFat(miniStreamMap, miniStream.length);
        const serialized = serializeMiniFat(miniFat, SECTOR_SIZE);
        miniFatBytes = serialized;
        numberOfMiniFatSectors = miniFatBytes.length / SECTOR_SIZE;
        if (numberOfMiniFatSectors > 0) {
          firstMiniFatSector = fatBuilder.allocateChain(numberOfMiniFatSectors);
        }
      }

      // Calculate FAT sectors needed (iteratively since FAT includes itself)
      let fatSectorCount = 0;
      let prevFatSectorCount = -1;
      while (fatSectorCount !== prevFatSectorCount) {
        prevFatSectorCount = fatSectorCount;
        const totalSectors = fatBuilder.getSectorCount() + fatSectorCount;
        const entriesPerSector = SECTOR_SIZE / 4;
        fatSectorCount = Math.ceil(totalSectors / entriesPerSector);
      }

      // Mark FAT sectors in FAT
      const fatStartSector = fatBuilder.getSectorCount();
      for (let i = 0; i < fatSectorCount; i++) {
        fatBuilder.markFatSector(fatStartSector + i);
      }

      // Build final entries with sector assignments
      const finalEntries = entries.map((entry, i) => {
        if (i === 0) {
          // Root entry - holds mini stream
          return {
            ...entry,
            startingSector: miniStreamStartSector,
            streamSize: BigInt(miniStream.length),
          };
        }

        const miniInfo = miniStreamMap.get(i);
        if (miniInfo) {
          return {
            ...entry,
            startingSector: miniInfo.miniSectorStart,
          };
        }

        const regularSector = regularStreamSectors.get(i);
        if (regularSector !== undefined) {
          return {
            ...entry,
            startingSector: regularSector,
          };
        }

        return entry;
      });

      // Build FAT
      const fatEntries = fatBuilder.getEntries();
      const fatBytes = serializeFatSectors(fatEntries, SECTOR_SIZE);

      // Build DIFAT
      const difatEntries: number[] = [];
      for (let i = 0; i < fatSectorCount; i++) {
        difatEntries.push(fatStartSector + i);
      }

      // Build header
      const header = serializeCfbHeader({
        numberOfFatSectors: fatSectorCount,
        firstDirectorySector: firstDirSector,
        firstMiniFatSector,
        numberOfMiniFatSectors,
        firstDifatSector: ENDOFCHAIN,
        numberOfDifatSectors: 0,
        difatEntries,
      });

      // Serialize directory
      const dirBytes = serializeDirectoryStream(finalEntries, SECTOR_SIZE);

      // Assemble final CFB
      const totalSize = header.length + fatBuilder.getSectorCount() * SECTOR_SIZE;
      const result = new Uint8Array(totalSize);

      // Copy header
      result.set(header, 0);

      // Copy sectors in allocation order
      let offset = header.length;

      // Directory sectors
      result.set(dirBytes, offset);
      offset += dirBytes.length;

      // Mini stream sectors
      if (miniStream.length > 0) {
        const paddedMiniStream = padToSectorBoundary(miniStream, SECTOR_SIZE);
        result.set(paddedMiniStream, offset);
        offset += paddedMiniStream.length;
      }

      // Regular stream sectors
      for (const { data } of regularStreamList) {
        const paddedData = padToSectorBoundary(data, SECTOR_SIZE);
        result.set(paddedData, offset);
        offset += paddedData.length;
      }

      // MiniFAT sectors
      if (miniFatBytes.length > 0) {
        result.set(miniFatBytes, offset);
        offset += miniFatBytes.length;
      }

      // FAT sectors
      result.set(fatBytes, offset);

      return result;
    },
  };
}

/**
 * Flatten tree to directory entries with red-black tree ordering.
 * Root entry is always at index 0.
 */
function flattenTree(root: TreeNode): {
  entries: DirectoryEntryData[];
  streamDataByIndex: Map<number, Uint8Array>;
} {
  const entries: DirectoryEntryData[] = [];
  const streamDataByIndex = new Map<number, Uint8Array>();

  // First, collect all nodes and assign indices
  const nodeToIndex = new Map<TreeNode, number>();

  // Recursively process and assign indices
  function collectNodes(node: TreeNode): void {
    const index = entries.length;
    nodeToIndex.set(node, index);

    // Create placeholder entry (will be updated with proper sibling/child IDs)
    // Empty streams and non-stream entries use ENDOFCHAIN for startingSector
    const hasData = node.data && node.data.length > 0;
    const entry: DirectoryEntryData = {
      name: node.name,
      type: node.type,
      childId: NOSTREAM,
      leftSiblingId: NOSTREAM,
      rightSiblingId: NOSTREAM,
      startingSector: hasData ? 0 : ENDOFCHAIN,
      streamSize: node.data ? BigInt(node.data.length) : 0n,
    };
    entries.push(entry);

    if (node.data) {
      streamDataByIndex.set(index, node.data);
    }

    // Process children in sorted order (length first, then case-insensitive name)
    const sortedChildren = getSortedChildren(node);
    for (const child of sortedChildren) {
      collectNodes(child);
    }
  }

  // Build a balanced binary tree from sorted nodes
  function buildSiblingTree(nodes: TreeNode[]): { root: number; assignments: Map<number, { left: number; right: number }> } {
    const assignments = new Map<number, { left: number; right: number }>();

    function buildSubtree(start: number, end: number): number {
      if (start > end) {
        return NOSTREAM;
      }

      const mid = Math.floor((start + end) / 2);
      const node = nodes[mid];
      const index = nodeToIndex.get(node)!;

      const left = buildSubtree(start, mid - 1);
      const right = buildSubtree(mid + 1, end);

      assignments.set(index, { left, right });
      return index;
    }

    const rootIndex = buildSubtree(0, nodes.length - 1);
    return { root: rootIndex, assignments };
  }

  // First pass: collect all nodes
  collectNodes(root);

  // Second pass: update sibling and child IDs
  for (const [node, index] of nodeToIndex) {
    const sortedChildren = getSortedChildren(node);
    if (sortedChildren.length > 0) {
      const { root: childRoot, assignments } = buildSiblingTree(sortedChildren);

      // Update child ID (mutate in place to preserve object identity)
      entries[index] = { ...entries[index], childId: childRoot };

      // Update sibling IDs for all children
      for (const [childIndex, { left, right }] of assignments) {
        entries[childIndex] = {
          ...entries[childIndex],
          leftSiblingId: left,
          rightSiblingId: right,
        };
      }
    }
  }

  return { entries, streamDataByIndex };
}

/**
 * Get sorted children of a node (CFB ordering: length first, then case-insensitive).
 */
function getSortedChildren(node: TreeNode): TreeNode[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.name.length !== b.name.length) {
      return a.name.length - b.name.length;
    }
    return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
  });
}

type MiniStreamInfo = {
  data: Uint8Array;
  miniSectorStart: number;
};

/**
 * Classify streams into mini stream (< 4096) and regular streams.
 */
function classifyStreams(
  entries: DirectoryEntryData[],
  streamDataByIndex: Map<number, Uint8Array>
): {
  miniStream: Uint8Array;
  miniStreamMap: Map<number, MiniStreamInfo>;
  regularStreamList: Array<{ index: number; data: Uint8Array }>;
} {
  const miniChunks: Uint8Array[] = [];
  const miniStreamMap = new Map<number, MiniStreamInfo>();
  const regularStreamList: Array<{ index: number; data: Uint8Array }> = [];
  let miniOffset = 0;

  for (let i = 0; i < entries.length; i++) {
    const data = streamDataByIndex.get(i);
    if (!data) continue;

    // Empty streams don't need sector allocation
    if (data.length === 0) {
      // Will use ENDOFCHAIN as startingSector (set by default in flattenTree)
      continue;
    }

    if (data.length < MINI_STREAM_CUTOFF) {
      // Small stream goes to mini stream
      const miniSectorStart = Math.floor(miniOffset / MINI_SECTOR_SIZE);
      const paddedSize = Math.ceil(data.length / MINI_SECTOR_SIZE) * MINI_SECTOR_SIZE;

      const paddedData = new Uint8Array(paddedSize);
      paddedData.set(data);
      miniChunks.push(paddedData);

      miniStreamMap.set(i, { data, miniSectorStart });
      miniOffset += paddedSize;
    } else {
      // Large stream
      regularStreamList.push({ index: i, data });
    }
  }

  // Concatenate mini stream chunks
  const totalMiniSize = miniChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const miniStream = new Uint8Array(totalMiniSize);
  let offset = 0;
  for (const chunk of miniChunks) {
    miniStream.set(chunk, offset);
    offset += chunk.length;
  }

  return { miniStream, miniStreamMap, regularStreamList };
}

/**
 * Build MiniFAT for mini stream.
 */
function buildMiniFat(miniStreamMap: Map<number, MiniStreamInfo>, miniStreamSize: number): Uint32Array {
  const miniSectorCount = Math.ceil(miniStreamSize / MINI_SECTOR_SIZE);
  const miniFat = new Uint32Array(miniSectorCount);
  miniFat.fill(FREESECT);

  for (const { data, miniSectorStart } of miniStreamMap.values()) {
    const sectorCount = Math.ceil(data.length / MINI_SECTOR_SIZE);

    for (let i = 0; i < sectorCount; i++) {
      const currentSector = miniSectorStart + i;
      if (i === sectorCount - 1) {
        miniFat[currentSector] = ENDOFCHAIN;
      } else {
        miniFat[currentSector] = currentSector + 1;
      }
    }
  }

  return miniFat;
}

/**
 * Serialize MiniFAT.
 */
function serializeMiniFat(miniFat: Uint32Array, sectorSize: number): Uint8Array {
  const entriesPerSector = sectorSize / 4;
  const sectorCount = Math.ceil(miniFat.length / entriesPerSector);
  const totalSize = sectorCount * sectorSize;
  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);

  // Fill with FREESECT
  for (let i = 0; i < totalSize; i += 4) {
    view.setUint32(i, FREESECT, true);
  }

  // Write MiniFAT entries
  for (let i = 0; i < miniFat.length; i++) {
    view.setUint32(i * 4, miniFat[i], true);
  }

  return result;
}

/**
 * Pad data to sector boundary.
 */
function padToSectorBoundary(data: Uint8Array, sectorSize: number): Uint8Array {
  const paddedSize = Math.ceil(data.length / sectorSize) * sectorSize;
  if (paddedSize === data.length) {
    return data;
  }
  const result = new Uint8Array(paddedSize);
  result.set(data);
  return result;
}
