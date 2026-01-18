/**
 * @file src/pdf/native/encryption/aes.spec.ts
 */

import { createCipheriv, createDecipheriv } from "node:crypto";
import { aes128CbcDecryptNoUnpad, aes128CbcDecryptPkcs7 } from "./aes";

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {throw new Error("hex must have even length");}
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("aes128Cbc* (PKCS#7)", () => {
  it("matches node:crypto AES-128-CBC for encrypt/decrypt", () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f");
    const iv = fromHex("0f0e0d0c0b0a09080706050403020100");
    const plaintext = new TextEncoder().encode("hello aes-cbc pkcs7");

    const cipher = createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
    const expectedCiphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);

    const payload = new Uint8Array(16 + expectedCiphertext.length);
    payload.set(iv, 0);
    payload.set(expectedCiphertext, 16);

    const oursPadded = aes128CbcDecryptNoUnpad(key, payload);
    const decipherPadded = createDecipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
    decipherPadded.setAutoPadding(false);
    const expectedPadded = Buffer.concat([decipherPadded.update(expectedCiphertext), decipherPadded.final()]);
    expect(toHex(oursPadded)).toBe(expectedPadded.toString("hex"));

    const oursPlain = aes128CbcDecryptPkcs7(key, payload);
    expect(oursPlain).toEqual(plaintext);

    const decipher = createDecipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
    const expectedPlain = Buffer.concat([decipher.update(expectedCiphertext), decipher.final()]);
    expect(toHex(oursPlain)).toBe(expectedPlain.toString("hex"));
  });
});
