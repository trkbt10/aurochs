









export function decodeRunLength(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const len = data[i] ?? 0;
    i += 1;
    if (len === 128) {break;} // EOD
    if (len <= 127) {
      const count = len + 1;
      for (let k = 0; k < count; k += 1) {
        out.push(data[i + k] ?? 0);
      }
      i += count;
      continue;
    }
    // 129..255: repeat next byte (257-len) times
    const count = 257 - len;
    const value = data[i] ?? 0;
    i += 1;
    for (let k = 0; k < count; k += 1) {out.push(value);}
  }
  return new Uint8Array(out);
}

