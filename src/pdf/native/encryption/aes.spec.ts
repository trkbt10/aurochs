/**
 * @file src/pdf/native/encryption/aes.spec.ts
 */

import { createCipheriv, createDecipheriv } from "node:crypto";
import {
  aes128CbcDecryptNoUnpad,
  aes128CbcDecryptPkcs7,
  aes128CbcEncryptNoPadWithIv,
  aes128ExpandKeyForTest,
  aes256CbcDecryptNoPadWithIv,
  aes256CbcDecryptNoUnpad,
  aes256CbcDecryptPkcs7,
  aesSBoxByteForTest,
} from "./aes";

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
  it("has expected S-box values for 0x0c..0x0f", () => {
    expect(aesSBoxByteForTest(0x0c)).toBe(0xfe);
    expect(aesSBoxByteForTest(0x0d)).toBe(0xd7);
    expect(aesSBoxByteForTest(0x0e)).toBe(0xab);
    expect(aesSBoxByteForTest(0x0f)).toBe(0x76);
  });

  it("matches AES-128 key schedule known vectors (first 2 rounds)", () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f");
    const expanded = aes128ExpandKeyForTest(key);
    expect(toHex(expanded.subarray(0, 32))).toBe(
      "000102030405060708090a0b0c0d0e0f" +
      "d6aa74fdd2af72fadaa678f1d6ab76fe"
    );
  });

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

  it("matches node:crypto AES-128-CBC for encrypt (no padding)", () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f");
    const iv = fromHex("0f0e0d0c0b0a09080706050403020100");
    const plaintext = fromHex(
      "00112233445566778899aabbccddeeff" +
      "ffeeddccbbaa99887766554433221100",
    );

    const cipher = createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
    cipher.setAutoPadding(false);
    const expectedCiphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);

    const oursCiphertext = aes128CbcEncryptNoPadWithIv(key, iv, plaintext);
    expect(toHex(oursCiphertext)).toBe(expectedCiphertext.toString("hex"));
  });
});

describe("aes256Cbc* (PKCS#7)", () => {
  it("matches node:crypto AES-256-CBC for encrypt/decrypt", () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    const iv = fromHex("0f0e0d0c0b0a09080706050403020100");
    const plaintext = new TextEncoder().encode("hello aes-256-cbc pkcs7");

    const cipher = createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
    const expectedCiphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);

    const payload = new Uint8Array(16 + expectedCiphertext.length);
    payload.set(iv, 0);
    payload.set(expectedCiphertext, 16);

    const oursPadded = aes256CbcDecryptNoUnpad(key, payload);
    const decipherPadded = createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
    decipherPadded.setAutoPadding(false);
    const expectedPadded = Buffer.concat([decipherPadded.update(expectedCiphertext), decipherPadded.final()]);
    expect(toHex(oursPadded)).toBe(expectedPadded.toString("hex"));

    const oursPlain = aes256CbcDecryptPkcs7(key, payload);
    expect(oursPlain).toEqual(plaintext);

    const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
    const expectedPlain = Buffer.concat([decipher.update(expectedCiphertext), decipher.final()]);
    expect(toHex(oursPlain)).toBe(expectedPlain.toString("hex"));
  });

  it("supports NoPadding CBC decrypt with explicit IV", () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    const iv = fromHex("00000000000000000000000000000000");
    const plaintext = fromHex(
      "00112233445566778899aabbccddeeff" +
      "ffeeddccbbaa99887766554433221100",
    );

    const cipher = createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
    cipher.setAutoPadding(false);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);

    const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
    decipher.setAutoPadding(false);
    const expectedPlain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    const oursPlain = aes256CbcDecryptNoPadWithIv(key, iv, new Uint8Array(ciphertext));
    expect(toHex(oursPlain)).toBe(expectedPlain.toString("hex"));
  });
});
