/**
 * @file src/pdf/native/encryption/bytes.ts
 */











/** Concatenate multiple byte arrays into a single `Uint8Array`. */
export function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  const pos = { value: 0 };
  for (const p of parts) {
    out.set(p, pos.value);
    pos.value += p.length;
  }
  return out;
}











/** Encode a signed 32-bit integer as little-endian bytes. */
export function int32le(value: number): Uint8Array {
  const v = value | 0;
  return new Uint8Array([
    v & 0xff,
    (v >>> 8) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 24) & 0xff,
  ]);
}











/** Build the object key salt used by PDF Standard Security encryption. */
export function objKeySalt(objNum: number, gen: number): Uint8Array {
  const o = objNum >>> 0;
  const g = gen >>> 0;
  return new Uint8Array([
    o & 0xff,
    (o >>> 8) & 0xff,
    (o >>> 16) & 0xff,
    g & 0xff,
    (g >>> 8) & 0xff,
  ]);
}











/** Compare two byte arrays for equality. */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {return false;}
  const diff = a.reduce((d, byte, i) => d | (byte ^ (b[i] ?? 0)), 0);
  return diff === 0;
}
