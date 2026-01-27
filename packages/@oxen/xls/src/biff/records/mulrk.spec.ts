/**
 * @file MULRK record parser tests
 */

import { parseMulrkRecord } from "./mulrk";
import { createXlsWarningCollector } from "../../warnings";

function encodeRkFromInt(value: number, div100: boolean): number {
  const flags = 0x02 | (div100 ? 0x01 : 0x00);
  return ((value << 2) | flags) >>> 0;
}

describe("xls/biff/records/mulrk", () => {
  it("parses row/col range and RKREC cells", () => {
    const count = 2;
    const data = new Uint8Array(2 + 2 + count * 6 + 2);
    const view = new DataView(data.buffer);
    view.setUint16(0, 3, true); // row
    view.setUint16(2, 1, true); // colFirst

    // cell 0
    view.setUint16(4, 10, true);
    view.setUint32(6, encodeRkFromInt(123, false), true);
    // cell 1
    view.setUint16(10, 11, true);
    view.setUint32(12, encodeRkFromInt(456, true), true);

    view.setUint16(16, 2, true); // colLast

    const record = parseMulrkRecord(data);
    expect(record.row).toBe(3);
    expect(record.colFirst).toBe(1);
    expect(record.colLast).toBe(2);
    expect(record.cells[0]).toEqual({ xfIndex: 10, value: 123 });
    expect(record.cells[1]?.xfIndex).toBe(11);
    expect(record.cells[1]?.value).toBeCloseTo(4.56, 10);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseMulrkRecord(new Uint8Array(11))).toThrow(/Invalid MULRK payload length/);
  });

  it("derives colLast from payload length when the colLast field is inconsistent", () => {
    const data = new Uint8Array(2 + 2 + 6 + 2);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 2, true);
    // one cell at base=4..9
    view.setUint16(4, 0, true);
    view.setUint32(6, 0, true);
    view.setUint16(10, 1, true); // colLast < colFirst
    const collector = createXlsWarningCollector();
    expect(parseMulrkRecord(data, { mode: "lenient", warn: collector.warn })).toMatchObject({ colFirst: 2, colLast: 2, cells: [{ xfIndex: 0, value: 0 }] });
    expect(collector.warnings.map((w) => w.code)).toContain("MULRK_COLLAST_MISMATCH");
  });

  it("throws when the colLast field is inconsistent in strict mode", () => {
    const data = new Uint8Array(2 + 2 + 6 + 2);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 2, true);
    view.setUint16(4, 0, true);
    view.setUint32(6, 0, true);
    view.setUint16(10, 1, true);
    expect(() => parseMulrkRecord(data, { mode: "strict" })).toThrow(/MULRK colLast mismatch/);
  });
});
