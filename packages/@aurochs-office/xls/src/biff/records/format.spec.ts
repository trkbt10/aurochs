/**
 * @file FORMAT record parser tests
 */

import { parseFormatRecord } from "./format";

function u16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

describe("xls/biff/records/format", () => {
  it("parses compressed format string", () => {
    const data = new Uint8Array([
      ...u16le(0x00a4),
      ...u16le(3),
      0x00, // grbit
      0x30,
      0x2e,
      0x30, // "0.0"
    ]);
    expect(parseFormatRecord(data)).toEqual({ formatIndex: 0x00a4, formatCode: "0.0" });
  });

  it("parses UTF-16LE format string", () => {
    const data = new Uint8Array([
      ...u16le(0x00a5),
      ...u16le(2),
      0x01, // grbit (high byte)
      0x44,
      0x30, // "い"
      0x46,
      0x30, // "う"
    ]);
    expect(parseFormatRecord(data)).toEqual({ formatIndex: 0x00a5, formatCode: "いう" });
  });

  it("falls back to BIFF5/7-style 8-bit format strings when BIFF8 flags are not plausible", () => {
    const data = new Uint8Array([
      ...u16le(0x00a4),
      3, // cch (1 byte)
      0x30,
      0x2e,
      0x30, // "0.0"
    ]);
    expect(parseFormatRecord(data)).toEqual({ formatIndex: 0x00a4, formatCode: "0.0" });
  });
});
