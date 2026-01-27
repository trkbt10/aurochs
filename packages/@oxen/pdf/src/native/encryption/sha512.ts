/**
 * @file src/pdf/native/encryption/sha512.ts
 */

// Minimal, dependency-free SHA-512 / SHA-384 implementation for Uint8Array inputs.
//
// Required for PDF Standard Security Handler (V=5, R=6) hardened hashing.

type Word64 = Readonly<{ hi: number; lo: number }>;

function add64(a: Word64, b: Word64): Word64 {
  const lo = ((a.lo >>> 0) + (b.lo >>> 0)) >>> 0;
  const carry = lo < (a.lo >>> 0) ? 1 : 0;
  const hi = ((a.hi >>> 0) + (b.hi >>> 0) + carry) >>> 0;
  return { hi, lo };
}

function add64_4(a: Word64, b: Word64, c: Word64, d: Word64): Word64 {
  return add64(add64(add64(a, b), c), d);
}

function add64_5(a: Word64, b: Word64, c: Word64, d: Word64, e: Word64): Word64 {
  return add64(add64_4(a, b, c, d), e);
}

function rotr64(x: Word64, n: number): Word64 {
  const s = n & 63;
  if (s === 0) return x;
  if (s < 32) {
    const hi = ((x.hi >>> s) | (x.lo << (32 - s))) >>> 0;
    const lo = ((x.lo >>> s) | (x.hi << (32 - s))) >>> 0;
    return { hi, lo };
  }
  if (s === 32) {
    return { hi: x.lo >>> 0, lo: x.hi >>> 0 };
  }
  const r = s - 32;
  const hi = ((x.lo >>> r) | (x.hi << (32 - r))) >>> 0;
  const lo = ((x.hi >>> r) | (x.lo << (32 - r))) >>> 0;
  return { hi, lo };
}

function shr64(x: Word64, n: number): Word64 {
  const s = n & 63;
  if (s === 0) return x;
  if (s < 32) {
    const hi = (x.hi >>> s) >>> 0;
    const lo = ((x.lo >>> s) | (x.hi << (32 - s))) >>> 0;
    return { hi, lo };
  }
  if (s === 32) {
    return { hi: 0, lo: x.hi >>> 0 };
  }
  const r = s - 32;
  return { hi: 0, lo: (x.hi >>> r) >>> 0 };
}

function xor64(a: Word64, b: Word64): Word64 {
  return { hi: (a.hi ^ b.hi) >>> 0, lo: (a.lo ^ b.lo) >>> 0 };
}

function and64(a: Word64, b: Word64): Word64 {
  return { hi: (a.hi & b.hi) >>> 0, lo: (a.lo & b.lo) >>> 0 };
}

function not64(a: Word64): Word64 {
  return { hi: (~a.hi) >>> 0, lo: (~a.lo) >>> 0 };
}

function ch64(x: Word64, y: Word64, z: Word64): Word64 {
  return xor64(and64(x, y), and64(not64(x), z));
}

function maj64(x: Word64, y: Word64, z: Word64): Word64 {
  return xor64(xor64(and64(x, y), and64(x, z)), and64(y, z));
}

function bigSigma0(x: Word64): Word64 {
  return xor64(xor64(rotr64(x, 28), rotr64(x, 34)), rotr64(x, 39));
}

function bigSigma1(x: Word64): Word64 {
  return xor64(xor64(rotr64(x, 14), rotr64(x, 18)), rotr64(x, 41));
}

function smallSigma0(x: Word64): Word64 {
  return xor64(xor64(rotr64(x, 1), rotr64(x, 8)), shr64(x, 7));
}

function smallSigma1(x: Word64): Word64 {
  return xor64(xor64(rotr64(x, 19), rotr64(x, 61)), shr64(x, 6));
}

const K: readonly Word64[] = [
  { hi: 0x428a2f98, lo: 0xd728ae22 }, { hi: 0x71374491, lo: 0x23ef65cd },
  { hi: 0xb5c0fbcf, lo: 0xec4d3b2f }, { hi: 0xe9b5dba5, lo: 0x8189dbbc },
  { hi: 0x3956c25b, lo: 0xf348b538 }, { hi: 0x59f111f1, lo: 0xb605d019 },
  { hi: 0x923f82a4, lo: 0xaf194f9b }, { hi: 0xab1c5ed5, lo: 0xda6d8118 },
  { hi: 0xd807aa98, lo: 0xa3030242 }, { hi: 0x12835b01, lo: 0x45706fbe },
  { hi: 0x243185be, lo: 0x4ee4b28c }, { hi: 0x550c7dc3, lo: 0xd5ffb4e2 },
  { hi: 0x72be5d74, lo: 0xf27b896f }, { hi: 0x80deb1fe, lo: 0x3b1696b1 },
  { hi: 0x9bdc06a7, lo: 0x25c71235 }, { hi: 0xc19bf174, lo: 0xcf692694 },
  { hi: 0xe49b69c1, lo: 0x9ef14ad2 }, { hi: 0xefbe4786, lo: 0x384f25e3 },
  { hi: 0x0fc19dc6, lo: 0x8b8cd5b5 }, { hi: 0x240ca1cc, lo: 0x77ac9c65 },
  { hi: 0x2de92c6f, lo: 0x592b0275 }, { hi: 0x4a7484aa, lo: 0x6ea6e483 },
  { hi: 0x5cb0a9dc, lo: 0xbd41fbd4 }, { hi: 0x76f988da, lo: 0x831153b5 },
  { hi: 0x983e5152, lo: 0xee66dfab }, { hi: 0xa831c66d, lo: 0x2db43210 },
  { hi: 0xb00327c8, lo: 0x98fb213f }, { hi: 0xbf597fc7, lo: 0xbeef0ee4 },
  { hi: 0xc6e00bf3, lo: 0x3da88fc2 }, { hi: 0xd5a79147, lo: 0x930aa725 },
  { hi: 0x06ca6351, lo: 0xe003826f }, { hi: 0x14292967, lo: 0x0a0e6e70 },
  { hi: 0x27b70a85, lo: 0x46d22ffc }, { hi: 0x2e1b2138, lo: 0x5c26c926 },
  { hi: 0x4d2c6dfc, lo: 0x5ac42aed }, { hi: 0x53380d13, lo: 0x9d95b3df },
  { hi: 0x650a7354, lo: 0x8baf63de }, { hi: 0x766a0abb, lo: 0x3c77b2a8 },
  { hi: 0x81c2c92e, lo: 0x47edaee6 }, { hi: 0x92722c85, lo: 0x1482353b },
  { hi: 0xa2bfe8a1, lo: 0x4cf10364 }, { hi: 0xa81a664b, lo: 0xbc423001 },
  { hi: 0xc24b8b70, lo: 0xd0f89791 }, { hi: 0xc76c51a3, lo: 0x0654be30 },
  { hi: 0xd192e819, lo: 0xd6ef5218 }, { hi: 0xd6990624, lo: 0x5565a910 },
  { hi: 0xf40e3585, lo: 0x5771202a }, { hi: 0x106aa070, lo: 0x32bbd1b8 },
  { hi: 0x19a4c116, lo: 0xb8d2d0c8 }, { hi: 0x1e376c08, lo: 0x5141ab53 },
  { hi: 0x2748774c, lo: 0xdf8eeb99 }, { hi: 0x34b0bcb5, lo: 0xe19b48a8 },
  { hi: 0x391c0cb3, lo: 0xc5c95a63 }, { hi: 0x4ed8aa4a, lo: 0xe3418acb },
  { hi: 0x5b9cca4f, lo: 0x7763e373 }, { hi: 0x682e6ff3, lo: 0xd6b2b8a3 },
  { hi: 0x748f82ee, lo: 0x5defb2fc }, { hi: 0x78a5636f, lo: 0x43172f60 },
  { hi: 0x84c87814, lo: 0xa1f0ab72 }, { hi: 0x8cc70208, lo: 0x1a6439ec },
  { hi: 0x90befffa, lo: 0x23631e28 }, { hi: 0xa4506ceb, lo: 0xde82bde9 },
  { hi: 0xbef9a3f7, lo: 0xb2c67915 }, { hi: 0xc67178f2, lo: 0xe372532b },
  { hi: 0xca273ece, lo: 0xea26619c }, { hi: 0xd186b8c7, lo: 0x21c0c207 },
  { hi: 0xeada7dd6, lo: 0xcde0eb1e }, { hi: 0xf57d4f7f, lo: 0xee6ed178 },
  { hi: 0x06f067aa, lo: 0x72176fba }, { hi: 0x0a637dc5, lo: 0xa2c898a6 },
  { hi: 0x113f9804, lo: 0xbef90dae }, { hi: 0x1b710b35, lo: 0x131c471b },
  { hi: 0x28db77f5, lo: 0x23047d84 }, { hi: 0x32caab7b, lo: 0x40c72493 },
  { hi: 0x3c9ebe0a, lo: 0x15c9bebc }, { hi: 0x431d67c4, lo: 0x9c100d4c },
  { hi: 0x4cc5d4be, lo: 0xcb3e42b6 }, { hi: 0x597f299c, lo: 0xfc657e2a },
  { hi: 0x5fcb6fab, lo: 0x3ad6faec }, { hi: 0x6c44198c, lo: 0x4a475817 },
];

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

function sha512Like(input: Uint8Array, initial: readonly Word64[]): Uint8Array {
  const bitLen = BigInt(input.length) * 8n;

  const padLen = (() => {
    const mod = (input.length + 1) % 128;
    return mod <= 112 ? 112 - mod : 112 + (128 - mod);
  })();

  const padded = new Uint8Array(input.length + 1 + padLen + 16);
  padded.set(input, 0);
  padded[input.length] = 0x80;

  // length in bits (big-endian 128-bit). We only populate the low 64 bits.
  const lo64Hi = Number((bitLen >> 32n) & 0xffffffffn) >>> 0;
  const lo64Lo = Number(bitLen & 0xffffffffn) >>> 0;
  writeUint32BE(padded, padded.length - 8, lo64Hi);
  writeUint32BE(padded, padded.length - 4, lo64Lo);

  const h: Word64[] = initial.map((x) => ({ hi: x.hi >>> 0, lo: x.lo >>> 0 }));
  const w: Word64[] = Array.from({ length: 80 }, () => ({ hi: 0, lo: 0 }));

  for (let block = 0; block < padded.length; block += 128) {
    for (let t = 0; t < 16; t += 1) {
      const off = block + t * 8;
      w[t] = { hi: readUint32BE(padded, off), lo: readUint32BE(padded, off + 4) };
    }
    for (let t = 16; t < 80; t += 1) {
      const s0 = smallSigma0(w[t - 15]!);
      const s1 = smallSigma1(w[t - 2]!);
      w[t] = add64_4(w[t - 16]!, s0, w[t - 7]!, s1);
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;

    for (let t = 0; t < 80; t += 1) {
      const t1 = add64_5(hh, bigSigma1(e), ch64(e, f, g), K[t]!, w[t]!);
      const t2 = add64(bigSigma0(a), maj64(a, b, c));
      hh = g;
      g = f;
      f = e;
      e = add64(d, t1);
      d = c;
      c = b;
      b = a;
      a = add64(t1, t2);
    }

    h[0] = add64(h[0]!, a);
    h[1] = add64(h[1]!, b);
    h[2] = add64(h[2]!, c);
    h[3] = add64(h[3]!, d);
    h[4] = add64(h[4]!, e);
    h[5] = add64(h[5]!, f);
    h[6] = add64(h[6]!, g);
    h[7] = add64(h[7]!, hh);
  }

  const out = new Uint8Array(64);
  for (let i = 0; i < 8; i += 1) {
    writeUint32BE(out, i * 8, h[i]!.hi);
    writeUint32BE(out, i * 8 + 4, h[i]!.lo);
  }
  return out;
}

/** Compute SHA-512 digest bytes. */
export function sha512(input: Uint8Array): Uint8Array {
  return sha512Like(input, [
    { hi: 0x6a09e667, lo: 0xf3bcc908 },
    { hi: 0xbb67ae85, lo: 0x84caa73b },
    { hi: 0x3c6ef372, lo: 0xfe94f82b },
    { hi: 0xa54ff53a, lo: 0x5f1d36f1 },
    { hi: 0x510e527f, lo: 0xade682d1 },
    { hi: 0x9b05688c, lo: 0x2b3e6c1f },
    { hi: 0x1f83d9ab, lo: 0xfb41bd6b },
    { hi: 0x5be0cd19, lo: 0x137e2179 },
  ]);
}

/** Compute SHA-384 digest bytes. */
export function sha384(input: Uint8Array): Uint8Array {
  const full = sha512Like(input, [
    { hi: 0xcbbb9d5d, lo: 0xc1059ed8 },
    { hi: 0x629a292a, lo: 0x367cd507 },
    { hi: 0x9159015a, lo: 0x3070dd17 },
    { hi: 0x152fecd8, lo: 0xf70e5939 },
    { hi: 0x67332667, lo: 0xffc00b31 },
    { hi: 0x8eb44a87, lo: 0x68581511 },
    { hi: 0xdb0c2e0d, lo: 0x64f98fa7 },
    { hi: 0x47b5481d, lo: 0xbefa4fa4 },
  ]);
  return full.subarray(0, 48);
}

