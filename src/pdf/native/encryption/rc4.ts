export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  if (key.length === 0) throw new Error("rc4: key is required");

  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) s[i] = i;

  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + (s[i] ?? 0) + (key[i % key.length] ?? 0)) & 0xff;
    const tmp = s[i] ?? 0;
    s[i] = s[j] ?? 0;
    s[j] = tmp;
  }

  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k += 1) {
    i = (i + 1) & 0xff;
    j = (j + (s[i] ?? 0)) & 0xff;
    const tmp = s[i] ?? 0;
    s[i] = s[j] ?? 0;
    s[j] = tmp;

    const t = ((s[i] ?? 0) + (s[j] ?? 0)) & 0xff;
    const ks = s[t] ?? 0;
    out[k] = (data[k] ?? 0) ^ ks;
  }

  return out;
}

