/**
 * @file Tests for sync-reader.ts
 */

import { createSyncReader } from "./sync-reader";

describe("createSyncReader", () => {
  it("reads exact lengths sequentially", () => {
    const reader = createSyncReader(new Uint8Array([1, 2, 3, 4, 5]));
    const chunks: Uint8Array[] = [];
    reader.read(2, (d) => chunks.push(d.slice()));
    reader.read(3, (d) => chunks.push(d.slice()));
    reader.process();
    expect(chunks[0]).toEqual(new Uint8Array([1, 2]));
    expect(chunks[1]).toEqual(new Uint8Array([3, 4, 5]));
  });

  it("reads entire buffer in one call", () => {
    const reader = createSyncReader(new Uint8Array([10, 20]));
    const chunks: Uint8Array[] = [];
    reader.read(2, (d) => chunks.push(d.slice()));
    reader.process();
    expect(chunks[0]).toEqual(new Uint8Array([10, 20]));
  });

  it("negative length means 'at most' — returns all available", () => {
    const reader = createSyncReader(new Uint8Array([1, 2, 3]));
    const chunks: Uint8Array[] = [];
    reader.read(-100, (d) => chunks.push(d.slice()));
    reader.process();
    expect(chunks[0]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("negative length returns partial when less than abs(length)", () => {
    const reader = createSyncReader(new Uint8Array([1, 2]));
    const chunks: Uint8Array[] = [];
    reader.read(-5, (d) => chunks.push(d.slice()));
    reader.process();
    expect(chunks[0].length).toBeLessThanOrEqual(5);
    expect(chunks[0]).toEqual(new Uint8Array([1, 2]));
  });

  it("callback can enqueue further reads", () => {
    const reader = createSyncReader(new Uint8Array([1, 2, 3, 4]));
    const chunks: Uint8Array[] = [];
    reader.read(2, (d) => {
      chunks.push(d.slice());
      reader.read(2, (d2) => chunks.push(d2.slice()));
    });
    reader.process();
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toEqual(new Uint8Array([1, 2]));
    expect(chunks[1]).toEqual(new Uint8Array([3, 4]));
  });

  it("throws when buffer exhausted before all reads satisfied", () => {
    const reader = createSyncReader(new Uint8Array([1]));
    reader.read(5, () => {});
    expect(() => reader.process()).toThrow("read requests waiting");
  });

  it("throws when there is trailing data after all reads", () => {
    const reader = createSyncReader(new Uint8Array([1, 2, 3]));
    reader.read(1, () => {});
    expect(() => reader.process()).toThrow("unrecognised content");
  });

  it("handles empty buffer with no reads", () => {
    const reader = createSyncReader(new Uint8Array(0));
    reader.process(); // should not throw
  });
});
