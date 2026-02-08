/**
 * @file Short unicode string parser tests
 */

import { parseShortUnicodeString } from "./short-unicode-string";

describe("xls/biff/strings/short-unicode-string", () => {
  it("parses compressed (fHighByte=0) strings", () => {
    const payload = new Uint8Array([0x00, 0x41, 0x42, 0x43]); // grbit + "ABC"
    const parsed = parseShortUnicodeString(payload, 3);
    expect(parsed.text).toBe("ABC");
    expect(parsed.highByte).toBe(false);
    expect(parsed.byteLength).toBe(4);
  });

  it("parses UTF-16LE (fHighByte=1) strings", () => {
    const payload = new Uint8Array([
      0x01, // grbit (high byte)
      0x44,
      0x30, // "い" U+3044
      0x46,
      0x30, // "う" U+3046
    ]);
    const parsed = parseShortUnicodeString(payload, 2);
    expect(parsed.text).toBe("いう");
    expect(parsed.highByte).toBe(true);
    expect(parsed.byteLength).toBe(5);
  });

  it("throws on unsupported flags", () => {
    expect(() => parseShortUnicodeString(new Uint8Array([0x08, 0x41]), 1)).toThrow(/Unsupported/);
  });

  it("throws on truncated payload", () => {
    expect(() => parseShortUnicodeString(new Uint8Array([0x00, 0x41]), 2)).toThrow(/too short/);
  });
});
