import { parsePaletteRecord } from "./palette";

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
});
