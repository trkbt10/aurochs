/**
 * @file BIFF STRING record tests
 */

import { parseStringRecord } from "./string";
import { createXlsWarningCollector } from "../../warnings";

describe("parseStringRecord", () => {
  it("parses compressed strings", () => {
    const text = "ABC";
    const payload = new Uint8Array([0x03, 0x00, 0x00, 0x41, 0x42, 0x43]);
    expect(parseStringRecord(payload)).toEqual({ text });
  });

  it("parses UTF-16LE strings", () => {
    const payload = new Uint8Array([0x01, 0x00, 0x01, 0x41, 0x00]);
    expect(parseStringRecord(payload)).toEqual({ text: "A" });
  });

  it("parses continued strings across CONTINUE fragments (compressed)", () => {
    const base = new Uint8Array([0x05, 0x00, 0x00, 0x48, 0x45]); // "HE"
    const cont = new Uint8Array([0x00, 0x4c, 0x4c, 0x4f]); // flag + "LLO"
    expect(parseStringRecord(base, [cont])).toEqual({ text: "HELLO" });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseStringRecord(new Uint8Array([0x00]))).toThrow(/STRING/);
  });

  it("throws on unsupported grbit", () => {
    const payload = new Uint8Array([0x00, 0x00, 0xff]);
    expect(() => parseStringRecord(payload)).toThrow(/Unsupported STRING grbit/);
  });

  it("warns and returns empty string when continued data is missing in lenient mode", () => {
    const base = new Uint8Array([0x05, 0x00, 0x00, 0x48, 0x45]); // declares "HELLO" but only "HE"
    const collector = createXlsWarningCollector();
    expect(parseStringRecord(base, [], { mode: "lenient", warn: collector.warn })).toEqual({ text: "" });
    expect(collector.warnings.map((w) => w.code)).toContain("STRING_CONTINUE_TRUNCATED");
  });
});
