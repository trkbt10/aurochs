/**
 * @file BIFF FORMAT record parser
 */

export type FormatRecord = {
  readonly formatIndex: number;
  readonly formatCode: string;
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

export function parseFormatRecord(data: Uint8Array): FormatRecord {
  if (data.length < 5) {
    throw new Error(`Invalid FORMAT payload length: ${data.length} (expected >= 5)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const formatIndex = view.getUint16(0, true);
  const cch = view.getUint16(2, true);
  const grbit = data[4] ?? 0;

  const highByte = (grbit & 0x01) !== 0;
  const hasExt = (grbit & 0x04) !== 0;
  const hasRich = (grbit & 0x08) !== 0;
  if (hasExt || hasRich) {
    throw new Error(`Unsupported FORMAT string flags: 0x${grbit.toString(16)}`);
  }

  const charByteLength = highByte ? cch * 2 : cch;
  const start = 5;
  const end = start + charByteLength;
  if (data.length < end) {
    throw new Error(`Invalid FORMAT payload length: ${data.length} (need ${end})`);
  }

  const bytes = data.subarray(start, end);
  const formatCode = highByte ? decodeUtf16Le(bytes) : decodeCompressedAscii(bytes);
  return { formatIndex, formatCode };
}

