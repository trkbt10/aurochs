/**
 * @file BIFF8 unicode string parser (2-byte cch + 1-byte grbit)
 */

export type UnicodeString = {
  readonly text: string;
  readonly byteLength: number;
  readonly highByte: boolean;
};

const LATIN1_DECODER = new TextDecoder("latin1");
const UTF16LE_DECODER = new TextDecoder("utf-16le");

function decodeCompressedAscii(bytes: Uint8Array): string {
  return LATIN1_DECODER.decode(bytes);
}

function decodeUtf16Le(bytes: Uint8Array): string {
  if (bytes.length % 2 !== 0) {
    throw new Error(`Invalid UTF-16LE byte length: ${bytes.length}`);
  }
  return UTF16LE_DECODER.decode(bytes);
}

type OffsetCursor = { offset: number };

function requireAvailable(data: Uint8Array, offset: number, byteLength: number, where: string): void {
  if (data.length < offset + byteLength) {
    throw new Error(`Unicode string payload is too short (${where})`);
  }
}

function readUint16LEAt(view: DataView, cursor: OffsetCursor, data: Uint8Array, where: string): number {
  requireAvailable(data, cursor.offset, 2, where);
  const value = view.getUint16(cursor.offset, true);
  cursor.offset += 2;
  return value;
}

function readUint32LEAt(view: DataView, cursor: OffsetCursor, data: Uint8Array, where: string): number {
  requireAvailable(data, cursor.offset, 4, where);
  const value = view.getUint32(cursor.offset, true);
  cursor.offset += 4;
  return value;
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

  const cursor: OffsetCursor = { offset: 3 };
  const cRun = hasRich ? readUint16LEAt(view, cursor, data, "missing cRun") : 0;
  const cbExtRst = hasExt ? readUint32LEAt(view, cursor, data, "missing cbExtRst") : 0;

  const charByteLength = highByte ? cch * 2 : cch;
  requireAvailable(data, cursor.offset, charByteLength, "missing character data");

  const charBytes = data.subarray(cursor.offset, cursor.offset + charByteLength);
  const text = highByte ? decodeUtf16Le(charBytes) : decodeCompressedAscii(charBytes);
  cursor.offset += charByteLength;

  const runByteLength = cRun * 4;
  requireAvailable(data, cursor.offset, runByteLength + cbExtRst, "missing rich/ext data");
  cursor.offset += runByteLength + cbExtRst;

  return { text, byteLength: cursor.offset, highByte };
}
