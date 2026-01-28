/**
 * @file src/pdf/parser/jpeg2000/jp2.ts
 *
 * Minimal JP2 box parsing to extract the JPEG2000 codestream (jp2c).
 */

import { readAscii4, readU32BE } from "./bytes";

const JP2_SIGNATURE = new Uint8Array([0x0d, 0x0a, 0x87, 0x0a]);






export function extractJp2Codestream(jpxBytes: Uint8Array): Uint8Array {
  if (!jpxBytes) {throw new Error("jpxBytes is required");}
  if (jpxBytes.length < 12) {throw new Error("JP2: input too short");}

  // If it starts with SOC, treat as a raw codestream.
  if ((jpxBytes[0] ?? 0) === 0xff && (jpxBytes[1] ?? 0) === 0x4f) {
    return jpxBytes;
  }

  // JP2 signature box: length=12, type="jP  ", magic.
  const sigLen = readU32BE(jpxBytes, 0);
  const sigType = readAscii4(jpxBytes, 4);
  if (sigLen !== 12 || sigType !== "jP  ") {
    throw new Error("JP2: missing signature box");
  }
  for (let i = 0; i < 4; i += 1) {
    if ((jpxBytes[8 + i] ?? 0) !== (JP2_SIGNATURE[i] ?? 0)) {
      throw new Error("JP2: invalid signature");
    }
  }

  let pos = 12;
  while (pos + 8 <= jpxBytes.length) {
    const lbox = readU32BE(jpxBytes, pos);
    const tbox = readAscii4(jpxBytes, pos + 4);
    pos += 8;

    let boxSize = lbox;
    if (boxSize === 1) {
      // XLBox (64-bit). We only support sizes that fit in 32-bit for now.
      if (pos + 8 > jpxBytes.length) {throw new Error("JP2: truncated XLBox");}
      const hi = readU32BE(jpxBytes, pos);
      const lo = readU32BE(jpxBytes, pos + 4);
      pos += 8;
      if (hi !== 0) {throw new Error("JP2: XLBox too large");}
      boxSize = lo;
      if (boxSize < 16) {throw new Error("JP2: invalid XLBox size");}
      // boxSize includes the 16-byte header.
      const payloadSize = boxSize - 16;
      const payloadStart = pos;
      const payloadEnd = payloadStart + payloadSize;
      if (payloadEnd > jpxBytes.length) {throw new Error("JP2: truncated box payload");}
      if (tbox === "jp2c") {
        return jpxBytes.slice(payloadStart, payloadEnd);
      }
      pos = payloadEnd;
      continue;
    }

    if (boxSize === 0) {
      // box extends to end of file.
      if (tbox === "jp2c") {return jpxBytes.slice(pos);}
      return jpxBytes;
    }

    if (boxSize < 8) {throw new Error("JP2: invalid box size");}
    const payloadSize = boxSize - 8;
    const payloadStart = pos;
    const payloadEnd = payloadStart + payloadSize;
    if (payloadEnd > jpxBytes.length) {throw new Error("JP2: truncated box payload");}
    if (tbox === "jp2c") {
      return jpxBytes.slice(payloadStart, payloadEnd);
    }
    pos = payloadEnd;
  }

  throw new Error("JP2: missing jp2c codestream box");
}

