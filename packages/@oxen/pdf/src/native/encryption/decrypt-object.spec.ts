/**
 * @file src/pdf/native/encryption/decrypt-object.spec.ts
 */

import { createCipheriv } from "node:crypto";
import type { PdfDict, PdfObject, PdfString } from "../core/types";
import { decryptPdfObject } from "./decrypt-object";
import { createStandardDecrypter } from "./standard";
import { concatBytes, int32le, objKeySalt } from "./bytes";
import { md5 } from "./md5";
import { rc4 } from "./rc4";

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function encodePasswordBytes(password: string): Uint8Array {
  const bytes = new Uint8Array(password.length);
  for (let i = 0; i < password.length; i += 1) {bytes[i] = password.charCodeAt(i) & 0xff;}
  return bytes;
}

function padPassword32(passwordBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  const n = Math.min(passwordBytes.length, 32);
  out.set(passwordBytes.subarray(0, n), 0);
  if (n < 32) {out.set(PASSWORD_PADDING.subarray(0, 32 - n), n);}
  return out;
}

function xorKey(key: Uint8Array, value: number): Uint8Array {
  const out = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i += 1) {out[i] = (key[i] ?? 0) ^ (value & 0xff);}
  return out;
}

function computeOwnerKeyR3(ownerPassword32: Uint8Array, keyLengthBytes: number): Uint8Array {
  const state = { digest: md5(ownerPassword32).slice(0, keyLengthBytes) };
  for (let i = 0; i < 50; i += 1) {state.digest = md5(state.digest).slice(0, keyLengthBytes);}
  return state.digest;
}

function computeOValueR3(ownerKey: Uint8Array, userPassword32: Uint8Array): Uint8Array {
  const state = { cur: rc4(ownerKey, userPassword32) };
  for (let i = 1; i <= 19; i += 1) {state.cur = rc4(xorKey(ownerKey, i), state.cur);}
  return state.cur;
}

function computeFileKeyR3(args: {
  readonly userPassword32: Uint8Array;
  readonly o: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): Uint8Array {
  const seed = concatBytes(args.userPassword32, args.o, int32le(args.p), args.id0);
  const state = { digest: md5(seed).slice(0, args.keyLengthBytes) };
  for (let i = 0; i < 50; i += 1) {state.digest = md5(state.digest).slice(0, args.keyLengthBytes);}
  return state.digest;
}

function computeU16R3(fileKey: Uint8Array, id0: Uint8Array): Uint8Array {
  const state = { cur: md5(concatBytes(PASSWORD_PADDING, id0)) };
  state.cur = rc4(fileKey, state.cur);
  for (let i = 1; i <= 19; i += 1) {state.cur = rc4(xorKey(fileKey, i), state.cur);}
  return state.cur;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pdfString(bytes: Uint8Array): PdfString {
  return { type: "string", bytes, text: "" };
}

function pdfDict(entries: Readonly<Record<string, PdfObject>>): PdfDict {
  return { type: "dict", map: new Map(Object.entries(entries)) };
}

function deriveObjectKeyAesV2(fileKey: Uint8Array, objNum: number, gen: number): Uint8Array {
  const aesSalt = new Uint8Array([0x73, 0x41, 0x6c, 0x54]); // "sAlT"
  const digest = md5(concatBytes(fileKey, objKeySalt(objNum, gen), aesSalt));
  return digest.slice(0, Math.min(fileKey.length + 5, 16));
}

describe("decryptPdfObject() /EFF behavior", () => {
  it("uses /EFF as the default crypt filter for /Type /EmbeddedFile streams", () => {
    const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => i));
    const p = -4;
    const keyLengthBytes = 16;

    const userPassword32 = padPassword32(encodePasswordBytes("pw"));
    const ownerPassword32 = padPassword32(encodePasswordBytes("pw"));
    const ownerKey = computeOwnerKeyR3(ownerPassword32, keyLengthBytes);
    const oBytes = computeOValueR3(ownerKey, userPassword32);
    const fileKey = computeFileKeyR3({ userPassword32, o: oBytes, p, id0, keyLengthBytes });
    const u16 = computeU16R3(fileKey, id0);
    const uBytes = new Uint8Array(32);
    uBytes.set(u16, 0);

    const encryptDict = pdfDict({
      Filter: { type: "name", value: "Standard" },
      V: { type: "number", value: 4 },
      R: { type: "number", value: 4 },
      Length: { type: "number", value: 128 },
      O: pdfString(oBytes),
      U: pdfString(uBytes),
      P: { type: "number", value: p },
      CF: pdfDict({
        StdCF: pdfDict({ CFM: { type: "name", value: "AESV2" } }),
        NoCF: pdfDict({ CFM: { type: "name", value: "None" } }),
      }),
      StmF: { type: "name", value: "NoCF" },
      StrF: { type: "name", value: "NoCF" },
      EFF: { type: "name", value: "StdCF" },
    });

    const decrypter = createStandardDecrypter({ encryptDict, fileId0: id0, password: "pw" });

    const objNum = 6;
    const gen = 0;
    const objKey = deriveObjectKeyAesV2(fileKey, objNum, gen);
    expect(objKey.length).toBe(16);

    const iv = new Uint8Array(Array.from({ length: 16 }, (_, i) => i));
    const plain = new TextEncoder().encode("embedded payload");
    const cipher = createCipheriv("aes-128-cbc", Buffer.from(objKey), Buffer.from(iv));
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain)), cipher.final()]);
    const encrypted = new Uint8Array(16 + ciphertext.length);
    encrypted.set(iv, 0);
    encrypted.set(ciphertext, 16);

    const embeddedFileStream = {
      type: "stream",
      dict: pdfDict({ Type: { type: "name", value: "EmbeddedFile" } }),
      data: encrypted,
    } as const;

    const decrypted = decryptPdfObject(embeddedFileStream, objNum, gen, decrypter);
    if (decrypted.type !== "stream") {throw new Error("expected stream");}
    expect(new TextDecoder().decode(decrypted.data)).toBe("embedded payload");
  });

  it("does not apply /EFF to ordinary streams (uses /StmF)", () => {
    const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => i));
    const p = -4;
    const keyLengthBytes = 16;

    const userPassword32 = padPassword32(encodePasswordBytes("pw"));
    const ownerPassword32 = padPassword32(encodePasswordBytes("pw"));
    const ownerKey = computeOwnerKeyR3(ownerPassword32, keyLengthBytes);
    const oBytes = computeOValueR3(ownerKey, userPassword32);
    const fileKey = computeFileKeyR3({ userPassword32, o: oBytes, p, id0, keyLengthBytes });
    const u16 = computeU16R3(fileKey, id0);
    const uBytes = new Uint8Array(32);
    uBytes.set(u16, 0);

    const encryptDict = pdfDict({
      Filter: { type: "name", value: "Standard" },
      V: { type: "number", value: 4 },
      R: { type: "number", value: 4 },
      Length: { type: "number", value: 128 },
      O: pdfString(oBytes),
      U: pdfString(uBytes),
      P: { type: "number", value: p },
      CF: pdfDict({
        StdCF: pdfDict({ CFM: { type: "name", value: "AESV2" } }),
        NoCF: pdfDict({ CFM: { type: "name", value: "None" } }),
      }),
      StmF: { type: "name", value: "NoCF" },
      StrF: { type: "name", value: "NoCF" },
      EFF: { type: "name", value: "StdCF" },
    });

    const decrypter = createStandardDecrypter({ encryptDict, fileId0: id0, password: "pw" });

    const objNum = 7;
    const gen = 0;
    const objKey = deriveObjectKeyAesV2(fileKey, objNum, gen);
    const iv = new Uint8Array(Array.from({ length: 16 }, (_, i) => 15 - i));
    const plain = new TextEncoder().encode("normal payload");
    const cipher = createCipheriv("aes-128-cbc", Buffer.from(objKey), Buffer.from(iv));
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain)), cipher.final()]);
    const encrypted = new Uint8Array(16 + ciphertext.length);
    encrypted.set(iv, 0);
    encrypted.set(ciphertext, 16);

    const normalStream = {
      type: "stream",
      dict: pdfDict({ Length: { type: "number", value: encrypted.length } }),
      data: encrypted,
    } as const;

    const decrypted = decryptPdfObject(normalStream, objNum, gen, decrypter);
    if (decrypted.type !== "stream") {throw new Error("expected stream");}
    expect(toHex(decrypted.data)).toBe(toHex(encrypted));
  });
});
