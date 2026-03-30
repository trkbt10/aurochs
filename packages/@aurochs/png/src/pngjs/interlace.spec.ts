/**
 * @file Tests for interlace.ts
 */

import { getImagePasses, getInterlaceIterator } from "./interlace";

describe("getImagePasses", () => {
  it("returns 7 passes for 8x8", () => {
    expect(getImagePasses(8, 8).length).toBe(7);
  });

  it("total pixels for 8x8 equals 64", () => {
    expect(getImagePasses(8, 8).reduce((s, p) => s + p.width * p.height, 0)).toBe(64);
  });

  it("1x1 has 1 pass with 1x1", () => {
    const passes = getImagePasses(1, 1);
    expect(passes.length).toBe(1);
    expect(passes[0]).toEqual({ width: 1, height: 1, index: 0 });
  });

  it("2x2 total equals 4", () => {
    expect(getImagePasses(2, 2).reduce((s, p) => s + p.width * p.height, 0)).toBe(4);
  });

  it("16x16 total equals 256", () => {
    expect(getImagePasses(16, 16).reduce((s, p) => s + p.width * p.height, 0)).toBe(256);
  });

  it("non-multiple-of-8 width/height still sums correctly (7x5)", () => {
    expect(getImagePasses(7, 5).reduce((s, p) => s + p.width * p.height, 0)).toBe(35);
  });

  it("pass indices are ascending", () => {
    const passes = getImagePasses(8, 8);
    for (const i of Array.from({ length: passes.length - 1 }, (_, j) => j)) {
      expect(passes[i + 1].index).toBeGreaterThan(passes[i].index);
    }
  });
});

describe("getInterlaceIterator", () => {
  it("produces 64 unique offsets for 8x8", () => {
    const iter = getInterlaceIterator(8);
    const offsets = new Set<number>();
    for (const pass of getImagePasses(8, 8)) {
      for (const y of Array.from({ length: pass.height }, (_, i) => i)) {
        for (const x of Array.from({ length: pass.width }, (_, i) => i)) {
          offsets.add(iter(x, y, pass.index));
        }
      }
    }
    expect(offsets.size).toBe(64);
  });

  it("all offsets are multiples of 4 (RGBA stride)", () => {
    const iter = getInterlaceIterator(8);
    for (const pass of getImagePasses(8, 8)) {
      for (const y of Array.from({ length: pass.height }, (_, i) => i)) {
        for (const x of Array.from({ length: pass.width }, (_, i) => i)) {
          expect(iter(x, y, pass.index) % 4).toBe(0);
        }
      }
    }
  });

  it("offsets fit within buffer bounds for 4x4", () => {
    const w = 4;
    const h = 4;
    const maxOffset = w * h * 4;
    const iter = getInterlaceIterator(w);
    for (const pass of getImagePasses(w, h)) {
      for (const y of Array.from({ length: pass.height }, (_, i) => i)) {
        for (const x of Array.from({ length: pass.width }, (_, i) => i)) {
          const offset = iter(x, y, pass.index);
          expect(offset).toBeGreaterThanOrEqual(0);
          expect(offset).toBeLessThan(maxOffset);
        }
      }
    }
  });
});
