/**
 * @file BIFF STRING record parser
 */

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

export type StringRecord = {
  readonly text: string;
};

/**
 * Parse a BIFF STRING (0x0207) record data payload.
 *
 * Record data:
 * - cch: 2 bytes
 * - grbit: 1 byte (0=compressed, 1=uncompressed)
 * - rgch: char data
 */
export function parseStringRecord(data: Uint8Array): StringRecord {
  if (data.length < 3) {
    throw new Error(`Invalid STRING payload length: ${data.length} (expected >= 3)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const cch = view.getUint16(0, true);
  const grbit = data[2] ?? 0;
  if (grbit !== 0 && grbit !== 1) {
    throw new Error(`Unsupported STRING grbit: 0x${grbit.toString(16)}`);
  }
  const highByte = grbit === 1;

  const bytesPerChar = highByte ? 2 : 1;
  const byteLen = cch * bytesPerChar;
  const start = 3;
  const end = start + byteLen;
  if (data.length < end) {
    throw new Error(`Invalid STRING payload length: ${data.length} (need ${end})`);
  }

  const rgch = data.subarray(start, end);
  const text = highByte ? decodeUtf16Le(rgch) : decodeCompressedAscii(rgch);
  return { text };
}

