import { describe, expect, it } from "vitest";
import { decodeLzw } from "./lzw";

type BitWriter = {
  readonly bytes: number[];
  bitPos: number;
};

function writeBitsMSB(w: BitWriter, n: number, value: number): void {
  for (let i = n - 1; i >= 0; i -= 1) {
    const bit = (value >> i) & 1;
    const byteIndex = Math.floor(w.bitPos / 8);
    const within = w.bitPos % 8;
    if (w.bytes[byteIndex] == null) w.bytes[byteIndex] = 0;
    if (bit) {
      w.bytes[byteIndex] |= 1 << (7 - within);
    }
    w.bitPos += 1;
  }
}

function shouldIncreaseCodeSize(nextCode: number, codeSize: number, earlyChange: 0 | 1): boolean {
  const limit = (1 << codeSize) - (earlyChange === 1 ? 1 : 0);
  return nextCode >= limit && codeSize < 12;
}

function lzwEncodePdf(data: Uint8Array, earlyChange: 0 | 1 = 1): Uint8Array {
  const CLEAR = 256;
  const EOD = 257;

  const dict = new Map<string, number>();
  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < 256; i += 1) dict.set(String.fromCharCode(i), i);
  };
  resetDict();

  let codeSize = 9;
  let nextCode = 258;

  const w: BitWriter = { bytes: [], bitPos: 0 };
  writeBitsMSB(w, codeSize, CLEAR);

  let phrase = "";
  for (const b of data) {
    const ch = String.fromCharCode(b);
    const nextPhrase = phrase + ch;
    if (dict.has(nextPhrase)) {
      phrase = nextPhrase;
      continue;
    }

    if (phrase.length > 0) {
      writeBitsMSB(w, codeSize, dict.get(phrase)!);
    }

    if (nextCode <= 4095) {
      dict.set(nextPhrase, nextCode);
      nextCode += 1;
      if (shouldIncreaseCodeSize(nextCode, codeSize, earlyChange)) codeSize += 1;
    }
    phrase = ch;
  }

  if (phrase.length > 0) {
    writeBitsMSB(w, codeSize, dict.get(phrase)!);
  }

  writeBitsMSB(w, codeSize, EOD);
  return new Uint8Array(w.bytes);
}

describe("LZWDecode (PDF)", () => {
  it("roundtrips common ASCII payload (EarlyChange=1)", () => {
    const input = new TextEncoder().encode("TOBEORNOTTOBEORTOBEORNOT");
    const encoded = lzwEncodePdf(input, 1);
    const decoded = decodeLzw(encoded, { earlyChange: 1 });
    expect(new TextDecoder().decode(decoded)).toBe("TOBEORNOTTOBEORTOBEORNOT");
  });

  it("roundtrips binary payload (EarlyChange=0)", () => {
    const input = new Uint8Array([0, 1, 2, 3, 4, 5, 0, 1, 2, 250, 251, 252, 253, 254, 255, 0, 1]);
    const encoded = lzwEncodePdf(input, 0);
    const decoded = decodeLzw(encoded, { earlyChange: 0 });
    expect(decoded).toEqual(input);
  });
});

