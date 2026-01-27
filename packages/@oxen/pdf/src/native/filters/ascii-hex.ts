/**
 * @file src/pdf/native/filters/ascii-hex.ts
 */

import { isWhite } from "../core/scan";

function hexValue(b: number): number | null {
  if (b >= 0x30 && b <= 0x39) {return b - 0x30;}
  if (b >= 0x41 && b <= 0x46) {return b - 0x41 + 10;}
  if (b >= 0x61 && b <= 0x66) {return b - 0x61 + 10;}
  return null;
}











/** Decode data using the PDF `/ASCIIHexDecode` filter. */
export function decodeAsciiHex(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  const state: { hi: number | null } = { hi: null };
  for (let i = 0; i < data.length; i += 1) {
    const b = data[i] ?? 0;
    if (b === 0x3e) {break;} // '>'
    if (isWhite(b)) {continue;}
    const v = hexValue(b);
    if (v == null) {continue;}
    if (state.hi == null) {
      state.hi = v;
    } else {
      out.push((state.hi << 4) | v);
      state.hi = null;
    }
  }
  if (state.hi != null) {
    out.push(state.hi << 4);
  }
  return new Uint8Array(out);
}
