/**
 * @file src/pdf/native/encryption/md5.ts
 */

// Minimal, dependency-free MD5 implementation for Uint8Array inputs.
//
// PDF Standard Security Handler requires MD5 for key derivation.

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function add(x: number, y: number): number {
  return (x + y) >>> 0;
}

function f(x: number, y: number, z: number): number {
  return (x & y) | (~x & z);
}
function g(x: number, y: number, z: number): number {
  return (x & z) | (y & ~z);
}
function h(x: number, y: number, z: number): number {
  return x ^ y ^ z;
}
function i(x: number, y: number, z: number): number {
  return y ^ (x | ~z);
}

const S1 = [7, 12, 17, 22] as const;
const S2 = [5, 9, 14, 20] as const;
const S3 = [4, 11, 16, 23] as const;
const S4 = [6, 10, 15, 21] as const;

type RoundParams = { fn: number; gIdx: number; s: number };

function getRoundParams({ n, bb, cc, dd }: { readonly n: number; readonly bb: number; readonly cc: number; readonly dd: number }): RoundParams {
  if (n < 16) {
    return { fn: f(bb, cc, dd), gIdx: n, s: S1[n % 4]! };
  }
  if (n < 32) {
    return { fn: g(bb, cc, dd), gIdx: (5 * n + 1) % 16, s: S2[n % 4]! };
  }
  if (n < 48) {
    return { fn: h(bb, cc, dd), gIdx: (3 * n + 5) % 16, s: S3[n % 4]! };
  }
  return { fn: i(bb, cc, dd), gIdx: (7 * n) % 16, s: S4[n % 4]! };
}

const K: readonly number[] = (() => {
  const out: number[] = [];
  for (let n = 0; n < 64; n += 1) {
    out.push(Math.floor(Math.abs(Math.sin(n + 1)) * 2 ** 32) >>> 0);
  }
  return out;
})();

function toWordsLE(bytes: Uint8Array): Uint32Array {
  const words = new Uint32Array(bytes.length >>> 2);
  for (let i = 0; i < words.length; i += 1) {
    const b0 = bytes[i * 4] ?? 0;
    const b1 = bytes[i * 4 + 1] ?? 0;
    const b2 = bytes[i * 4 + 2] ?? 0;
    const b3 = bytes[i * 4 + 3] ?? 0;
    words[i] = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  }
  return words;
}

function writeUint32LE(out: Uint8Array, pos: number, v: number): void {
  out[pos] = v & 0xff;
  out[pos + 1] = (v >>> 8) & 0xff;
  out[pos + 2] = (v >>> 16) & 0xff;
  out[pos + 3] = (v >>> 24) & 0xff;
}











/** Compute MD5 digest bytes (used by legacy PDF encryption). */
export function md5(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;

  const padLen = (() => {
    const mod = (input.length + 1) % 64;
    return mod <= 56 ? 56 - mod : 56 + (64 - mod);
  })();

  const padded = new Uint8Array(input.length + 1 + padLen + 8);
  padded.set(input, 0);
  padded[input.length] = 0x80;

  // length in bits (little-endian 64-bit)
  const lo = bitLen >>> 0;
  const hi = Math.floor(bitLen / 2 ** 32) >>> 0;
  writeUint32LE(padded, padded.length - 8, lo);
  writeUint32LE(padded, padded.length - 4, hi);

  const state = {
    a: 0x67452301,
    b: 0xefcdab89,
    c: 0x98badcfe,
    d: 0x10325476,
  };

  const words = toWordsLE(padded);

  for (let block = 0; block < words.length; block += 16) {
    const round = { aa: state.a, bb: state.b, cc: state.c, dd: state.d };

    for (let n = 0; n < 64; n += 1) {
      const { fn, gIdx, s } = getRoundParams({ n, bb: round.bb, cc: round.cc, dd: round.dd });

      const m = words[block + gIdx] ?? 0;
      const t = add(add(add(round.aa, fn), m), K[n] ?? 0);
      round.aa = round.dd;
      round.dd = round.cc;
      round.cc = round.bb;
      round.bb = add(round.bb, rotl(t, s));
    }

    state.a = add(state.a, round.aa);
    state.b = add(state.b, round.bb);
    state.c = add(state.c, round.cc);
    state.d = add(state.d, round.dd);
  }

  const out = new Uint8Array(16);
  writeUint32LE(out, 0, state.a);
  writeUint32LE(out, 4, state.b);
  writeUint32LE(out, 8, state.c);
  writeUint32LE(out, 12, state.d);
  return out;
}
