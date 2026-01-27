/**
 * @file BIFF PALETTE record tests
 */

import { parsePaletteRecord } from "./palette";
import { createXlsWarningCollector } from "../../warnings";

describe("parsePaletteRecord", () => {
  it("parses palette colors as FFRRGGBB strings", () => {
    // ccv=2, colors: (1,2,3), (255,0,16)
    const payload = new Uint8Array([
      0x02, 0x00,
      0x01, 0x02, 0x03, 0x00,
      0xff, 0x00, 0x10, 0x00,
    ]);
    expect(parsePaletteRecord(payload)).toEqual({ colors: ["FF010203", "FFFF0010"] });
  });

  it("throws on invalid payload length", () => {
    expect(() => parsePaletteRecord(new Uint8Array())).toThrow(/PALETTE/);
  });

  it("tolerates mismatched ccv by parsing as many entries as fit in the payload", () => {
    const payload = new Uint8Array([
      0xff, 0xff, // declaredCount huge
      0x01, 0x02, 0x03, 0x00,
      0xff, 0x00, 0x10, 0x00,
    ]);
    const collector = createXlsWarningCollector();
    expect(parsePaletteRecord(payload, { mode: "lenient", warn: collector.warn })).toEqual({ colors: ["FF010203", "FFFF0010"] });
    expect(collector.warnings.map((w) => w.code)).toContain("PALETTE_COUNT_MISMATCH");
  });

  it("throws on mismatched ccv in strict mode", () => {
    const payload = new Uint8Array([
      0xff, 0xff,
      0x01, 0x02, 0x03, 0x00,
      0xff, 0x00, 0x10, 0x00,
    ]);
    expect(() => parsePaletteRecord(payload, { mode: "strict" })).toThrow(/Invalid PALETTE payload length/);
  });
});
