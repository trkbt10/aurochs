/**
 * @file Tests for buffer-util.ts
 */

import { readUInt32BE, readInt32BE, readUInt16BE, writeUInt32BE, writeInt32BE, concatUint8Arrays } from "./buffer-util";

describe("readUInt32BE", () => {
  it("reads zero", () => {
    expect(readUInt32BE(new Uint8Array(4), 0)).toBe(0);
  });

  it("reads max uint32", () => {
    expect(readUInt32BE(new Uint8Array([0xff, 0xff, 0xff, 0xff]), 0)).toBe(0xffffffff);
  });

  it("reads 1", () => {
    expect(readUInt32BE(new Uint8Array([0, 0, 0, 1]), 0)).toBe(1);
  });

  it("reads at non-zero offset", () => {
    const buf = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 42]);
    expect(readUInt32BE(buf, 4)).toBe(42);
  });
});

describe("writeUInt32BE", () => {
  it("round-trips with readUInt32BE", () => {
    const buf = new Uint8Array(4);
    writeUInt32BE(buf, 0xdeadbeef, 0);
    expect(readUInt32BE(buf, 0)).toBe(0xdeadbeef);
  });

  it("round-trips zero", () => {
    const buf = new Uint8Array(4);
    writeUInt32BE(buf, 0, 0);
    expect(readUInt32BE(buf, 0)).toBe(0);
  });

  it("writes at offset", () => {
    const buf = new Uint8Array(8);
    writeUInt32BE(buf, 0x12345678, 4);
    expect(readUInt32BE(buf, 4)).toBe(0x12345678);
    expect(readUInt32BE(buf, 0)).toBe(0);
  });
});

describe("readInt32BE / writeInt32BE", () => {
  it("round-trips negative value", () => {
    const buf = new Uint8Array(4);
    writeInt32BE(buf, -1, 0);
    expect(readInt32BE(buf, 0)).toBe(-1);
  });

  it("round-trips positive value", () => {
    const buf = new Uint8Array(4);
    writeInt32BE(buf, 12345, 0);
    expect(readInt32BE(buf, 0)).toBe(12345);
  });

  it("round-trips INT32_MIN", () => {
    const buf = new Uint8Array(4);
    writeInt32BE(buf, -2147483648, 0);
    expect(readInt32BE(buf, 0)).toBe(-2147483648);
  });

  it("round-trips INT32_MAX", () => {
    const buf = new Uint8Array(4);
    writeInt32BE(buf, 2147483647, 0);
    expect(readInt32BE(buf, 0)).toBe(2147483647);
  });
});

describe("readUInt16BE", () => {
  it("reads 256", () => {
    expect(readUInt16BE(new Uint8Array([0x01, 0x00]), 0)).toBe(256);
  });

  it("reads 1", () => {
    expect(readUInt16BE(new Uint8Array([0x00, 0x01]), 0)).toBe(1);
  });

  it("reads max uint16", () => {
    expect(readUInt16BE(new Uint8Array([0xff, 0xff]), 0)).toBe(65535);
  });

  it("reads zero", () => {
    expect(readUInt16BE(new Uint8Array([0, 0]), 0)).toBe(0);
  });

  it("reads at offset", () => {
    expect(readUInt16BE(new Uint8Array([0, 0, 0x02, 0x00]), 2)).toBe(512);
  });
});

describe("concatUint8Arrays", () => {
  it("joins two arrays", () => {
    expect(concatUint8Arrays([new Uint8Array([1, 2]), new Uint8Array([3])])).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("returns empty for no arrays", () => {
    expect(concatUint8Arrays([])).toEqual(new Uint8Array(0));
  });

  it("returns copy for single array", () => {
    const a = new Uint8Array([42]);
    const result = concatUint8Arrays([a]);
    expect(result).toEqual(new Uint8Array([42]));
  });

  it("joins three arrays", () => {
    expect(concatUint8Arrays([new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])]))
      .toEqual(new Uint8Array([1, 2, 3]));
  });

  it("handles arrays with empty entries", () => {
    expect(concatUint8Arrays([new Uint8Array(0), new Uint8Array([5]), new Uint8Array(0)]))
      .toEqual(new Uint8Array([5]));
  });
});
