/**
 * @file Unicode string parser tests
 */

import { parseUnicodeString } from "./unicode-string";

describe("xls/biff/strings/unicode-string", () => {
  it("parses compressed strings", () => {
    const data = new Uint8Array([0x03, 0x00, 0x00, 0x41, 0x42, 0x43]);
    const parsed = parseUnicodeString(data);
    expect(parsed.text).toBe("ABC");
    expect(parsed.highByte).toBe(false);
    expect(parsed.byteLength).toBe(data.length);
  });

  it("parses UTF-16LE strings", () => {
    // "いう" => U+3044 U+3046
    const data = new Uint8Array([0x02, 0x00, 0x01, 0x44, 0x30, 0x46, 0x30]);
    const parsed = parseUnicodeString(data);
    expect(parsed.text).toBe("いう");
    expect(parsed.highByte).toBe(true);
    expect(parsed.byteLength).toBe(data.length);
  });
});

