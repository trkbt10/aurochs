/**
 * @file src/pdf/parser/jpeg2000/tag-tree.ts
 *
 * Minimal tag-tree decoder for JPEG2000 packet headers.
 */

import type { PacketBitReader } from "./packet-bit-reader";

type TagTreeNode = { value: number; low: number };






export class TagTree {
  private readonly width: number;
  private readonly height: number;
  private readonly parents: Int32Array;
  private readonly nodes: TagTreeNode[];
  private readonly leafOffset: number;

  constructor(width: number, height: number) {
    if (!Number.isFinite(width) || width <= 0) {throw new Error(`TagTree width must be > 0 (got ${width})`);}
    if (!Number.isFinite(height) || height <= 0) {throw new Error(`TagTree height must be > 0 (got ${height})`);}
    this.width = width;
    this.height = height;

    // Build a simple parent pyramid (row-major).
    const levelSizes: Array<{ w: number; h: number; offset: number }> = [];
    let w = width;
    let h = height;
    let offset = 0;
    while (true) {
      levelSizes.push({ w, h, offset });
      offset += w * h;
      if (w === 1 && h === 1) {break;}
      w = Math.ceil(w / 2);
      h = Math.ceil(h / 2);
    }

    const nodeCount = offset;
    this.parents = new Int32Array(nodeCount);
    this.parents.fill(-1);
    this.nodes = Array.from({ length: nodeCount }, () => ({ value: 0x7fffffff, low: 0 }));

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
          this.parents[idx] = pidx;
        }
      }
    }

    this.leafOffset = levelSizes[0]!.offset;
  }

  reset(): void {
    for (const n of this.nodes) {
      n.value = 0x7fffffff;
      n.low = 0;
    }
  }

  decode(bio: PacketBitReader, leafNo: number, threshold: number): number {
    if (!bio) {throw new Error("bio is required");}
    if (!Number.isFinite(leafNo) || leafNo < 0 || leafNo >= this.width * this.height) {
      throw new Error(`TagTree: invalid leafNo=${leafNo}`);
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new Error(`TagTree: invalid threshold=${threshold}`);
    }

    // Build path from leaf to root.
    const stack: number[] = [];
    let idx = this.leafOffset + leafNo;
    while (idx >= 0) {
      stack.push(idx);
      const parent = this.parents[idx] ?? -1;
      if (parent < 0) {break;}
      idx = parent;
    }

    let low = 0;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const nidx = stack[i]!;
      const node = this.nodes[nidx]!;
      if (low > node.low) {node.low = low;}

      while (node.low <= threshold && node.low < node.value) {
        const bit = bio.readBit();
        if (bit === 0) {
          node.low += 1;
        } else {
          node.value = node.low;
        }
      }
      low = node.low;
    }

    return this.nodes[this.leafOffset + leafNo]!.value;
  }
}

