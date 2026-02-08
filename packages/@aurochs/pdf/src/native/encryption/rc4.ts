/**
 * @file src/pdf/native/encryption/rc4.ts
 */











/** RC4 stream cipher (used by legacy PDF encryption). */
export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  if (key.length === 0) {throw new Error("rc4: key is required");}

  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {s[i] = i;}

  const ksa = { j: 0 };
  for (let i = 0; i < 256; i += 1) {
    ksa.j = (ksa.j + (s[i] ?? 0) + (key[i % key.length] ?? 0)) & 0xff;
    const tmp = s[i] ?? 0;
    s[i] = s[ksa.j] ?? 0;
    s[ksa.j] = tmp;
  }

  const out = new Uint8Array(data.length);
  const prga = { i: 0, j: 0 };
  for (let k = 0; k < data.length; k += 1) {
    prga.i = (prga.i + 1) & 0xff;
    prga.j = (prga.j + (s[prga.i] ?? 0)) & 0xff;
    const tmp = s[prga.i] ?? 0;
    s[prga.i] = s[prga.j] ?? 0;
    s[prga.j] = tmp;

    const t = ((s[prga.i] ?? 0) + (s[prga.j] ?? 0)) & 0xff;
    const ks = s[t] ?? 0;
    out[k] = (data[k] ?? 0) ^ ks;
  }

  return out;
}
