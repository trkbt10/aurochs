/**
 * @file src/pdf/parser/jpeg2000/jp2.ts
 *
 * Minimal JP2 box parsing to extract the JPEG2000 codestream (jp2c).
 */

import { readAscii4, readU32BE } from "./bytes";

const JP2_SIGNATURE = new Uint8Array([0x0d, 0x0a, 0x87, 0x0a]);































/** Extract the JPEG 2000 codestream from a JP2 file container. */
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

  // Parser state for JP2 box traversal
  const parserState = { pos: 12 };
  while (parserState.pos + 8 <= jpxBytes.length) {
    const lbox = readU32BE(jpxBytes, parserState.pos);
    const tbox = readAscii4(jpxBytes, parserState.pos + 4);
    parserState.pos += 8;

    const boxState = { size: lbox };
    if (boxState.size === 1) {
      // XLBox (64-bit). We only support sizes that fit in 32-bit for now.
      if (parserState.pos + 8 > jpxBytes.length) {throw new Error("JP2: truncated XLBox");}
      const hi = readU32BE(jpxBytes, parserState.pos);
      const lo = readU32BE(jpxBytes, parserState.pos + 4);
      parserState.pos += 8;
      if (hi !== 0) {throw new Error("JP2: XLBox too large");}
      boxState.size = lo;
      if (boxState.size < 16) {throw new Error("JP2: invalid XLBox size");}
      // boxState.size includes the 16-byte header.
      const payloadSize = boxState.size - 16;
      const payloadStart = parserState.pos;
      const payloadEnd = payloadStart + payloadSize;
      if (payloadEnd > jpxBytes.length) {throw new Error("JP2: truncated box payload");}
      if (tbox === "jp2c") {
        return jpxBytes.slice(payloadStart, payloadEnd);
      }
      parserState.pos = payloadEnd;
      continue;
    }

    if (boxState.size === 0) {
      // box extends to end of file.
      if (tbox === "jp2c") {return jpxBytes.slice(parserState.pos);}
      return jpxBytes;
    }

    if (boxState.size < 8) {throw new Error("JP2: invalid box size");}
    const payloadSize = boxState.size - 8;
    const payloadStart = parserState.pos;
    const payloadEnd = payloadStart + payloadSize;
    if (payloadEnd > jpxBytes.length) {throw new Error("JP2: truncated box payload");}
    if (tbox === "jp2c") {
      return jpxBytes.slice(payloadStart, payloadEnd);
    }
    parserState.pos = payloadEnd;
  }

  throw new Error("JP2: missing jp2c codestream box");
}

