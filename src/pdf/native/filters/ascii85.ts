import { isWhite } from "../scan";

export function decodeAscii85(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  const group: number[] = [];

  let i = 0;
  while (i < data.length) {
    const b = data[i] ?? 0;

    // terminator "~>"
    if (b === 0x7e && (data[i + 1] ?? 0) === 0x3e) {
      i += 2;
      break;
    }

    i += 1;
    if (isWhite(b)) continue;

    if (b === 0x7a) {
      // 'z' -> 4 zeros, only valid at group boundary
      if (group.length !== 0) {
        throw new Error("ASCII85: 'z' inside group");
      }
      out.push(0, 0, 0, 0);
      continue;
    }

    if (b < 0x21 || b > 0x75) {
      // ignore invalid bytes (best-effort)
      continue;
    }

    group.push(b - 0x21);
    if (group.length === 5) {
      let value = 0;
      for (let j = 0; j < 5; j += 1) value = value * 85 + (group[j] ?? 0);
      out.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
      group.length = 0;
    }
  }

  if (group.length > 0) {
    // pad with 'u' (84)
    const n = group.length;
    while (group.length < 5) group.push(84);
    let value = 0;
    for (let j = 0; j < 5; j += 1) value = value * 85 + (group[j] ?? 0);
    const bytes = [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
    // emit n-1 bytes
    for (let k = 0; k < n - 1; k += 1) out.push(bytes[k] ?? 0);
  }

  return new Uint8Array(out);
}

