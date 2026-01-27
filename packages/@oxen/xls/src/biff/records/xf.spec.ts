/**
 * @file XF record parser tests
 */

import { parseXfRecord } from "./xf";

describe("xls/biff/records/xf", () => {
  it("parses core fields, alignment, attributes and border styles", () => {
    const data = new Uint8Array(20);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true); // ifnt
    view.setUint16(2, 2, true); // ifmt
    // flags: locked + parent=0x123
    view.setUint16(4, 0x0001 | (0x0123 << 4), true);
    // align: horizontal=2 (center), wrap=1, vertical=1, rotation=45
    view.setUint16(6, 0x0002 | 0x0008 | (0x0001 << 4) | (45 << 8), true);
    // indent: indent=3, shrink=1, hasFont+hasAlignment
    view.setUint16(8, 0x0003 | 0x0010 | 0x0800 | 0x1000, true);
    // border: left=1 right=2 top=3 bottom=4
    view.setUint16(10, 0x4321, true);
    view.setUint32(12, 0x89abcdef, true);
    view.setUint32(16, 0x01234567, true);

    const xf = parseXfRecord(data);
    expect(xf.fontIndex).toBe(1);
    expect(xf.formatIndex).toBe(2);
    expect(xf.isStyle).toBe(false);
    expect(xf.parentXfIndex).toBe(0x0123);
    expect(xf.alignment.horizontal).toBe(2);
    expect(xf.alignment.wrapText).toBe(true);
    expect(xf.alignment.vertical).toBe(1);
    expect(xf.alignment.rotation).toBe(45);
    expect(xf.alignment.indent).toBe(3);
    expect(xf.alignment.shrinkToFit).toBe(true);
    expect(xf.attributes.hasFont).toBe(true);
    expect(xf.attributes.hasAlignment).toBe(true);
    expect(xf.border).toEqual({ left: 1, right: 2, top: 3, bottom: 4 });
    expect(xf.raw.borderColorsAndDiag).toBe(0x89abcdef);
    expect(xf.raw.fillPatternAndColors).toBe(0x01234567);
  });

  it("uses 0xFFF as parent for style XFs", () => {
    const data = new Uint8Array(20);
    const view = new DataView(data.buffer);
    view.setUint16(4, 0x0004, true); // fStyle
    const xf = parseXfRecord(data);
    expect(xf.isStyle).toBe(true);
    expect(xf.parentXfIndex).toBe(0x0fff);
  });

  it("parses BIFF7-style XF payloads (16 bytes) with missing fill fields", () => {
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true); // ifnt
    view.setUint16(2, 2, true); // ifmt
    view.setUint16(4, 0x0001 | (0x0123 << 4), true);
    view.setUint16(6, 0x0002, true);
    view.setUint16(8, 0x0000, true);
    view.setUint16(10, 0x4321, true);
    view.setUint32(12, 0x89abcdef, true);

    const xf = parseXfRecord(data);
    expect(xf.fontIndex).toBe(1);
    expect(xf.formatIndex).toBe(2);
    expect(xf.raw.fillPatternAndColors).toBe(0);
  });
});
