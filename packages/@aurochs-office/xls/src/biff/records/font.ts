/**
 * @file BIFF FONT record parser
 */

import { parseShortUnicodeString } from "../strings/short-unicode-string";
import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

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

/** Parse a BIFF FONT (0x0231) record payload. */
export function parseFontRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): FontRecord {
  if (data.length < 16) {
    throw new Error(`Invalid FONT payload length: ${data.length} (expected >= 16)`);
  }

  const decodeLegacyFontName = (bytes: Uint8Array): string => new TextDecoder("latin1").decode(bytes);

  function parseFontName(namePayload: Uint8Array, cch: number): { readonly name: string; readonly consumedBytes: number } {
    try {
      const parsed = parseShortUnicodeString(namePayload, cch);
      return { name: parsed.text, consumedBytes: parsed.byteLength };
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "FONT_NAME_FALLBACK_LEGACY",
          where: "FONT",
          message: "Failed to parse BIFF8 short unicode font name; falling back to legacy 8-bit name decoding.",
          meta: { cch, payloadLength: namePayload.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
      // BIFF5/7 store the font name as an 8-bit string (no unicode flags byte).
      const byteLen = Math.min(cch, namePayload.length);
      return { name: decodeLegacyFontName(namePayload.subarray(0, byteLen)), consumedBytes: byteLen };
    }
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
  const cch = data[14] ?? 0;

  const namePayload = data.subarray(15);
  const { name, consumedBytes } = parseFontName(namePayload, cch);
  if (data.length < 15 + consumedBytes) {
    throw new Error(`Invalid FONT payload length: ${data.length} (need >= ${15 + consumedBytes})`);
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
    name,
  };
}
