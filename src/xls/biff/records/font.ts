/**
 * @file BIFF FONT record parser
 */

import { parseShortUnicodeString } from "../strings/short-unicode-string";

export type FontRecord = {
  /** Height in 1/20th point (twips) */
  readonly heightTwips: number;
  readonly isItalic: boolean;
  readonly isStrikeout: boolean;
  readonly isOutline: boolean;
  readonly isShadow: boolean;
  readonly colorIndex: number;
  /** Character weight (e.g. 0x190 normal, 0x2BC bold) */
  readonly weight: number;
  /** 0=none, 1=superscript, 2=subscript */
  readonly script: number;
  /** Underline style code */
  readonly underline: number;
  readonly family: number;
  readonly charset: number;
  readonly name: string;
};

export function parseFontRecord(data: Uint8Array): FontRecord {
  if (data.length < 16) {
    throw new Error(`Invalid FONT payload length: ${data.length} (expected >= 16)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const dyHeight = view.getUint16(0, true);
  const grbit = view.getUint16(2, true);
  const icv = view.getUint16(4, true);
  const bls = view.getUint16(6, true);
  const sss = view.getUint16(8, true);
  const uls = data[10] ?? 0;
  const bFamily = data[11] ?? 0;
  const bCharSet = data[12] ?? 0;
  const reserved = data[13] ?? 0;
  if (reserved !== 0) {
    throw new Error(`Invalid FONT reserved field: ${reserved}`);
  }
  const cch = data[14] ?? 0;

  const nameParsed = parseShortUnicodeString(data.subarray(15), cch);
  if (data.length !== 15 + nameParsed.byteLength) {
    throw new Error(`Invalid FONT payload length: ${data.length} (expected ${15 + nameParsed.byteLength})`);
  }

  return {
    heightTwips: dyHeight,
    isItalic: (grbit & 0x0002) !== 0,
    isStrikeout: (grbit & 0x0008) !== 0,
    isOutline: (grbit & 0x0010) !== 0,
    isShadow: (grbit & 0x0020) !== 0,
    colorIndex: icv,
    weight: bls,
    script: sss,
    underline: uls,
    family: bFamily,
    charset: bCharSet,
    name: nameParsed.text,
  };
}
