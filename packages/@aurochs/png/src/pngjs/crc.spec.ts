/**
 * @file Tests for crc.ts
 */

import { crc32 } from "./crc";

describe("crc32", () => {
  it("returns 0 for empty buffer", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("returns non-zero for single byte 0xff", () => {
    const result = crc32(new Uint8Array([0xff]));
    expect(result).not.toBe(0);
    expect(typeof result).toBe("number");
  });

  it("returns non-zero for single byte 0x00", () => {
    const result = crc32(new Uint8Array([0x00]));
    expect(result).not.toBe(0);
  });

  it("is deterministic for the same input", () => {
    const buf = new Uint8Array([0x49, 0x48, 0x44, 0x52]);
    expect(crc32(buf)).toBe(crc32(buf));
  });

  it("produces different results for different inputs", () => {
    expect(crc32(new Uint8Array([1]))).not.toBe(crc32(new Uint8Array([2])));
  });

  it("matches known CRC-32 for ASCII 'IHDR'", () => {
    const buf = new Uint8Array([0x49, 0x48, 0x44, 0x52]);
    const result = crc32(buf);
    expect((result >>> 0).toString(16)).toBe("a8a1ae0a");
  });

  it("handles large buffer (256 bytes)", () => {
    const buf = new Uint8Array(256);
    for (const i of Array.from({ length: 256 }, (_, j) => j)) {
      buf[i] = i;
    }
    const result = crc32(buf);
    expect(typeof result).toBe("number");
    expect(result).not.toBe(0);
  });

  it("is order-dependent", () => {
    const a = crc32(new Uint8Array([1, 2]));
    const b = crc32(new Uint8Array([2, 1]));
    expect(a).not.toBe(b);
  });
});
