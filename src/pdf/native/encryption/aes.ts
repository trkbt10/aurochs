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

function rotl8(x: number, n: number): number {
  return toU8(((x << n) | (x >>> (8 - n))));
}

function gfMul(a: number, b: number): number {
  let p = 0;
  let aa = a & 0xff;
  let bb = b & 0xff;
  for (let i = 0; i < 8; i += 1) {
    if ((bb & 1) !== 0) {p ^= aa;}
    const hi = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (hi !== 0) {aa ^= 0x1b;}
    bb >>>= 1;
  }
  return toU8(p);
}

function gfPow(a: number, exp: number): number {
  let result = 1;
  let base = a & 0xff;
  let e = exp;
  while (e > 0) {
    if ((e & 1) !== 0) {result = gfMul(result, base);}
    base = gfMul(base, base);
    e >>>= 1;
  }
  return result & 0xff;
}

function buildAesSBoxes(): { readonly sbox: Uint8Array; readonly invSbox: Uint8Array } {
  const sbox = new Uint8Array(256);
  const invSbox = new Uint8Array(256);
  for (let a = 0; a < 256; a += 1) {
    const inv = a === 0 ? 0 : gfPow(a, 254);
    const x = inv & 0xff;
    const y = toU8(
      x ^
      rotl8(x, 1) ^
      rotl8(x, 2) ^
      rotl8(x, 3) ^
      rotl8(x, 4) ^
      0x63,
    );
    sbox[a] = y;
    invSbox[y] = a;
  }
  return { sbox, invSbox };
}

const AES_SBOXES = buildAesSBoxes();
const SBOX = AES_SBOXES.sbox;
const INV_SBOX = AES_SBOXES.invSbox;

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
      const prev = expanded[state.bytesGenerated - 16 + i] ?? 0;
      expanded[state.bytesGenerated] = toU8(prev ^ (temp[i] ?? 0));
      state.bytesGenerated += 1;
    }
  }

  return expanded;
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

function aes128EncryptBlock(expandedKey: Uint8Array, block: Uint8Array): Uint8Array {
  if (block.length !== 16) {throw new Error(`AES block must be 16 bytes (got ${block.length})`);}
  const state = block.slice();
  addRoundKey(state, expandedKey, 0);
  for (let round = 1; round <= 9; round += 1) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, expandedKey, round);
  }
  subBytes(state);
  shiftRows(state);
  addRoundKey(state, expandedKey, 10);
  return state;
}

function aes128DecryptBlock(expandedKey: Uint8Array, block: Uint8Array): Uint8Array {
  if (block.length !== 16) {throw new Error(`AES block must be 16 bytes (got ${block.length})`);}
  const state = block.slice();
  addRoundKey(state, expandedKey, 10);
  for (let round = 9; round >= 1; round -= 1) {
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

  let prev = iv;
  for (let off = 0; off < plaintext.length; off += 16) {
    const block = plaintext.subarray(off, off + 16);
    const xored = xorBlock16(block, prev);
    const enc = aes128EncryptBlock(expandedKey, xored);
    out.set(enc, off);
    prev = enc;
  }

  return out;
}

function aes128CbcDecryptNoPad(key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (key.length !== 16) {throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);}
  if (iv.length !== 16) {throw new Error(`AES IV must be 16 bytes (got ${iv.length})`);}
  if (ciphertext.length % 16 !== 0) {throw new Error("CBC ciphertext length must be a multiple of 16");}

  const expandedKey = expandKeyAes128(key);
  const out = new Uint8Array(ciphertext.length);

  let prev = iv;
  for (let off = 0; off < ciphertext.length; off += 16) {
    const block = ciphertext.subarray(off, off + 16);
    const dec = aes128DecryptBlock(expandedKey, block);
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
