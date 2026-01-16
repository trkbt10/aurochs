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

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const words = toWordsLE(padded);

  for (let block = 0; block < words.length; block += 16) {
    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    for (let n = 0; n < 64; n += 1) {
      let fn: number;
      let gIdx: number;
      let s: number;
      if (n < 16) {
        fn = f(bb, cc, dd);
        gIdx = n;
        s = S1[n % 4]!;
      } else if (n < 32) {
        fn = g(bb, cc, dd);
        gIdx = (5 * n + 1) % 16;
        s = S2[n % 4]!;
      } else if (n < 48) {
        fn = h(bb, cc, dd);
        gIdx = (3 * n + 5) % 16;
        s = S3[n % 4]!;
      } else {
        fn = i(bb, cc, dd);
        gIdx = (7 * n) % 16;
        s = S4[n % 4]!;
      }

      const m = words[block + gIdx] ?? 0;
      const t = add(add(add(aa, fn), m), K[n] ?? 0);
      aa = dd;
      dd = cc;
      cc = bb;
      bb = add(bb, rotl(t, s));
    }

    a = add(a, aa);
    b = add(b, bb);
    c = add(c, cc);
    d = add(d, dd);
  }

  const out = new Uint8Array(16);
  writeUint32LE(out, 0, a);
  writeUint32LE(out, 4, b);
  writeUint32LE(out, 8, c);
  writeUint32LE(out, 12, d);
  return out;
}

