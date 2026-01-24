/**
 * @file MULBLANK record parser tests
 */

import { parseMulblankRecord } from "./mulblank";

describe("xls/biff/records/mulblank", () => {
  it("parses row/col range and xfIndexes", () => {
    const data = new Uint8Array(2 + 2 + 2 * 3 + 2);
    const view = new DataView(data.buffer);
    view.setUint16(0, 10, true); // row
    view.setUint16(2, 5, true); // colFirst
    view.setUint16(4, 100, true);
    view.setUint16(6, 101, true);
    view.setUint16(8, 102, true);
    view.setUint16(10, 7, true); // colLast

    const record = parseMulblankRecord(data);
    expect(record.row).toBe(10);
    expect(record.colFirst).toBe(5);
    expect(record.colLast).toBe(7);
    expect(record.xfIndexes).toEqual([100, 101, 102]);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseMulblankRecord(new Uint8Array(7))).toThrow(/Invalid MULBLANK payload length/);
  });

  it("throws on invalid column range", () => {
    const data = new Uint8Array(2 + 2 + 2 * 1 + 2);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 5, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 4, true);
    expect(() => parseMulblankRecord(data)).toThrow(/Invalid MULBLANK column range/);
  });
});

