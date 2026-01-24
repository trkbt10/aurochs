/**
 * @file COLINFO record parser tests
 */

import { parseColinfoRecord } from "./colinfo";

describe("xls/biff/records/colinfo", () => {
  it("parses column range, width, xfIndex and flags", () => {
    const data = new Uint8Array(12);
    const view = new DataView(data.buffer);
    view.setUint16(0, 2, true);
    view.setUint16(2, 5, true);
    view.setUint16(4, 256 * 8, true);
    view.setUint16(6, 7, true);
    // grbit: fHidden (bit0), iOutLevel=5 (stored in high byte bits 2..0), fCollapsed (high byte bit4)
    view.setUint16(8, 0x0001 | (0x15 << 8), true);
    view.setUint16(10, 0, true);

    const col = parseColinfoRecord(data);
    expect(col.colFirst).toBe(2);
    expect(col.colLast).toBe(5);
    expect(col.width256).toBe(2048);
    expect(col.xfIndex).toBe(7);
    expect(col.isHidden).toBe(true);
    expect(col.outlineLevel).toBe(5);
    expect(col.isCollapsed).toBe(true);
  });

  it("throws when reserved field is not zero", () => {
    const data = new Uint8Array(12);
    const view = new DataView(data.buffer);
    view.setUint16(10, 1, true);
    expect(() => parseColinfoRecord(data)).toThrow(/Invalid COLINFO reserved field/);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseColinfoRecord(new Uint8Array(11))).toThrow(/Invalid COLINFO payload length/);
  });
});

