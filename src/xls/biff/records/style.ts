/**
 * @file BIFF STYLE record parser
 */

import { parseShortUnicodeString } from "../strings/short-unicode-string";

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

export function parseStyleRecord(data: Uint8Array): StyleRecord {
  if (data.length < 2) {
    throw new Error(`Invalid STYLE payload length: ${data.length} (expected >= 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ixfeRaw = view.getUint16(0, true);
  const isBuiltIn = (ixfeRaw & 0x8000) !== 0;
  const styleXfIndex = ixfeRaw & 0x0fff;

  if (isBuiltIn) {
    if (data.length !== 4) {
      throw new Error(`Invalid STYLE (built-in) payload length: ${data.length} (expected 4)`);
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
  const cch = data[2] ?? 0;
  const nameParsed = parseShortUnicodeString(data.subarray(3), cch);
  if (data.length !== 3 + nameParsed.byteLength) {
    throw new Error(`Invalid STYLE payload length: ${data.length} (expected ${3 + nameParsed.byteLength})`);
  }
  return { kind: "userDefined", styleXfIndex, name: nameParsed.text };
}
