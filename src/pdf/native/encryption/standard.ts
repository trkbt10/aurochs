/**
 * @file src/pdf/native/encryption/standard.ts
 */

import type { PdfDict, PdfObject, PdfString } from "../types";
import { decodePdfStringBytes } from "../encoding";
import { concatBytes, int32le, bytesEqual, objKeySalt } from "./bytes";
import { md5 } from "./md5";
import { rc4 } from "./rc4";

export type PdfDecrypter = Readonly<{
  decryptBytes: (objNum: number, gen: number, bytes: Uint8Array) => Uint8Array;
}>;

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}

function asName(obj: PdfObject | undefined): string | null {
  return obj?.type === "name" ? obj.value : null;
}

function asString(obj: PdfObject | undefined): PdfString | null {
  return obj?.type === "string" ? obj : null;
}

function encodePasswordBytes(password: string): Uint8Array {
  const bytes = new Uint8Array(password.length);
  for (let i = 0; i < password.length; i += 1) {
    const c = password.charCodeAt(i);
    if (c > 0xff) {
      throw new Error("Password must be 8-bit (PDFDocEncoding-compatible) for now");
    }
    bytes[i] = c & 0xff;
  }
  return bytes;
}

function padPassword32(passwordBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  const n = Math.min(passwordBytes.length, 32);
  out.set(passwordBytes.subarray(0, n), 0);
  if (n < 32) {out.set(PASSWORD_PADDING.subarray(0, 32 - n), n);}
  return out;
}

function computeFileKeyR2(args: {
  readonly password32: Uint8Array;
  readonly o: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): Uint8Array {
  const data = concatBytes(args.password32, args.o, int32le(args.p), args.id0);
  const digest = md5(data);
  return digest.slice(0, args.keyLengthBytes);
}

function computeUValueR2(fileKey: Uint8Array): Uint8Array {
  return rc4(fileKey, PASSWORD_PADDING);
}

function computeOwnerKeyR2(ownerPassword32: Uint8Array, keyLengthBytes: number): Uint8Array {
  const digest = md5(ownerPassword32);
  return digest.slice(0, keyLengthBytes);
}

function computeFileKeyR3(args: {
  readonly password32: Uint8Array;
  readonly o: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): Uint8Array {
  const seed = concatBytes(args.password32, args.o, int32le(args.p), args.id0);
  const state = { digest: md5(seed).slice(0, args.keyLengthBytes) };
  for (let i = 0; i < 50; i += 1) {
    state.digest = md5(state.digest).slice(0, args.keyLengthBytes);
  }
  return state.digest;
}

function xorKey(key: Uint8Array, value: number): Uint8Array {
  const out = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i += 1) {out[i] = (key[i] ?? 0) ^ (value & 0xff);}
  return out;
}

function computeUValueR3(fileKey: Uint8Array, id0: Uint8Array): Uint8Array {
  const state = { cur: md5(concatBytes(PASSWORD_PADDING, id0)) };
  state.cur = rc4(fileKey, state.cur);
  for (let i = 1; i <= 19; i += 1) {
    state.cur = rc4(xorKey(fileKey, i), state.cur);
  }
  return state.cur; // 16 bytes
}

function computeOwnerKeyR3(ownerPassword32: Uint8Array, keyLengthBytes: number): Uint8Array {
  const state = { digest: md5(ownerPassword32).slice(0, keyLengthBytes) };
  for (let i = 0; i < 50; i += 1) {
    state.digest = md5(state.digest).slice(0, keyLengthBytes);
  }
  return state.digest;
}

function isValidUserPasswordR2(args: {
  readonly password: string;
  readonly o: Uint8Array;
  readonly u: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): { ok: true; fileKey: Uint8Array } | { ok: false } {
  const password32 = padPassword32(encodePasswordBytes(args.password));
  const fileKey = computeFileKeyR2({
    password32,
    o: args.o,
    p: args.p,
    id0: args.id0,
    keyLengthBytes: args.keyLengthBytes,
  });
  const u = computeUValueR2(fileKey);
  return bytesEqual(u, args.u) ? { ok: true, fileKey } : { ok: false };
}

function isValidUserPasswordR3(args: {
  readonly password: string;
  readonly o: Uint8Array;
  readonly u: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): { ok: true; fileKey: Uint8Array } | { ok: false } {
  const password32 = padPassword32(encodePasswordBytes(args.password));
  const fileKey = computeFileKeyR3({
    password32,
    o: args.o,
    p: args.p,
    id0: args.id0,
    keyLengthBytes: args.keyLengthBytes,
  });
  const u16 = computeUValueR3(fileKey, args.id0);
  const candidate = args.u.slice(0, 16);
  return bytesEqual(u16, candidate) ? { ok: true, fileKey } : { ok: false };
}

function tryFileKeyFromOwnerPasswordR2(args: {
  readonly password: string;
  readonly o: Uint8Array;
  readonly u: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): Uint8Array | null {
  const ownerPassword32 = padPassword32(encodePasswordBytes(args.password));
  const ownerKey = computeOwnerKeyR2(ownerPassword32, args.keyLengthBytes);
  const userPassword32 = rc4(ownerKey, args.o);
  const fileKey = computeFileKeyR2({
    password32: userPassword32,
    o: args.o,
    p: args.p,
    id0: args.id0,
    keyLengthBytes: args.keyLengthBytes,
  });
  const expectedU = computeUValueR2(fileKey);
  return bytesEqual(expectedU, args.u) ? fileKey : null;
}

function tryFileKeyFromOwnerPasswordR3(args: {
  readonly password: string;
  readonly o: Uint8Array;
  readonly u: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): Uint8Array | null {
  const ownerPassword32 = padPassword32(encodePasswordBytes(args.password));
  const ownerKey = computeOwnerKeyR3(ownerPassword32, args.keyLengthBytes);
  const userPassword32 = { value: args.o };
  for (let i = 19; i >= 0; i -= 1) {
    userPassword32.value = rc4(xorKey(ownerKey, i), userPassword32.value);
  }

  const fileKey = computeFileKeyR3({
    password32: userPassword32.value,
    o: args.o,
    p: args.p,
    id0: args.id0,
    keyLengthBytes: args.keyLengthBytes,
  });
  const expectedU16 = computeUValueR3(fileKey, args.id0);
  return bytesEqual(expectedU16, args.u.slice(0, 16)) ? fileKey : null;
}

function deriveObjectKeyRc4(fileKey: Uint8Array, objNum: number, gen: number): Uint8Array {
  const salt = objKeySalt(objNum, gen);
  const digest = md5(concatBytes(fileKey, salt));
  const n = Math.min(fileKey.length + 5, 16);
  return digest.slice(0, n);
}











/** createStandardDecrypter */
export function createStandardDecrypter(args: {
  readonly encryptDict: PdfDict;
  readonly fileId0: Uint8Array;
  readonly password: string;
}): PdfDecrypter {
  const filter = asName(dictGet(args.encryptDict, "Filter"));
  if (filter !== "Standard") {
    throw new Error(`Unsupported encryption Filter: ${filter ?? "(missing)"}`);
  }

  const v = asNumber(dictGet(args.encryptDict, "V"));
  const r = asNumber(dictGet(args.encryptDict, "R"));
  const o = asString(dictGet(args.encryptDict, "O"))?.bytes;
  const u = asString(dictGet(args.encryptDict, "U"))?.bytes;
  const p = asNumber(dictGet(args.encryptDict, "P"));
  const lengthBits = asNumber(dictGet(args.encryptDict, "Length"));

  if (v == null || r == null || !o || !u || p == null) {
    const hint = [
      v == null ? "/V" : null,
      r == null ? "/R" : null,
      !o ? "/O" : null,
      !u ? "/U" : null,
      p == null ? "/P" : null,
    ].filter(Boolean).join(", ");
    throw new Error(`Invalid encryption dictionary (missing ${hint})`);
  }

  const pv = Math.trunc(p);

  if (v === 1 && r === 2) {
    const keyLengthBytes = lengthBits != null ? Math.trunc(lengthBits / 8) : 5;
    if (keyLengthBytes !== 5) {
      throw new Error(`Unsupported key length for V=1/R=2: ${keyLengthBytes} bytes`);
    }

    const asUser = isValidUserPasswordR2({
      password: args.password,
      o,
      u,
      p: pv,
      id0: args.fileId0,
      keyLengthBytes,
    });

    const fileKey = (() => {
      if (asUser.ok) {return asUser.fileKey;}
      return tryFileKeyFromOwnerPasswordR2({
        password: args.password,
        o,
        u,
        p: pv,
        id0: args.fileId0,
        keyLengthBytes,
      });
    })();

    if (!fileKey) {
      const preview = decodePdfStringBytes(u.slice(0, 8));
      throw new Error(`Invalid password for encrypted PDF (U starts with ${JSON.stringify(preview)})`);
    }

    return {
      decryptBytes: (objNum, gen, bytes) => rc4(deriveObjectKeyRc4(fileKey, objNum, gen), bytes),
    };
  }

  if (v === 2 && r === 3) {
    const keyLengthBytes = lengthBits != null ? Math.trunc(lengthBits / 8) : 5;
    if (keyLengthBytes < 5 || keyLengthBytes > 16) {
      throw new Error(`Unsupported key length for V=2/R=3: ${keyLengthBytes} bytes`);
    }

    const asUser = isValidUserPasswordR3({
      password: args.password,
      o,
      u,
      p: pv,
      id0: args.fileId0,
      keyLengthBytes,
    });

    const fileKey = (() => {
      if (asUser.ok) {return asUser.fileKey;}
      return tryFileKeyFromOwnerPasswordR3({
        password: args.password,
        o,
        u,
        p: pv,
        id0: args.fileId0,
        keyLengthBytes,
      });
    })();

    if (!fileKey) {
      const preview = decodePdfStringBytes(u.slice(0, 8));
      throw new Error(`Invalid password for encrypted PDF (U starts with ${JSON.stringify(preview)})`);
    }

    return {
      decryptBytes: (objNum, gen, bytes) => rc4(deriveObjectKeyRc4(fileKey, objNum, gen), bytes),
    };
  }

  throw new Error(`Unsupported Standard encryption version/revision: V=${v}, R=${r}`);
}
