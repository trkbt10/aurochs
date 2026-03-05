/**
 * @file Encode Filters Tests
 */

import { unzlibSync } from "fflate";
import { encodeFlate, encodeAscii85, encodeAsciiHex } from "./encode-filters";

const decoder = new TextDecoder();
const toText = (bytes: Uint8Array) => decoder.decode(bytes);

describe("encodeFlate", () => {
  it("compresses data that can be decompressed", () => {
    const original = new TextEncoder().encode("Hello, World!");
    const compressed = encodeFlate(original);
    const decompressed = unzlibSync(compressed);
    expect(toText(decompressed)).toBe("Hello, World!");
  });

  it("handles empty input", () => {
    const original = new Uint8Array([]);
    const compressed = encodeFlate(original);
    const decompressed = unzlibSync(compressed);
    expect(decompressed.length).toBe(0);
  });

  it("compresses repetitive data efficiently", () => {
    const original = new Uint8Array(1000).fill(0x41); // 1000 'A's
    const compressed = encodeFlate(original);
    expect(compressed.length).toBeLessThan(original.length);
    const decompressed = unzlibSync(compressed);
    expect(decompressed).toEqual(original);
  });

  it("handles binary data", () => {
    const original = new Uint8Array([0x00, 0xff, 0x80, 0x7f, 0x01]);
    const compressed = encodeFlate(original);
    const decompressed = unzlibSync(compressed);
    expect(decompressed).toEqual(original);
  });
});

describe("encodeAscii85", () => {
  it("encodes empty data", () => {
    const result = encodeAscii85(new Uint8Array([]));
    expect(toText(result)).toBe("~>");
  });

  it("encodes 4-byte group", () => {
    // "test" -> 0x74657374 -> encoded
    const input = new TextEncoder().encode("test");
    const result = encodeAscii85(input);
    const text = toText(result);
    expect(text.endsWith("~>")).toBe(true);
    expect(text.length).toBe(7); // 5 chars + "~>"
  });

  it("encodes 4 zero bytes as 'z'", () => {
    const input = new Uint8Array([0, 0, 0, 0]);
    const result = encodeAscii85(input);
    expect(toText(result)).toBe("z~>");
  });

  it("encodes partial group (1 byte)", () => {
    const input = new Uint8Array([0x41]); // 'A'
    const result = encodeAscii85(input);
    const text = toText(result);
    expect(text.endsWith("~>")).toBe(true);
    expect(text.length).toBe(4); // 2 chars + "~>"
  });

  it("encodes partial group (2 bytes)", () => {
    const input = new Uint8Array([0x41, 0x42]); // 'AB'
    const result = encodeAscii85(input);
    const text = toText(result);
    expect(text.endsWith("~>")).toBe(true);
    expect(text.length).toBe(5); // 3 chars + "~>"
  });

  it("encodes partial group (3 bytes)", () => {
    const input = new Uint8Array([0x41, 0x42, 0x43]); // 'ABC'
    const result = encodeAscii85(input);
    const text = toText(result);
    expect(text.endsWith("~>")).toBe(true);
    expect(text.length).toBe(6); // 4 chars + "~>"
  });

  it("produces only printable ASCII characters", () => {
    const input = new Uint8Array(100);
    for (let i = 0; i < 100; i++) {
      input[i] = i;
    }
    const result = encodeAscii85(input);
    for (let i = 0; i < result.length - 2; i++) {
      // Exclude "~>" at end
      const char = result[i];
      // Valid chars: '!' (33) to 'u' (117), or 'z' (122)
      expect(
        (char >= 33 && char <= 117) || char === 122,
        `Invalid char at position ${i}: ${char}`
      ).toBe(true);
    }
  });
});

describe("encodeAsciiHex", () => {
  it("encodes empty data", () => {
    const result = encodeAsciiHex(new Uint8Array([]));
    expect(toText(result)).toBe(">");
  });

  it("encodes single byte", () => {
    const result = encodeAsciiHex(new Uint8Array([0x48]));
    expect(toText(result)).toBe("48>");
  });

  it("encodes multiple bytes", () => {
    const result = encodeAsciiHex(new Uint8Array([0x48, 0x69]));
    expect(toText(result)).toBe("4869>");
  });

  it("pads single digit with leading zero", () => {
    const result = encodeAsciiHex(new Uint8Array([0x0a]));
    expect(toText(result)).toBe("0A>");
  });

  it("encodes 0xFF correctly", () => {
    const result = encodeAsciiHex(new Uint8Array([0xff]));
    expect(toText(result)).toBe("FF>");
  });

  it("encodes 0x00 correctly", () => {
    const result = encodeAsciiHex(new Uint8Array([0x00]));
    expect(toText(result)).toBe("00>");
  });

  it("produces uppercase hex", () => {
    const result = encodeAsciiHex(new Uint8Array([0xab, 0xcd, 0xef]));
    expect(toText(result)).toBe("ABCDEF>");
  });
});
