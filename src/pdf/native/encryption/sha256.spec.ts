/**
 * @file src/pdf/native/encryption/sha256.spec.ts
 */

import { sha256 } from "./sha256";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("sha256()", () => {
  it("matches known vectors (empty, abc)", () => {
    expect(toHex(sha256(new Uint8Array([])))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(toHex(sha256(new TextEncoder().encode("abc")))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches known vector (The quick brown fox...)", () => {
    expect(toHex(sha256(new TextEncoder().encode("The quick brown fox jumps over the lazy dog")))).toBe(
      "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    );
  });
});

