import { describe, expect, it } from "vitest";

import { parseStringRecord } from "./string";

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

  it("throws on invalid payload length", () => {
    expect(() => parseStringRecord(new Uint8Array([0x00]))).toThrow(/STRING/);
  });

  it("throws on unsupported grbit", () => {
    const payload = new Uint8Array([0x00, 0x00, 0xff]);
    expect(() => parseStringRecord(payload)).toThrow(/Unsupported STRING grbit/);
  });
});

