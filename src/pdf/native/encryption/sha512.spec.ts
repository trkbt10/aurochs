/**
 * @file src/pdf/native/encryption/sha512.spec.ts
 */

import { sha384, sha512 } from "./sha512";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("sha512()/sha384()", () => {
  it("matches known vectors (empty, abc)", () => {
    expect(toHex(sha512(new Uint8Array([])))).toBe(
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce" +
      "47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    );
    expect(toHex(sha512(new TextEncoder().encode("abc")))).toBe(
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
      "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    );

    expect(toHex(sha384(new Uint8Array([])))).toBe(
      "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da" +
      "274edebfe76f65fbd51ad2f14898b95b",
    );
    expect(toHex(sha384(new TextEncoder().encode("abc")))).toBe(
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed" +
      "8086072ba1e7cc2358baeca134c825a7",
    );
  });
});

