/**
 * @file BLANK record parser tests
 */

import { parseBlankRecord } from "./blank";

describe("xls/biff/records/blank", () => {
  it("parses row/col/xfIndex", () => {
    const data = new Uint8Array(6);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true);
    view.setUint16(2, 2, true);
    view.setUint16(4, 3, true);

    expect(parseBlankRecord(data)).toEqual({ row: 1, col: 2, xfIndex: 3 });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseBlankRecord(new Uint8Array(5))).toThrow(/Invalid BLANK payload length/);
  });
});

