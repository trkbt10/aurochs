/**
 * @file src/pdf/native/encryption/sha256.ts
 */

// Minimal, dependency-free SHA-256 implementation for Uint8Array inputs.
//
// Required for PDF Standard Security Handler (V=5, R=5/6) key derivation.

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function add(x: number, y: number): number {
  return (x + y) >>> 0;
}

function ch(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function maj(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function bigSigma0(x: number): number {
  return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
}

function bigSigma1(x: number): number {
  return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
}

function smallSigma0(x: number): number {
  return rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
}

function smallSigma1(x: number): number {
  return rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function readUint32BE(bytes: Uint8Array, offset: number): number {
  const b0 = bytes[offset] ?? 0;
  const b1 = bytes[offset + 1] ?? 0;
  const b2 = bytes[offset + 2] ?? 0;
  const b3 = bytes[offset + 3] ?? 0;
  return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
}

function writeUint32BE(out: Uint8Array, offset: number, v: number): void {
  out[offset] = (v >>> 24) & 0xff;
  out[offset + 1] = (v >>> 16) & 0xff;
  out[offset + 2] = (v >>> 8) & 0xff;
  out[offset + 3] = v & 0xff;
}

/** Compute SHA-256 digest bytes (used by modern PDF encryption). */
export function sha256(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;

  function computePadLen(): number {
    const mod = (input.length + 1) % 64;
    return mod <= 56 ? 56 - mod : 56 + (64 - mod);
  }

  const padLen = computePadLen();

  const padded = new Uint8Array(input.length + 1 + padLen + 8);
  padded.set(input, 0);
  padded[input.length] = 0x80;

  // length in bits (big-endian 64-bit)
  const hi = Math.floor(bitLen / 2 ** 32) >>> 0;
  const lo = bitLen >>> 0;
  writeUint32BE(padded, padded.length - 8, hi);
  writeUint32BE(padded, padded.length - 4, lo);

  const h = new Uint32Array([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);

  const w = new Uint32Array(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let t = 0; t < 16; t += 1) {
      w[t] = readUint32BE(padded, block + t * 4);
    }
    for (let t = 16; t < 64; t += 1) {
      const s0 = smallSigma0(w[t - 15] ?? 0);
      const s1 = smallSigma1(w[t - 2] ?? 0);
      w[t] = add(add(add(w[t - 16] ?? 0, s0), w[t - 7] ?? 0), s1);
    }

    const s = {
      a: h[0] ?? 0,
      b: h[1] ?? 0,
      c: h[2] ?? 0,
      d: h[3] ?? 0,
      e: h[4] ?? 0,
      f: h[5] ?? 0,
      g: h[6] ?? 0,
      hh: h[7] ?? 0,
    };

    for (let t = 0; t < 64; t += 1) {
      const t1 = add(add(add(add(s.hh, bigSigma1(s.e)), ch(s.e, s.f, s.g)), K[t] ?? 0), w[t] ?? 0);
      const t2 = add(bigSigma0(s.a), maj(s.a, s.b, s.c));
      s.hh = s.g;
      s.g = s.f;
      s.f = s.e;
      s.e = add(s.d, t1);
      s.d = s.c;
      s.c = s.b;
      s.b = s.a;
      s.a = add(t1, t2);
    }

    h[0] = add(h[0] ?? 0, s.a);
    h[1] = add(h[1] ?? 0, s.b);
    h[2] = add(h[2] ?? 0, s.c);
    h[3] = add(h[3] ?? 0, s.d);
    h[4] = add(h[4] ?? 0, s.e);
    h[5] = add(h[5] ?? 0, s.f);
    h[6] = add(h[6] ?? 0, s.g);
    h[7] = add(h[7] ?? 0, s.hh);
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i += 1) {
    writeUint32BE(out, i * 4, h[i] ?? 0);
  }
  return out;
}

