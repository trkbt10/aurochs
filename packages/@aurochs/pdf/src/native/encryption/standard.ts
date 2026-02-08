/**
 * @file src/pdf/native/encryption/standard.ts
 */

import type { PdfDict, PdfObject, PdfString } from "../core/types";
import { decodePdfStringBytes } from "../core/encoding";
import { concatBytes, int32le, bytesEqual, objKeySalt } from "./bytes";
import { md5 } from "./md5";
import { rc4 } from "./rc4";
import { aes128CbcDecryptPkcs7, aes256CbcDecryptNoPadWithIv, aes256CbcDecryptPkcs7 } from "./aes";
import { sha256 } from "./sha256";
import { computeR6HardenedHash } from "./r6-hash";
import { saslprep } from "./saslprep";

export type PdfDecrypter = Readonly<{
  decryptBytes: (args: {
    objNum: number;
    gen: number;
    bytes: Uint8Array;
    options: Readonly<{ kind: "string" | "stream" | "embeddedFile"; cryptFilterName?: string }> | null;
  }) => Uint8Array;
}>;

type DecryptBytesOptions = Parameters<PdfDecrypter["decryptBytes"]>[0]["options"];

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

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asBool(obj: PdfObject | undefined): boolean | null {
  return obj?.type === "bool" ? obj.value : null;
}

function asNameOrString(obj: PdfObject | undefined): string | null {
  if (!obj) {return null;}
  if (obj.type === "name") {return obj.value;}
  if (obj.type === "string") {return obj.text;}
  return null;
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

function encodePasswordBytesR5(password: string): Uint8Array {
  const prepared = saslprep(password);
  const raw = new TextEncoder().encode(prepared);
  return raw.subarray(0, Math.min(raw.length, 127));
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
  readonly encryptMetadata: boolean;
}): Uint8Array {
  function buildSeed(args: {
    readonly password32: Uint8Array;
    readonly o: Uint8Array;
    readonly p: number;
    readonly id0: Uint8Array;
    readonly encryptMetadata: boolean;
  }): Uint8Array {
    if (args.encryptMetadata) {
      return concatBytes(args.password32, args.o, int32le(args.p), args.id0);
    }
    return concatBytes(args.password32, args.o, int32le(args.p), args.id0, int32le(-1));
  }

  const seed = buildSeed(args);
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
  readonly encryptMetadata: boolean;
}): { ok: true; fileKey: Uint8Array } | { ok: false } {
  const password32 = padPassword32(encodePasswordBytes(args.password));
  const fileKey = computeFileKeyR3({
    password32,
    o: args.o,
    p: args.p,
    id0: args.id0,
    keyLengthBytes: args.keyLengthBytes,
    encryptMetadata: args.encryptMetadata,
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
  readonly encryptMetadata: boolean;
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
    encryptMetadata: args.encryptMetadata,
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

const AES_SALT = new Uint8Array([0x73, 0x41, 0x6c, 0x54]); // "sAlT"
function deriveObjectKeyAesV2(fileKey: Uint8Array, objNum: number, gen: number): Uint8Array {
  const salt = objKeySalt(objNum, gen);
  const digest = md5(concatBytes(fileKey, salt, AES_SALT));
  const n = Math.min(fileKey.length + 5, 16);
  return digest.slice(0, n);
}

type CryptMethod = "None" | "V2" | "AESV2" | "AESV3";
type CryptFilter = Readonly<{ method: CryptMethod }>;

function parseCryptFilterMethod(dict: PdfDict): CryptMethod | null {
  const cfm = asName(dictGet(dict, "CFM"));
  if (!cfm) {return null;}
  if (cfm === "None") {return "None";}
  if (cfm === "V2") {return "V2";}
  if (cfm === "AESV2") {return "AESV2";}
  if (cfm === "AESV3") {return "AESV3";}
  return null;
}

function parseCryptFilters(encryptDict: PdfDict): {
  readonly strF: string;
  readonly stmF: string;
  readonly eff: string | null;
  readonly filters: ReadonlyMap<string, CryptFilter>;
} {
  const cf = asDict(dictGet(encryptDict, "CF"));
  if (!cf) {throw new Error("Invalid encryption dictionary for V=4/5: /CF is missing");}

  const strF = asNameOrString(dictGet(encryptDict, "StrF"));
  const stmF = asNameOrString(dictGet(encryptDict, "StmF"));
  if (!strF || !stmF) {throw new Error("Invalid encryption dictionary for V=4/5: /StrF or /StmF is missing");}

  const eff = asNameOrString(dictGet(encryptDict, "EFF"));

  const out = new Map<string, CryptFilter>();
  for (const [name, value] of cf.map.entries()) {
    const d = asDict(value);
    if (!d) {continue;}
    const method = parseCryptFilterMethod(d);
    if (!method) {continue;}
    out.set(name, { method });
  }

  return { strF, stmF, eff, filters: out };
}

function resolveCryptFilter(filters: ReadonlyMap<string, CryptFilter>, name: string): CryptFilter {
  if (name === "Identity") {return { method: "None" };}
  const found = filters.get(name);
  if (!found) {throw new Error(`Unknown crypt filter: ${name}`);}
  return found;
}











/** Create a decrypter for the PDF Standard Security Handler. */
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
  const encryptMetadata = asBool(dictGet(args.encryptDict, "EncryptMetadata")) ?? true;

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
      decryptBytes: ({ objNum, gen, bytes }) => rc4(deriveObjectKeyRc4(fileKey, objNum, gen), bytes),
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
      encryptMetadata,
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
        encryptMetadata,
      });
    })();

    if (!fileKey) {
      const preview = decodePdfStringBytes(u.slice(0, 8));
      throw new Error(`Invalid password for encrypted PDF (U starts with ${JSON.stringify(preview)})`);
    }

    return {
      decryptBytes: ({ objNum, gen, bytes }) => rc4(deriveObjectKeyRc4(fileKey, objNum, gen), bytes),
    };
  }

  if (v === 4 && r === 4) {
    const keyLengthBytes = lengthBits != null ? Math.trunc(lengthBits / 8) : 16;
    if (keyLengthBytes < 5 || keyLengthBytes > 16) {
      throw new Error(`Unsupported key length for V=4/R=4: ${keyLengthBytes} bytes`);
    }

    const cf = parseCryptFilters(args.encryptDict);
    const strFilter = resolveCryptFilter(cf.filters, cf.strF);
    const stmFilter = resolveCryptFilter(cf.filters, cf.stmF);
    const hasAes = strFilter.method === "AESV2" || stmFilter.method === "AESV2";
    if (hasAes && keyLengthBytes !== 16) {
      throw new Error(`AESV2 requires /Length 128 (got ${keyLengthBytes * 8})`);
    }

    const asUser = isValidUserPasswordR3({
      password: args.password,
      o,
      u,
      p: pv,
      id0: args.fileId0,
      keyLengthBytes,
      encryptMetadata,
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
        encryptMetadata,
      });
    })();

    if (!fileKey) {
      const preview = decodePdfStringBytes(u.slice(0, 8));
      throw new Error(`Invalid password for encrypted PDF (U starts with ${JSON.stringify(preview)})`);
    }

    return {
      decryptBytes: ({ objNum, gen, bytes, options }: { objNum: number; gen: number; bytes: Uint8Array; options: DecryptBytesOptions }) => {
        if (!options) {throw new Error("decrypt options are required for V=4/R=4");}
        void objNum;
        void gen;

        const kind = options.kind;
        if (kind !== "string" && kind !== "stream" && kind !== "embeddedFile") {throw new Error("Invalid decrypt kind");}

        const filterName = options.cryptFilterName ?? (kind === "string" ? cf.strF : kind === "embeddedFile" ? (cf.eff ?? cf.stmF) : cf.stmF);
        const filter = resolveCryptFilter(cf.filters, filterName);

        switch (filter.method) {
          case "None":
            return bytes;
          case "V2":
            return rc4(deriveObjectKeyRc4(fileKey, objNum, gen), bytes);
          case "AESV2": {
            const key = deriveObjectKeyAesV2(fileKey, objNum, gen);
            if (key.length !== 16) {throw new Error(`AESV2 object key must be 16 bytes (got ${key.length})`);}
            return aes128CbcDecryptPkcs7(key, bytes);
          }
          case "AESV3":
            throw new Error("AESV3 crypt filters are not supported for V=4/R=4");
          default: {
            const exhaustive: never = filter.method;
            throw new Error(`Unsupported crypt filter method: ${String(exhaustive)}`);
          }
        }
      },
    };
  }

  if (v === 5 && r === 5) {
    const keyLengthBytes = lengthBits != null ? Math.trunc(lengthBits / 8) : 32;
    if (keyLengthBytes !== 32) {
      throw new Error(`Unsupported key length for V=5/R=5: ${keyLengthBytes} bytes`);
    }

    const cf = parseCryptFilters(args.encryptDict);
    const strFilter = resolveCryptFilter(cf.filters, cf.strF);
    const stmFilter = resolveCryptFilter(cf.filters, cf.stmF);
    const hasAesV3 = strFilter.method === "AESV3" || stmFilter.method === "AESV3";
    if (!hasAesV3) {
      throw new Error("V=5/R=5 requires AESV3 for strings/streams");
    }

    const oe = asString(dictGet(args.encryptDict, "OE"))?.bytes;
    const ue = asString(dictGet(args.encryptDict, "UE"))?.bytes;
    if (!oe || !ue) {
      throw new Error("Invalid encryption dictionary for V=5/R=5 (missing /OE or /UE)");
    }

    const uEntry = u;
    const oEntry = o;
    if (uEntry.length !== 48 || oEntry.length !== 48) {
      throw new Error(`Invalid encryption dictionary for V=5/R=5 (expected /U and /O to be 48 bytes)`);
    }
    if (oe.length !== 32 || ue.length !== 32) {
      throw new Error(`Invalid encryption dictionary for V=5/R=5 (expected /OE and /UE to be 32 bytes)`);
    }

    const userHash = uEntry.subarray(0, 32);
    const userValidationSalt = uEntry.subarray(32, 40);
    const userKeySalt = uEntry.subarray(40, 48);

    const ownerHash = oEntry.subarray(0, 32);
    const ownerValidationSalt = oEntry.subarray(32, 40);
    const ownerKeySalt = oEntry.subarray(40, 48);

    const iv0 = new Uint8Array(16); // all zeros

    const asUser = (() => {
      const passwordBytes = encodePasswordBytesR5(args.password);
      const candidate = sha256(concatBytes(passwordBytes, userValidationSalt));
      if (!bytesEqual(candidate, userHash)) {return { ok: false as const };}
      const key = sha256(concatBytes(passwordBytes, userKeySalt));
      const fileKey = aes256CbcDecryptNoPadWithIv(key, iv0, ue);
      if (fileKey.length !== 32) {throw new Error(`Invalid decrypted file key length: ${fileKey.length}`);}
      return { ok: true as const, fileKey };
    })();

    const fileKey = (() => {
      if (asUser.ok) {return asUser.fileKey;}

      const passwordBytes = encodePasswordBytesR5(args.password);
      const candidate = sha256(concatBytes(passwordBytes, ownerValidationSalt, uEntry));
      if (!bytesEqual(candidate, ownerHash)) {return null;}
      const key = sha256(concatBytes(passwordBytes, ownerKeySalt, uEntry));
      const fileKey = aes256CbcDecryptNoPadWithIv(key, iv0, oe);
      return fileKey.length === 32 ? fileKey : null;
    })();

    if (!fileKey) {
      const preview = decodePdfStringBytes(uEntry.slice(0, 8));
      throw new Error(`Invalid password for encrypted PDF (U starts with ${JSON.stringify(preview)})`);
    }

    return {
      decryptBytes: ({ objNum, gen, bytes, options }: { objNum: number; gen: number; bytes: Uint8Array; options: DecryptBytesOptions }) => {
        if (!options) {throw new Error("decrypt options are required for V=5/R=5");}
        void objNum;
        void gen;

        const kind = options.kind;
        if (kind !== "string" && kind !== "stream" && kind !== "embeddedFile") {throw new Error("Invalid decrypt kind");}

        const filterName = options.cryptFilterName ?? (kind === "string" ? cf.strF : kind === "embeddedFile" ? (cf.eff ?? cf.stmF) : cf.stmF);
        const filter = resolveCryptFilter(cf.filters, filterName);

        switch (filter.method) {
          case "None":
            return bytes;
          case "AESV3":
            return aes256CbcDecryptPkcs7(fileKey, bytes);
          case "V2":
          case "AESV2":
            throw new Error(`Unexpected crypt filter method for V=5/R=5: ${filter.method}`);
          default: {
            const exhaustive: never = filter.method;
            throw new Error(`Unsupported crypt filter method: ${String(exhaustive)}`);
          }
        }
      },
    };
  }

  if (v === 5 && r === 6) {
    const keyLengthBytes = lengthBits != null ? Math.trunc(lengthBits / 8) : 32;
    if (keyLengthBytes !== 32) {
      throw new Error(`Unsupported key length for V=5/R=6: ${keyLengthBytes} bytes`);
    }

    const cf = parseCryptFilters(args.encryptDict);
    const strFilter = resolveCryptFilter(cf.filters, cf.strF);
    const stmFilter = resolveCryptFilter(cf.filters, cf.stmF);
    const hasAesV3 = strFilter.method === "AESV3" || stmFilter.method === "AESV3";
    if (!hasAesV3) {
      throw new Error("V=5/R=6 requires AESV3 for strings/streams");
    }

    const oe = asString(dictGet(args.encryptDict, "OE"))?.bytes;
    const ue = asString(dictGet(args.encryptDict, "UE"))?.bytes;
    if (!oe || !ue) {
      throw new Error("Invalid encryption dictionary for V=5/R=6 (missing /OE or /UE)");
    }

    const uEntry = u;
    const oEntry = o;
    if (uEntry.length !== 48 || oEntry.length !== 48) {
      throw new Error(`Invalid encryption dictionary for V=5/R=6 (expected /U and /O to be 48 bytes)`);
    }
    if (oe.length !== 32 || ue.length !== 32) {
      throw new Error(`Invalid encryption dictionary for V=5/R=6 (expected /OE and /UE to be 32 bytes)`);
    }

    const userHash = uEntry.subarray(0, 32);
    const userValidationSalt = uEntry.subarray(32, 40);
    const userKeySalt = uEntry.subarray(40, 48);

    const ownerHash = oEntry.subarray(0, 32);
    const ownerValidationSalt = oEntry.subarray(32, 40);
    const ownerKeySalt = oEntry.subarray(40, 48);

    const iv0 = new Uint8Array(16); // all zeros
    const passwordBytes = encodePasswordBytesR5(args.password);

    const asUser = (() => {
      const candidate = computeR6HardenedHash({ passwordBytes, salt: userValidationSalt });
      if (!bytesEqual(candidate, userHash)) {return { ok: false as const };}
      const key = computeR6HardenedHash({ passwordBytes, salt: userKeySalt });
      const fileKey = aes256CbcDecryptNoPadWithIv(key, iv0, ue);
      if (fileKey.length !== 32) {throw new Error(`Invalid decrypted file key length: ${fileKey.length}`);}
      return { ok: true as const, fileKey };
    })();

    const fileKey = (() => {
      if (asUser.ok) {return asUser.fileKey;}

      const candidate = computeR6HardenedHash({ passwordBytes, salt: ownerValidationSalt, userKey: uEntry });
      if (!bytesEqual(candidate, ownerHash)) {return null;}
      const key = computeR6HardenedHash({ passwordBytes, salt: ownerKeySalt, userKey: uEntry });
      const fk = aes256CbcDecryptNoPadWithIv(key, iv0, oe);
      return fk.length === 32 ? fk : null;
    })();

    if (!fileKey) {
      const preview = decodePdfStringBytes(uEntry.slice(0, 8));
      throw new Error(`Invalid password for encrypted PDF (U starts with ${JSON.stringify(preview)})`);
    }

    return {
      decryptBytes: ({ objNum, gen, bytes, options }: { objNum: number; gen: number; bytes: Uint8Array; options: DecryptBytesOptions }) => {
        if (!options) {throw new Error("decrypt options are required for V=5/R=6");}
        void objNum;
        void gen;

        const kind = options.kind;
        if (kind !== "string" && kind !== "stream" && kind !== "embeddedFile") {throw new Error("Invalid decrypt kind");}

        const filterName = options.cryptFilterName ?? (kind === "string" ? cf.strF : kind === "embeddedFile" ? (cf.eff ?? cf.stmF) : cf.stmF);
        const filter = resolveCryptFilter(cf.filters, filterName);

        switch (filter.method) {
          case "None":
            return bytes;
          case "AESV3":
            return aes256CbcDecryptPkcs7(fileKey, bytes);
          case "V2":
          case "AESV2":
            throw new Error(`Unexpected crypt filter method for V=5/R=6: ${filter.method}`);
          default: {
            const exhaustive: never = filter.method;
            throw new Error(`Unsupported crypt filter method: ${String(exhaustive)}`);
          }
        }
      },
    };
  }

  throw new Error(`Unsupported Standard encryption version/revision: V=${v}, R=${r}`);
}
