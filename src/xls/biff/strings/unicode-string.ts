/**
 * @file BIFF8 unicode string parser (2-byte cch + 1-byte grbit)
 */

export type UnicodeString = {
  readonly text: string;
  readonly byteLength: number;
  readonly highByte: boolean;
};

function decodeCompressedAscii(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += String.fromCharCode(b);
  }
  return out;
}

function decodeUtf16Le(bytes: Uint8Array): string {
  if (bytes.length % 2 !== 0) {
    throw new Error(`Invalid UTF-16LE byte length: ${bytes.length}`);
  }
  let out = "";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < bytes.length; offset += 2) {
    out += String.fromCharCode(view.getUint16(offset, true));
  }
  return out;
}

/**
 * Parse a BIFF8 unicode string starting at offset 0:
 * - 2 bytes cch (number of characters)
 * - 1 byte grbit (option flags)
 * - (optional) 2 bytes cRun if fRichSt
 * - (optional) 4 bytes cbExtRst if fExtSt
 * - rgb characters
 * - (optional) formatting runs
 * - (optional) extended string data
 *
 * This helper supports reading the full structure (including skipping rich/ext),
 * but returns only the decoded plain text and total byte length consumed.
 */
export function parseUnicodeString(data: Uint8Array): UnicodeString {
  if (data.length < 3) {
    throw new Error("Unicode string payload is too short");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const cch = view.getUint16(0, true);
  const grbit = data[2] ?? 0;

  const highByte = (grbit & 0x01) !== 0;
  const hasExt = (grbit & 0x04) !== 0;
  const hasRich = (grbit & 0x08) !== 0;

  let offset = 3;
  let cRun = 0;
  if (hasRich) {
    if (data.length < offset + 2) {
      throw new Error("Unicode string payload is too short (missing cRun)");
    }
    cRun = view.getUint16(offset, true);
    offset += 2;
  }

  let cbExtRst = 0;
  if (hasExt) {
    if (data.length < offset + 4) {
      throw new Error("Unicode string payload is too short (missing cbExtRst)");
    }
    cbExtRst = view.getUint32(offset, true);
    offset += 4;
  }

  const charByteLength = highByte ? cch * 2 : cch;
  if (data.length < offset + charByteLength) {
    throw new Error("Unicode string payload is too short (missing character data)");
  }

  const charBytes = data.subarray(offset, offset + charByteLength);
  const text = highByte ? decodeUtf16Le(charBytes) : decodeCompressedAscii(charBytes);
  offset += charByteLength;

  const runByteLength = cRun * 4;
  if (data.length < offset + runByteLength + cbExtRst) {
    throw new Error("Unicode string payload is too short (missing rich/ext data)");
  }
  offset += runByteLength + cbExtRst;

  return { text, byteLength: offset, highByte };
}

