/**
 * @file src/pdf/native/encryption/r6-hash.ts
 */

import { concatBytes } from "./bytes";
import { sha256 } from "./sha256";
import { sha384, sha512 } from "./sha512";
import { aes128CbcEncryptNoPadWithIv } from "./aes";

function mod3OfBigEndian(bytes: Uint8Array): 0 | 1 | 2 {
  let r = 0;
  for (const b of bytes) {
    r = (r * 256 + (b & 0xff)) % 3;
  }
  return r as 0 | 1 | 2;
}

function repeatBytes(data: Uint8Array, times: number): Uint8Array {
  if (times <= 0) {throw new Error(`repeat times must be positive (got ${times})`);}
  const out = new Uint8Array(data.length * times);
  for (let i = 0; i < times; i += 1) {
    out.set(data, i * data.length);
  }
  return out;
}

/**
 * Compute the hardened password hash for Standard Security Handler revision 6.
 *
 * Returns 32 bytes.
 *
 * Reference: ISO 32000-2 (Algorithm 2.B), used for validating /U and /O entries
 * and deriving keys for /UE and /OE.
 */
export function computeR6HardenedHash(args: {
  readonly passwordBytes: Uint8Array;
  readonly salt: Uint8Array; // 8 bytes
  readonly userKey?: Uint8Array; // 48 bytes (required for owner password cases)
}): Uint8Array {
  if (!args) {throw new Error("args is required");}
  if (!args.passwordBytes) {throw new Error("args.passwordBytes is required");}
  if (!args.salt) {throw new Error("args.salt is required");}
  if (args.salt.length !== 8) {throw new Error(`salt must be 8 bytes (got ${args.salt.length})`);}
  if (args.userKey && args.userKey.length !== 48) {
    throw new Error(`userKey must be 48 bytes when provided (got ${args.userKey.length})`);
  }

  const u = args.userKey ?? new Uint8Array(0);

  let k: Uint8Array = sha256(concatBytes(args.passwordBytes, args.salt, u));
  let e: Uint8Array = new Uint8Array(0);

  for (let i = 0; ; i += 1) {
    const k1 = concatBytes(args.passwordBytes, k, u);
    const k1Repeated = repeatBytes(k1, 64);
    const key = k.subarray(0, 16);
    const iv = k.subarray(16, 32);
    e = aes128CbcEncryptNoPadWithIv(key, iv, k1Repeated);

    const selector = mod3OfBigEndian(e.subarray(0, 16));
    if (selector === 0) {
      k = sha256(e);
    } else if (selector === 1) {
      k = sha384(e);
    } else {
      k = sha512(e);
    }

    const last = e[e.length - 1] ?? 0;
    if (i >= 63 && last <= (i - 31)) {
      break;
    }
  }

  return k.subarray(0, 32);
}
