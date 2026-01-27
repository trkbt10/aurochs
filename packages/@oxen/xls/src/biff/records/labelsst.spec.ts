/**
 * @file LABELSST record parser tests
 */

import { parseLabelSstRecord } from "./labelsst";

describe("xls/biff/records/labelsst", () => {
  it("parses row/col/xf/sstIndex", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 4, true);
    view.setUint16(2, 5, true);
    view.setUint16(4, 6, true);
    view.setUint32(6, 123, true);

    expect(parseLabelSstRecord(data)).toEqual({ row: 4, col: 5, xfIndex: 6, sstIndex: 123 });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseLabelSstRecord(new Uint8Array(11))).toThrow(/Invalid LABELSST payload length/);
  });
});

