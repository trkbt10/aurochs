/** @file Tests for shared border/color utilities */
import { parseBrc80, parseBrc, colorrefToHex, BRC_TYPE_MAP } from "./border-utils";

function buildBrc80(dptLineWidth: number, brcType: number, ico: number, extra = 0): Uint8Array {
  return new Uint8Array([dptLineWidth, brcType, ico, extra]);
}

function buildBrc(r: number, g: number, b: number, flag: number, dptLineWidth: number, brcType: number, dptSpace = 0, flags2 = 0): Uint8Array {
  return new Uint8Array([r, g, b, flag, dptLineWidth, brcType, dptSpace, flags2]);
}

describe("parseBrc80", () => {
  it("parses single border with known type", () => {
    const data = buildBrc80(6, 1, 1); // width=6, single, black
    const border = parseBrc80(data, 0);
    expect(border).toBeDefined();
    expect(border!.style).toBe("single");
    expect(border!.width).toBe(6);
    expect(border!.color).toBe("000000");
  });

  it("returns undefined for zero border", () => {
    const data = buildBrc80(0, 0, 0);
    expect(parseBrc80(data, 0)).toBeUndefined();
  });

  it("handles offset in larger buffer", () => {
    const buf = new Uint8Array(10);
    buf.set(buildBrc80(4, 2, 6), 3); // thick, red at offset 3
    const border = parseBrc80(buf, 3);
    expect(border!.style).toBe("thick");
    expect(border!.color).toBe("FF0000");
  });

  it("returns undefined for truncated buffer", () => {
    expect(parseBrc80(new Uint8Array(2), 0)).toBeUndefined();
  });
});

describe("parseBrc", () => {
  it("parses modern BRC with COLORREF", () => {
    const data = buildBrc(0x00, 0x00, 0xff, 0x00, 8, 1); // blue color, single
    const border = parseBrc(data, 0);
    expect(border).toBeDefined();
    expect(border!.style).toBe("single");
    expect(border!.width).toBe(8);
    expect(border!.color).toBe("0000FF");
  });

  it("returns undefined for all-zero modern BRC", () => {
    const data = buildBrc(0, 0, 0, 0, 0, 0);
    expect(parseBrc(data, 0)).toBeUndefined();
  });

  it("handles auto-color (0xFF flag byte)", () => {
    const data = buildBrc(0xff, 0x00, 0x00, 0xff, 4, 1); // cvAuto
    const border = parseBrc(data, 0);
    // border exists (has style+width) but color should be undefined
    expect(border).toBeDefined();
    expect(border!.color).toBeUndefined();
    expect(border!.style).toBe("single");
  });

  it("returns undefined for truncated buffer", () => {
    expect(parseBrc(new Uint8Array(4), 0)).toBeUndefined();
  });
});

describe("colorrefToHex", () => {
  it("converts RGB to hex string", () => {
    const data = new Uint8Array([0xff, 0x80, 0x00, 0x00]);
    expect(colorrefToHex(data, 0)).toBe("FF8000");
  });

  it("returns undefined for all-zero (auto)", () => {
    expect(colorrefToHex(new Uint8Array(4), 0)).toBeUndefined();
  });

  it("returns undefined for cvAuto flag", () => {
    const data = new Uint8Array([0x10, 0x20, 0x30, 0xff]);
    expect(colorrefToHex(data, 0)).toBeUndefined();
  });
});

describe("BRC_TYPE_MAP", () => {
  it("maps known border types", () => {
    expect(BRC_TYPE_MAP[1]).toBe("single");
    expect(BRC_TYPE_MAP[3]).toBe("double");
    expect(BRC_TYPE_MAP[7]).toBe("dashed");
    expect(BRC_TYPE_MAP[20]).toBe("wave");
    expect(BRC_TYPE_MAP[25]).toBe("engrave3D");
  });

  it("has undefined for reserved index 4", () => {
    expect(BRC_TYPE_MAP[4]).toBeUndefined();
  });
});
