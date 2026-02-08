/**
 * @file DIMENSIONS record parser tests
 */

import { isEmptyDimensionsRecord, parseDimensionsRecord } from "./dimensions";

describe("xls/biff/records/dimensions", () => {
  it("parses raw bounds (exclusive max)", () => {
    const data = new Uint8Array(14);
    const view = new DataView(data.buffer);
    view.setUint32(0, 2, true); // rwMic
    view.setUint32(4, 6, true); // rwMac (exclusive)
    view.setUint16(8, 1, true); // colMic
    view.setUint16(10, 4, true); // colMac (exclusive)

    const dim = parseDimensionsRecord(data);
    expect(dim).toEqual({
      firstRow: 2,
      lastRowExclusive: 6,
      firstCol: 1,
      lastColExclusive: 4,
    });
    expect(isEmptyDimensionsRecord(dim)).toBe(false);
  });

  it("parses a single-cell sheet bounds (A1 only)", () => {
    const data = new Uint8Array(14);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true); // firstRow
    view.setUint32(4, 1, true); // lastRowExclusive
    view.setUint16(8, 0, true); // firstCol
    view.setUint16(10, 1, true); // lastColExclusive

    expect(parseDimensionsRecord(data)).toEqual({
      firstRow: 0,
      lastRowExclusive: 1,
      firstCol: 0,
      lastColExclusive: 1,
    });
  });

  it("parses maximum BIFF8 row/column boundaries (65536 rows, 256 columns)", () => {
    const data = new Uint8Array(14);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint32(4, 65536, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 256, true);

    expect(parseDimensionsRecord(data)).toEqual({
      firstRow: 0,
      lastRowExclusive: 65536,
      firstCol: 0,
      lastColExclusive: 256,
    });
  });

  it("parses a sheet where data exists only in the first row/columns", () => {
    // Range A1:C1 => rows [0,1), cols [0,3)
    const data = new Uint8Array(14);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint32(4, 1, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 3, true);

    expect(parseDimensionsRecord(data)).toEqual({
      firstRow: 0,
      lastRowExclusive: 1,
      firstCol: 0,
      lastColExclusive: 3,
    });
  });

  it("detects empty sheet dimensions (all zeros)", () => {
    const dim = parseDimensionsRecord(new Uint8Array(14));
    expect(isEmptyDimensionsRecord(dim)).toBe(true);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseDimensionsRecord(new Uint8Array(13))).toThrow(/Invalid DIMENSIONS payload length/);
  });

  it("parses BIFF7-style dimensions with 16-bit row indexes", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 2, true);
    view.setUint16(2, 6, true);
    view.setUint16(4, 1, true);
    view.setUint16(6, 4, true);
    expect(parseDimensionsRecord(data)).toEqual({ firstRow: 2, lastRowExclusive: 6, firstCol: 1, lastColExclusive: 4 });
  });
});
