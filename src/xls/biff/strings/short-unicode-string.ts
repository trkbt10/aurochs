/**
 * @file BIFF8 short unicode string parser (1-byte cch)
 *
 * Used by records such as BOUNDSHEET where the character count is stored as 1 byte.
 */

export type ShortUnicodeString = {
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

/**
 * Parse a BIFF8 "short" unicode string where cch is provided out-of-band (1 byte).
 *
 * Layout:
 * - 1 byte: option flags (grbit)
 * - N bytes: character data (compressed 1-byte or uncompressed 2-byte UTF-16LE)
 *
 * Notes:
 * - Only bit0 (fHighByte) is supported here. If rich/ext flags are set, this function throws.
 */
export function parseShortUnicodeString(payload: Uint8Array, cch: number): ShortUnicodeString {
  if (!Number.isInteger(cch) || cch < 0 || cch > 255) {
    throw new Error(`Invalid cch: ${cch}`);
  }
  if (payload.length < 1) {
    throw new Error("Short unicode string payload is too short (missing grbit)");
  }

  const grbit = payload[0];
  const highByte = (grbit & 0x01) !== 0;
  const hasExt = (grbit & 0x04) !== 0;
  const hasRich = (grbit & 0x08) !== 0;

  if (hasExt || hasRich) {
    throw new Error(`Unsupported short unicode string flags: 0x${grbit.toString(16)}`);
  }

  const charByteLength = highByte ? cch * 2 : cch;
  const totalLength = 1 + charByteLength;
  if (payload.length < totalLength) {
    throw new Error(
      `Short unicode string payload is too short (need ${totalLength} bytes, have ${payload.length})`,
    );
  }

  const charBytes = payload.subarray(1, 1 + charByteLength);
  const text = highByte ? decodeUtf16Le(charBytes) : decodeCompressedAscii(charBytes);

  return { text, byteLength: totalLength, highByte };
}
