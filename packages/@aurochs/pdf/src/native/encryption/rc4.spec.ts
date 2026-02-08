/**
 * @file src/pdf/native/encryption/rc4.spec.ts
 */

import { rc4 } from "./rc4";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

describe("rc4", () => {
  it("matches a known vector (Key/Plaintext)", () => {
    const key = new TextEncoder().encode("Key");
    const pt = new TextEncoder().encode("Plaintext");
    const ct = rc4(key, pt);
    expect(hex(ct)).toBe("BBF316E8D940AF0AD3");
  });
});
