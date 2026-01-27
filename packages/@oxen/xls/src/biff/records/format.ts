/**
 * @file BIFF FORMAT record parser
 */

export type FormatRecord = {
  readonly formatIndex: number;
  readonly formatCode: string;
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

/** Parse a BIFF FORMAT (0x041E) record payload. */
export function parseFormatRecord(data: Uint8Array): FormatRecord {
  if (data.length < 3) {
    throw new Error(`Invalid FORMAT payload length: ${data.length} (expected >= 3)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const formatIndex = view.getUint16(0, true);

  // BIFF8: ifmt(2) + cch(2) + grbit(1) + rgb(var)
  // BIFF5/7: ifmt(2) + cch(1) + rgb(var)
  if (data.length >= 5) {
    const cch = view.getUint16(2, true);
    const grbit = data[4] ?? 0;
    const allowedMask = 0x0d; // fHighByte | fExtSt | fRichSt
    const hasUnexpectedBits = (grbit & ~allowedMask) !== 0;
    const hasExt = (grbit & 0x04) !== 0;
    const hasRich = (grbit & 0x08) !== 0;
    if (!hasUnexpectedBits && !hasExt && !hasRich) {
      const highByte = (grbit & 0x01) !== 0;
      const charByteLength = highByte ? cch * 2 : cch;
      const start = 5;
      const end = start + charByteLength;
      if (data.length >= end) {
        const bytes = data.subarray(start, end);
        const formatCode = highByte ? decodeUtf16Le(bytes) : decodeCompressedAscii(bytes);
        return { formatIndex, formatCode };
      }
    }
  }

  // Legacy fallback (BIFF5/7)
  const cch = data[2] ?? 0;
  const start = 3;
  const end = Math.min(start + cch, data.length);
  const bytes = data.subarray(start, end);
  const formatCode = decodeCompressedAscii(bytes);
  return { formatIndex, formatCode };
}
