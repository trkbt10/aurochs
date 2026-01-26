import { parseDatemodeRecord } from "./datemode";

describe("parseDatemodeRecord", () => {
  it("parses 1900 date system", () => {
    expect(parseDatemodeRecord(new Uint8Array([0x00, 0x00]))).toEqual({ dateSystem: "1900" });
  });

  it("parses 1904 date system", () => {
    expect(parseDatemodeRecord(new Uint8Array([0x01, 0x00]))).toEqual({ dateSystem: "1904" });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseDatemodeRecord(new Uint8Array([]))).toThrow(/DATEMODE/);
  });

  it("throws on invalid value", () => {
    expect(() => parseDatemodeRecord(new Uint8Array([0x02, 0x00]))).toThrow(/Invalid DATEMODE value/);
  });
});
