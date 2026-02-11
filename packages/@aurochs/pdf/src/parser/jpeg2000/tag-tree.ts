/**
 * @file src/pdf/parser/jpeg2000/tag-tree.ts
 *
 * Minimal tag-tree decoder for JPEG2000 packet headers.
 */

import type { PacketBitReader } from "./packet-bit-reader";

type TagTreeNode = { value: number; low: number };

/** Tag tree structure for JPEG 2000 packet header coding. */
export type TagTree = Readonly<{
  reset(): void;
  decode(bio: PacketBitReader, leafNo: number, threshold: number): number;
}>;

/**
 * Creates a tag tree structure for JPEG 2000 packet header coding.
 *
 * Tag trees are hierarchical structures used to encode inclusion and zero-bit-plane
 * information in JPEG 2000 codestreams.
 */
export function createTagTree(width: number, height: number): TagTree {
  if (!Number.isFinite(width) || width <= 0) {throw new Error(`TagTree width must be > 0 (got ${width})`);}
  if (!Number.isFinite(height) || height <= 0) {throw new Error(`TagTree height must be > 0 (got ${height})`);}

  // Build a simple parent pyramid (row-major).
  const levelSizes: Array<{ w: number; h: number; offset: number }> = [];
  const buildState = { w: width, h: height, offset: 0 };
  while (true) {
    levelSizes.push({ w: buildState.w, h: buildState.h, offset: buildState.offset });
    buildState.offset += buildState.w * buildState.h;
    if (buildState.w === 1 && buildState.h === 1) {break;}
    buildState.w = Math.ceil(buildState.w / 2);
    buildState.h = Math.ceil(buildState.h / 2);
  }

  const nodeCount = buildState.offset;
  const parents = new Int32Array(nodeCount);
  parents.fill(-1);
  const nodes: TagTreeNode[] = Array.from({ length: nodeCount }, () => ({ value: 0x7fffffff, low: 0 }));

  // Link parents.
  for (let level = 0; level < levelSizes.length - 1; level += 1) {
    const cur = levelSizes[level]!;
    const next = levelSizes[level + 1]!;
    for (let y = 0; y < cur.h; y += 1) {
      for (let x = 0; x < cur.w; x += 1) {
        const idx = cur.offset + y * cur.w + x;
        const px = Math.floor(x / 2);
        const py = Math.floor(y / 2);
        const pidx = next.offset + py * next.w + px;
        parents[idx] = pidx;
      }
    }
  }

  const leafOffset = levelSizes[0]!.offset;

  function reset(): void {
    for (const n of nodes) {
      n.value = 0x7fffffff;
      n.low = 0;
    }
  }

  function decode(bio: PacketBitReader, leafNo: number, threshold: number): number {
    if (!bio) {throw new Error("bio is required");}
    if (!Number.isFinite(leafNo) || leafNo < 0 || leafNo >= width * height) {
      throw new Error(`TagTree: invalid leafNo=${leafNo}`);
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new Error(`TagTree: invalid threshold=${threshold}`);
    }

    // Build path from leaf to root.
    const stack: number[] = [];
    const pathState = { idx: leafOffset + leafNo };
    while (pathState.idx >= 0) {
      stack.push(pathState.idx);
      const parent = parents[pathState.idx] ?? -1;
      if (parent < 0) {break;}
      pathState.idx = parent;
    }

    const decodeState = { low: 0 };
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const nidx = stack[i]!;
      const node = nodes[nidx]!;
      if (decodeState.low > node.low) {node.low = decodeState.low;}

      while (node.low <= threshold && node.low < node.value) {
        const bit = bio.readBit();
        if (bit === 0) {
          node.low += 1;
        } else {
          node.value = node.low;
        }
      }
      decodeState.low = node.low;
    }

    return nodes[leafOffset + leafNo]!.value;
  }

  return {
    reset,
    decode,
  };
}
