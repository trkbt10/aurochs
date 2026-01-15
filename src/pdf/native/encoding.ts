const LATIN1_DECODER = new TextDecoder("latin1");

export function decodeLatin1(bytes: Uint8Array): string {
  return LATIN1_DECODER.decode(bytes);
}

export function encodeAscii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

