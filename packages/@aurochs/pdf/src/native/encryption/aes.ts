/**
 * @file src/pdf/native/encryption/aes.ts
 *
 * Minimal AES-128 implementation for PDF Standard Security Handler (AESV2).
 *
 * Notes:
 * - Implements AES-128 block encrypt/decrypt + CBC mode.
 * - Uses PKCS#7 padding/unpadding for PDF string/stream encryption.
 * - Kept sync + dependency-free to support both Bun/Node and browser builds.
 */

function toU8(n: number): number {
  return n & 0xff;
}

function xtime(a: number): number {
  const x = a << 1;
  return toU8((a & 0x80) !== 0 ? x ^ 0x1b : x);
}

function mul2(a: number): number {
  return xtime(a);
}

function mul3(a: number): number {
  return toU8(xtime(a) ^ a);
}

function mul9(a: number): number {
  const x2 = xtime(a);
  const x4 = xtime(x2);
  const x8 = xtime(x4);
  return toU8(x8 ^ a);
}

function mul11(a: number): number {
  const x2 = xtime(a);
  const x4 = xtime(x2);
  const x8 = xtime(x4);
  return toU8(x8 ^ x2 ^ a);
}

function mul13(a: number): number {
  const x2 = xtime(a);
  const x4 = xtime(x2);
  const x8 = xtime(x4);
  return toU8(x8 ^ x4 ^ a);
}

function mul14(a: number): number {
  const x2 = xtime(a);
  const x4 = xtime(x2);
  const x8 = xtime(x4);
  return toU8(x8 ^ x4 ^ x2);
}

// AES S-box from FIPS-197. Derive INV_SBOX to avoid copy errors.
const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);

const INV_SBOX = (() => {
  const out = new Uint8Array(256);
  for (let x = 0; x < 256; x += 1) {
    out[SBOX[x] ?? 0] = x;
  }
  return out;
})();

/**
 * Debug/test helper: read a single S-box byte.
 */
export function aesSBoxByteForTest(x: number): number {
  return SBOX[x & 0xff] ?? 0;
}

function expandKeyAes128(key: Uint8Array): Uint8Array {
  if (key.length !== 16) {throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);}

  const expanded = new Uint8Array(176);
  expanded.set(key, 0);

  const temp = new Uint8Array(4);
  const rcon = new Uint8Array(11);
  rcon[1] = 0x01;
  for (let i = 2; i <= 10; i += 1) {
    rcon[i] = xtime(rcon[i - 1] ?? 0);
  }

  const state = { bytesGenerated: 16, rconIter: 1 };
  while (state.bytesGenerated < expanded.length) {
    temp.set(expanded.subarray(state.bytesGenerated - 4, state.bytesGenerated));

    if (state.bytesGenerated % 16 === 0) {
      const t0 = temp[0] ?? 0;
      temp[0] = temp[1] ?? 0;
      temp[1] = temp[2] ?? 0;
      temp[2] = temp[3] ?? 0;
      temp[3] = t0;

      for (let i = 0; i < 4; i += 1) {
        temp[i] = SBOX[temp[i] ?? 0] ?? 0;
      }

      temp[0] = toU8((temp[0] ?? 0) ^ (rcon[state.rconIter] ?? 0));
      state.rconIter += 1;
    }

    for (let i = 0; i < 4; i += 1) {
      const prev = expanded[state.bytesGenerated - 16] ?? 0;
      expanded[state.bytesGenerated] = toU8(prev ^ (temp[i] ?? 0));
      state.bytesGenerated += 1;
    }
  }

  return expanded;
}

function expandKeyAes256(key: Uint8Array): Uint8Array {
  if (key.length !== 32) {throw new Error(`AES-256 key must be 32 bytes (got ${key.length})`);}

  const expanded = new Uint8Array(240);
  expanded.set(key, 0);

  const temp = new Uint8Array(4);
  const rcon = new Uint8Array(15);
  rcon[1] = 0x01;
  for (let i = 2; i <= 14; i += 1) {
    rcon[i] = xtime(rcon[i - 1] ?? 0);
  }

  const state = { bytesGenerated: 32, rconIter: 1 };
  while (state.bytesGenerated < expanded.length) {
    temp.set(expanded.subarray(state.bytesGenerated - 4, state.bytesGenerated));

    // AES-256 key schedule:
    // - every 32 bytes (Nk=8 words): RotWord/SubWord/Rcon
    // - every 16 bytes (i % Nk == 4): SubWord only
    if (state.bytesGenerated % 32 === 0) {
      const t0 = temp[0] ?? 0;
      temp[0] = temp[1] ?? 0;
      temp[1] = temp[2] ?? 0;
      temp[2] = temp[3] ?? 0;
      temp[3] = t0;

      for (let i = 0; i < 4; i += 1) {
        temp[i] = SBOX[temp[i] ?? 0] ?? 0;
      }

      temp[0] = toU8((temp[0] ?? 0) ^ (rcon[state.rconIter] ?? 0));
      state.rconIter += 1;
    } else if (state.bytesGenerated % 32 === 16) {
      for (let i = 0; i < 4; i += 1) {
        temp[i] = SBOX[temp[i] ?? 0] ?? 0;
      }
    }

    for (let i = 0; i < 4; i += 1) {
      const prev = expanded[state.bytesGenerated - 32] ?? 0;
      expanded[state.bytesGenerated] = toU8(prev ^ (temp[i] ?? 0));
      state.bytesGenerated += 1;
    }
  }

  return expanded;
}

/**
 * Debug/test helper: return raw AES-128 expanded key bytes (round keys).
 */
export function aes128ExpandKeyForTest(key: Uint8Array): Uint8Array {
  return expandKeyAes128(key);
}

function addRoundKey(state: Uint8Array, expandedKey: Uint8Array, round: number): void {
  const off = round * 16;
  for (let i = 0; i < 16; i += 1) {
    state[i] = toU8((state[i] ?? 0) ^ (expandedKey[off + i] ?? 0));
  }
}

function subBytes(state: Uint8Array): void {
  for (let i = 0; i < 16; i += 1) {
    state[i] = SBOX[state[i] ?? 0] ?? 0;
  }
}

function invSubBytes(state: Uint8Array): void {
  for (let i = 0; i < 16; i += 1) {
    state[i] = INV_SBOX[state[i] ?? 0] ?? 0;
  }
}

function shiftRows(state: Uint8Array): void {
  const t = state.slice();
  // Row 0 unchanged.
  state[1] = t[5] ?? 0;
  state[5] = t[9] ?? 0;
  state[9] = t[13] ?? 0;
  state[13] = t[1] ?? 0;

  state[2] = t[10] ?? 0;
  state[6] = t[14] ?? 0;
  state[10] = t[2] ?? 0;
  state[14] = t[6] ?? 0;

  state[3] = t[15] ?? 0;
  state[7] = t[3] ?? 0;
  state[11] = t[7] ?? 0;
  state[15] = t[11] ?? 0;
}

function invShiftRows(state: Uint8Array): void {
  const t = state.slice();
  // Row 0 unchanged.
  state[1] = t[13] ?? 0;
  state[5] = t[1] ?? 0;
  state[9] = t[5] ?? 0;
  state[13] = t[9] ?? 0;

  state[2] = t[10] ?? 0;
  state[6] = t[14] ?? 0;
  state[10] = t[2] ?? 0;
  state[14] = t[6] ?? 0;

  state[3] = t[7] ?? 0;
  state[7] = t[11] ?? 0;
  state[11] = t[15] ?? 0;
  state[15] = t[3] ?? 0;
}

function mixColumns(state: Uint8Array): void {
  for (let col = 0; col < 4; col += 1) {
    const i = col * 4;
    const a0 = state[i] ?? 0;
    const a1 = state[i + 1] ?? 0;
    const a2 = state[i + 2] ?? 0;
    const a3 = state[i + 3] ?? 0;

    state[i] = toU8(mul2(a0) ^ mul3(a1) ^ a2 ^ a3);
    state[i + 1] = toU8(a0 ^ mul2(a1) ^ mul3(a2) ^ a3);
    state[i + 2] = toU8(a0 ^ a1 ^ mul2(a2) ^ mul3(a3));
    state[i + 3] = toU8(mul3(a0) ^ a1 ^ a2 ^ mul2(a3));
  }
}

function invMixColumns(state: Uint8Array): void {
  for (let col = 0; col < 4; col += 1) {
    const i = col * 4;
    const a0 = state[i] ?? 0;
    const a1 = state[i + 1] ?? 0;
    const a2 = state[i + 2] ?? 0;
    const a3 = state[i + 3] ?? 0;

    state[i] = toU8(mul14(a0) ^ mul11(a1) ^ mul13(a2) ^ mul9(a3));
    state[i + 1] = toU8(mul9(a0) ^ mul14(a1) ^ mul11(a2) ^ mul13(a3));
    state[i + 2] = toU8(mul13(a0) ^ mul9(a1) ^ mul14(a2) ^ mul11(a3));
    state[i + 3] = toU8(mul11(a0) ^ mul13(a1) ^ mul9(a2) ^ mul14(a3));
  }
}

function aesEncryptBlock(expandedKey: Uint8Array, rounds: number, block: Uint8Array): Uint8Array {
  if (block.length !== 16) {throw new Error(`AES block must be 16 bytes (got ${block.length})`);}
  const state = block.slice();
  addRoundKey(state, expandedKey, 0);
  for (let round = 1; round <= rounds - 1; round += 1) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, expandedKey, round);
  }
  subBytes(state);
  shiftRows(state);
  addRoundKey(state, expandedKey, rounds);
  return state;
}

function aesDecryptBlock(expandedKey: Uint8Array, rounds: number, block: Uint8Array): Uint8Array {
  if (block.length !== 16) {throw new Error(`AES block must be 16 bytes (got ${block.length})`);}
  const state = block.slice();
  addRoundKey(state, expandedKey, rounds);
  for (let round = rounds - 1; round >= 1; round -= 1) {
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, expandedKey, round);
    invMixColumns(state);
  }
  invShiftRows(state);
  invSubBytes(state);
  addRoundKey(state, expandedKey, 0);
  return state;
}

function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  if (blockSize <= 0 || blockSize > 255) {throw new Error(`Invalid PKCS#7 block size: ${blockSize}`);}
  const rem = data.length % blockSize;
  const pad = rem === 0 ? blockSize : blockSize - rem;
  const out = new Uint8Array(data.length + pad);
  out.set(data, 0);
  out.fill(pad, data.length);
  return out;
}

function pkcs7Unpad(data: Uint8Array, blockSize: number): Uint8Array {
  if (data.length === 0 || data.length % blockSize !== 0) {throw new Error("Invalid PKCS#7 data length");}
  const pad = data[data.length - 1] ?? 0;
  if (pad <= 0 || pad > blockSize) {throw new Error("Invalid PKCS#7 padding");}
  for (let i = data.length - pad; i < data.length; i += 1) {
    if ((data[i] ?? 0) !== pad) {throw new Error("Invalid PKCS#7 padding");}
  }
  return data.subarray(0, data.length - pad);
}

function xorBlock16(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    out[i] = toU8((a[i] ?? 0) ^ (b[i] ?? 0));
  }
  return out;
}

function aes128CbcEncryptNoPad(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (key.length !== 16) {throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);}
  if (iv.length !== 16) {throw new Error(`AES IV must be 16 bytes (got ${iv.length})`);}
  if (plaintext.length % 16 !== 0) {throw new Error("CBC plaintext length must be a multiple of 16");}

  const expandedKey = expandKeyAes128(key);
  const out = new Uint8Array(plaintext.length);

  // eslint-disable-next-line no-restricted-syntax
  let prev = iv;
  for (let off = 0; off < plaintext.length; off += 16) {
    const block = plaintext.subarray(off, off + 16);
    const xored = xorBlock16(block, prev);
    const enc = aesEncryptBlock(expandedKey, 10, xored);
    out.set(enc, off);
    prev = enc;
  }

  return out;
}

/** AES-128-CBC encrypt without padding/unpadding, using an explicit IV. */
export function aes128CbcEncryptNoPadWithIv(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!iv) {throw new Error("iv is required");}
  if (!plaintext) {throw new Error("plaintext is required");}
  return aes128CbcEncryptNoPad(key, iv, plaintext);
}

function aes128CbcDecryptNoPad(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (key.length !== 16) {throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);}
  if (iv.length !== 16) {throw new Error(`AES IV must be 16 bytes (got ${iv.length})`);}
  if (ciphertext.length % 16 !== 0) {throw new Error("CBC ciphertext length must be a multiple of 16");}

  const expandedKey = expandKeyAes128(key);
  const out = new Uint8Array(ciphertext.length);

  // eslint-disable-next-line no-restricted-syntax
  let prev = iv;
  for (let off = 0; off < ciphertext.length; off += 16) {
    const block = ciphertext.subarray(off, off + 16);
    const dec = aesDecryptBlock(expandedKey, 10, block);
    const plain = xorBlock16(dec, prev);
    out.set(plain, off);
    prev = block;
  }

  return out;
}

function aes256CbcDecryptNoPad(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (key.length !== 32) {throw new Error(`AES-256 key must be 32 bytes (got ${key.length})`);}
  if (iv.length !== 16) {throw new Error(`AES IV must be 16 bytes (got ${iv.length})`);}
  if (ciphertext.length % 16 !== 0) {throw new Error("CBC ciphertext length must be a multiple of 16");}

  const expandedKey = expandKeyAes256(key);
  const out = new Uint8Array(ciphertext.length);

  // eslint-disable-next-line no-restricted-syntax
  let prev = iv;
  for (let off = 0; off < ciphertext.length; off += 16) {
    const block = ciphertext.subarray(off, off + 16);
    const dec = aesDecryptBlock(expandedKey, 14, block);
    const plain = xorBlock16(dec, prev);
    out.set(plain, off);
    prev = block;
  }

  return out;
}

function aes128CbcDecryptWithIvPrefixNoUnpad(key: Uint8Array, ivAndCiphertext: Uint8Array): Uint8Array {
  if (ivAndCiphertext.length < 32 || ivAndCiphertext.length % 16 !== 0) {
    throw new Error(`Invalid AES-CBC payload length: ${ivAndCiphertext.length}`);
  }
  const iv = ivAndCiphertext.subarray(0, 16);
  const ciphertext = ivAndCiphertext.subarray(16);
  return aes128CbcDecryptNoPad(key, iv, ciphertext);
}

function aes256CbcDecryptWithIvPrefixNoUnpad(key: Uint8Array, ivAndCiphertext: Uint8Array): Uint8Array {
  if (ivAndCiphertext.length < 32 || ivAndCiphertext.length % 16 !== 0) {
    throw new Error(`Invalid AES-CBC payload length: ${ivAndCiphertext.length}`);
  }
  const iv = ivAndCiphertext.subarray(0, 16);
  const ciphertext = ivAndCiphertext.subarray(16);
  return aes256CbcDecryptNoPad(key, iv, ciphertext);
}

/**
 * AES-128-CBC encrypt with PKCS#7 padding. Returns `iv || ciphertext`.
 */
export function aes128CbcEncryptPkcs7(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!iv) {throw new Error("iv is required");}
  if (!plaintext) {throw new Error("plaintext is required");}
  const padded = pkcs7Pad(plaintext, 16);
  const ciphertext = aes128CbcEncryptNoPad(key, iv, padded);
  const out = new Uint8Array(16 + ciphertext.length);
  out.set(iv, 0);
  out.set(ciphertext, 16);
  return out;
}

/**
 * AES-128-CBC decrypt with PKCS#7 unpadding. Input must be `iv || ciphertext`.
 */
export function aes128CbcDecryptPkcs7(key: Uint8Array, ivAndCiphertext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!ivAndCiphertext) {throw new Error("ivAndCiphertext is required");}
  const padded = aes128CbcDecryptWithIvPrefixNoUnpad(key, ivAndCiphertext);
  return pkcs7Unpad(padded, 16);
}

/**
 * AES-128-CBC decrypt without PKCS#7 unpadding. Input must be `iv || ciphertext`.
 *
 * Intended for tests and debugging.
 */
export function aes128CbcDecryptNoUnpad(key: Uint8Array, ivAndCiphertext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!ivAndCiphertext) {throw new Error("ivAndCiphertext is required");}
  return aes128CbcDecryptWithIvPrefixNoUnpad(key, ivAndCiphertext);
}

/** AES-256-CBC decrypt without PKCS#7 unpadding. Input must be `iv || ciphertext`. */
export function aes256CbcDecryptNoUnpad(key: Uint8Array, ivAndCiphertext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!ivAndCiphertext) {throw new Error("ivAndCiphertext is required");}
  return aes256CbcDecryptWithIvPrefixNoUnpad(key, ivAndCiphertext);
}

/** AES-256-CBC decrypt with PKCS#7 unpadding. Input must be `iv || ciphertext`. */
export function aes256CbcDecryptPkcs7(key: Uint8Array, ivAndCiphertext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!ivAndCiphertext) {throw new Error("ivAndCiphertext is required");}
  const padded = aes256CbcDecryptWithIvPrefixNoUnpad(key, ivAndCiphertext);
  return pkcs7Unpad(padded, 16);
}

/**
 * AES-256-CBC decrypt without padding/unpadding, using an explicit IV.
 *
 * Intended for decrypting V=5 encryption dictionary entries (/UE, /OE) which
 * use IV=0 and NoPadding.
 */
export function aes256CbcDecryptNoPadWithIv(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (!key) {throw new Error("key is required");}
  if (!iv) {throw new Error("iv is required");}
  if (!ciphertext) {throw new Error("ciphertext is required");}
  return aes256CbcDecryptNoPad(key, iv, ciphertext);
}
