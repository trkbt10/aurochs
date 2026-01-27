/**
 * @file BIFF STYLE record parser
 */

import { parseShortUnicodeString } from "../strings/short-unicode-string";
import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type BuiltInStyle = {
  readonly kind: "builtIn";
  readonly styleXfIndex: number;
  readonly builtInStyleId: number;
  readonly outlineLevel: number;
};

export type UserDefinedStyle = {
  readonly kind: "userDefined";
  readonly styleXfIndex: number;
  readonly name: string;
};

export type StyleRecord = BuiltInStyle | UserDefinedStyle;

/** Parse a BIFF STYLE (0x0293) record payload. */
export function parseStyleRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): StyleRecord {
  if (data.length < 2) {
    throw new Error(`Invalid STYLE payload length: ${data.length} (expected >= 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ixfeRaw = view.getUint16(0, true);
  const isBuiltIn = (ixfeRaw & 0x8000) !== 0;
  const styleXfIndex = ixfeRaw & 0x0fff;

  if (isBuiltIn) {
    if (data.length < 4) {
      throw new Error(`Invalid STYLE (built-in) payload length: ${data.length} (expected >= 4)`);
    }
    return {
      kind: "builtIn",
      styleXfIndex,
      builtInStyleId: data[2] ?? 0,
      outlineLevel: data[3] ?? 0,
    };
  }

  if (data.length < 3) {
    throw new Error(`Invalid STYLE (user-defined) payload length: ${data.length} (expected >= 3)`);
  }
  const decodeLegacyStyleName = (bytes: Uint8Array): string => new TextDecoder("latin1").decode(bytes);
  function parseStyleName(namePayload: Uint8Array, cch: number): { readonly name: string; readonly consumedBytes: number } {
    try {
      const parsed = parseShortUnicodeString(namePayload, cch);
      return { name: parsed.text, consumedBytes: parsed.byteLength };
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "STYLE_NAME_FALLBACK_LEGACY",
          where: "STYLE",
          message: "Failed to parse BIFF8 short unicode style name; falling back to legacy 8-bit name decoding.",
          meta: { cch, payloadLength: namePayload.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
      // BIFF5/7 store style names as 8-bit strings (no unicode flags byte).
      const byteLen = Math.min(cch, namePayload.length);
      return { name: decodeLegacyStyleName(namePayload.subarray(0, byteLen)), consumedBytes: byteLen };
    }
  }
  const cch = data[2] ?? 0;
  const namePayload = data.subarray(3);
  const { name, consumedBytes } = parseStyleName(namePayload, cch);
  const consumed = 3 + consumedBytes;
  if (data.length < consumed) {
    throw new Error(`Invalid STYLE payload length: ${data.length} (need >= ${consumed})`);
  }
  return { kind: "userDefined", styleXfIndex, name };
}
