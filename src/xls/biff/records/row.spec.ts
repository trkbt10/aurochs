/**
 * @file ROW record parser tests
 */

import { parseRowRecord } from "./row";

describe("xls/biff/records/row", () => {
  it("parses row bounds, height and flags", () => {
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setUint16(0, 9, true); // rw
    view.setUint16(2, 1, true); // colMic
    view.setUint16(4, 4, true); // colMac (exclusive)
    view.setUint16(6, 0x8000 | 300, true); // miyRw (standard height flag + 300 twips)
    view.setUint16(12, 0x0080 | 0x0020 | 0x0010 | 0x0003, true); // ghost+dyZero+collapsed+outlineLevel=3
    view.setUint16(14, 0x1234, true); // ixfe

    const row = parseRowRecord(data);
    expect(row.row).toBe(9);
    expect(row.firstCol).toBe(1);
    expect(row.lastColExclusive).toBe(4);
    expect(row.isStandardHeight).toBe(true);
    expect(row.heightTwips).toBe(300);
    expect(row.outlineLevel).toBe(3);
    expect(row.isCollapsed).toBe(true);
    expect(row.isHeightZero).toBe(true);
    expect(row.hasDefaultFormat).toBe(true);
    expect(row.xfIndex).toBe(0x234);
  });

  it("omits xfIndex when hasDefaultFormat is false", () => {
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 0, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(12, 0x0000, true);
    view.setUint16(14, 0xffff, true);
    const row = parseRowRecord(data);
    expect(row.hasDefaultFormat).toBe(false);
    expect(row.xfIndex).toBeUndefined();
  });

  it("throws on invalid payload length", () => {
    expect(() => parseRowRecord(new Uint8Array(15))).toThrow(/Invalid ROW payload length/);
  });
});

