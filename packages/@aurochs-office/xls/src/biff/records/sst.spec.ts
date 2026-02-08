/**
 * @file SST record parser tests
 */

import { parseSstRecord } from "./sst";
import { createXlsWarningCollector } from "../../warnings";

function u16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function encodeCompressedAscii(text: string): number[] {
  return Array.from(text).map((c) => {
    const codeUnit = c.charCodeAt(0);
    if (codeUnit > 0xff) {
      throw new Error(`encodeCompressedAscii: non-ASCII code unit 0x${codeUnit.toString(16)}`);
    }
    return codeUnit;
  });
}

function encodeUtf16LeCodeUnits(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push(...u16le(text.charCodeAt(i)));
  }
  return out;
}

describe("xls/biff/records/sst", () => {
  it("parses a single-fragment SST with one compressed string", () => {
    const data = new Uint8Array([
      ...u32le(1), // total
      ...u32le(1), // unique
      ...u16le(3), // cch
      0x00, // grbit (compressed)
      0x41,
      0x42,
      0x43, // "ABC"
    ]);

    const sst = parseSstRecord(data, []);
    expect(sst.totalCount).toBe(1);
    expect(sst.uniqueCount).toBe(1);
    expect(sst.strings).toEqual(["ABC"]);
  });

  it("parses an empty string entry", () => {
    const data = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(0), // cch=0
      0x00, // grbit (compressed)
      // no character bytes
    ]);

    const sst = parseSstRecord(data, []);
    expect(sst.strings).toEqual([""]);
  });

  it("parses a continued string across a CONTINUE fragment (compressed)", () => {
    const base = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(5), // "HELLO"
      0x00, // grbit
      0x48,
      0x45, // "HE" then cut
    ]);

    const cont = new Uint8Array([
      0x00, // CONTINUE string encoding flag (compressed)
      0x4c,
      0x4c,
      0x4f, // "LLO"
    ]);

    const sst = parseSstRecord(base, [cont]);
    expect(sst.strings).toEqual(["HELLO"]);
  });

  it("parses a very long string split across a CONTINUE fragment", () => {
    const text = "A".repeat(1024);
    const prefix = "A".repeat(20);
    const suffix = "A".repeat(text.length - prefix.length);

    const base = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(text.length),
      0x00, // grbit (compressed)
      ...encodeCompressedAscii(prefix),
    ]);

    const cont = new Uint8Array([0x00, ...encodeCompressedAscii(suffix)]);

    const sst = parseSstRecord(base, [cont]);
    expect(sst.strings).toEqual([text]);
  });

  it("parses a continued string across a CONTINUE fragment (uncompressed)", () => {
    // "いう" => U+3044 U+3046
    const base = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(2),
      0x01, // grbit (uncompressed)
      0x44,
      0x30, // first char "い"
    ]);

    const cont = new Uint8Array([
      0x01, // CONTINUE encoding flag (uncompressed)
      0x46,
      0x30, // second char "う"
    ]);

    const sst = parseSstRecord(base, [cont]);
    expect(sst.strings).toEqual(["いう"]);
  });

  it("parses a surrogate pair (emoji) when stored as two UTF-16 code units", () => {
    const text = "😀";
    expect(text.length).toBe(2);

    const data = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(text.length), // cch = 2 code units
      0x01, // grbit (uncompressed)
      ...encodeUtf16LeCodeUnits(text),
    ]);

    const sst = parseSstRecord(data, []);
    expect(sst.strings).toEqual([text]);
  });

  it("parses multiple strings when fragment boundary is between strings", () => {
    const base = new Uint8Array([
      ...u32le(2),
      ...u32le(2),
      ...u16le(1),
      0x00,
      0x41, // "A" ends exactly at base end
    ]);

    const cont = new Uint8Array([
      ...u16le(1),
      0x00,
      0x42, // "B" begins in CONTINUE, no encoding flag inserted
    ]);

    const sst = parseSstRecord(base, [cont]);
    expect(sst.strings).toEqual(["A", "B"]);
  });

  it("skips rich-text formatting runs (even when formatting bytes are in CONTINUE)", () => {
    const base = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(3), // "ABC"
      0x08, // grbit: fRichSt=1, compressed
      ...u16le(1), // cRun=1
      0x41,
      0x42,
      0x43,
      // formatting run bytes are in CONTINUE (no string encoding flag here)
    ]);

    const cont = new Uint8Array([0x00, 0x00, 0x00, 0x00]); // one run (4 bytes)
    const sst = parseSstRecord(base, [cont]);
    expect(sst.strings).toEqual(["ABC"]);
  });

  it("skips extended string data (even when ext bytes are in CONTINUE)", () => {
    const base = new Uint8Array([
      ...u32le(1),
      ...u32le(1),
      ...u16le(1), // "X"
      0x04, // grbit: fExtSt=1, compressed
      ...u32le(5), // cbExtRst=5
      0x58, // "X"
      // ext bytes are in CONTINUE
    ]);

    const cont = new Uint8Array([1, 2, 3, 4, 5]);
    const sst = parseSstRecord(base, [cont]);
    expect(sst.strings).toEqual(["X"]);
  });

  it("warns and truncates when the SST ends early in lenient mode", () => {
    const data = new Uint8Array([
      ...u32le(2), // total
      ...u32le(2), // unique (declared 2 strings)
      ...u16le(1),
      0x00,
      0x41, // only one string: "A"
    ]);

    const collector = createXlsWarningCollector();
    const sst = parseSstRecord(data, [], { mode: "lenient", warn: collector.warn });
    expect(sst.strings).toEqual(["A"]);
    expect(collector.warnings.map((w) => w.code)).toContain("SST_TRUNCATED");
  });

  it("throws when the SST ends early in strict mode", () => {
    const data = new Uint8Array([
      ...u32le(2),
      ...u32le(2),
      ...u16le(1),
      0x00,
      0x41,
    ]);
    expect(() => parseSstRecord(data, [], { mode: "strict" })).toThrow(/SST/);
  });
});
