import { isWhite } from "../scan";

function hexValue(b: number): number | null {
  if (b >= 0x30 && b <= 0x39) return b - 0x30;
  if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
  if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
  return null;
}

export function decodeAsciiHex(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let hi: number | null = null;
  for (let i = 0; i < data.length; i += 1) {
    const b = data[i] ?? 0;
    if (b === 0x3e) break; // '>'
    if (isWhite(b)) continue;
    const v = hexValue(b);
    if (v == null) continue;
    if (hi == null) {
      hi = v;
    } else {
      out.push((hi << 4) | v);
      hi = null;
    }
  }
  if (hi != null) {
    out.push(hi << 4);
  }
  return new Uint8Array(out);
}

