/**
 * @file FONT record parser tests
 */

import { parseFontRecord } from "./font";
import { createXlsWarningCollector } from "../../warnings";

describe("xls/biff/records/font", () => {
  it("parses font attributes and name", () => {
    const name = "Arial";
    const data = new Uint8Array(16 + name.length);
    const view = new DataView(data.buffer);
    view.setUint16(0, 200, true); // dyHeight
    view.setUint16(2, 0x0002 | 0x0008, true); // italic + strikeout
    view.setUint16(4, 0x000a, true); // icv
    view.setUint16(6, 0x02bc, true); // bls (bold)
    view.setUint16(8, 0x0000, true); // sss
    data[10] = 0x01; // underline single
    data[11] = 0x00; // family
    data[12] = 0x01; // charset
    data[13] = 0x7a; // reserved (some generators set a non-zero value)
    data[14] = name.length;
    data[15] = 0x00; // grbit: compressed
    data.set(Array.from(name).map((c) => c.charCodeAt(0)), 16);

    const font = parseFontRecord(data);
    expect(font.heightTwips).toBe(200);
    expect(font.isItalic).toBe(true);
    expect(font.isStrikeout).toBe(true);
    expect(font.isOutline).toBe(false);
    expect(font.isShadow).toBe(false);
    expect(font.colorIndex).toBe(0x000a);
    expect(font.weight).toBe(0x02bc);
    expect(font.underline).toBe(0x01);
    expect(font.name).toBe("Arial");
  });

  it("falls back to BIFF5/7-style 8-bit names when unicode parsing fails", () => {
    const name = "Arial";
    const data = new Uint8Array(15 + name.length);
    const view = new DataView(data.buffer);
    view.setUint16(0, 200, true); // dyHeight
    view.setUint16(2, 0x0000, true);
    view.setUint16(4, 0x000a, true);
    view.setUint16(6, 0x0190, true);
    view.setUint16(8, 0x0000, true);
    data[10] = 0x00;
    data[11] = 0x00;
    data[12] = 0x01;
    data[13] = 0x00;
    data[14] = name.length;
    data.set(Array.from(name).map((c) => c.charCodeAt(0)), 15); // no grbit byte

    const collector = createXlsWarningCollector();
    const font = parseFontRecord(data, { mode: "lenient", warn: collector.warn });
    expect(font.name).toBe("Arial");
    expect(collector.warnings.map((w) => w.code)).toContain("FONT_NAME_FALLBACK_LEGACY");
  });
});
