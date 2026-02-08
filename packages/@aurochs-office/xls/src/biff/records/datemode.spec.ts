/**
 * @file BIFF DATEMODE record tests
 */

import { parseDatemodeRecord } from "./datemode";
import { createXlsWarningCollector } from "../../warnings";

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

  it("tolerates invalid values by interpreting as a boolean flag", () => {
    const collector = createXlsWarningCollector();
    expect(parseDatemodeRecord(new Uint8Array([0x02, 0x00]), { mode: "lenient", warn: collector.warn })).toEqual({ dateSystem: "1900" });
    expect(parseDatemodeRecord(new Uint8Array([0x03, 0x00]), { mode: "lenient", warn: collector.warn })).toEqual({ dateSystem: "1904" });
    expect(collector.warnings.map((w) => w.code)).toContain("DATEMODE_NON_BOOLEAN");
  });

  it("throws on invalid values in strict mode", () => {
    expect(() => parseDatemodeRecord(new Uint8Array([0x02, 0x00]), { mode: "strict" })).toThrow(/Invalid DATEMODE value/);
  });
});
