/**
 * @file DEFCOLWIDTH record parser tests
 */

import { parseDefcolwidthRecord } from "./defcolwidth";

describe("xls/biff/records/defcolwidth", () => {
  it("parses defaultCharWidth", () => {
    const data = new Uint8Array(2);
    const view = new DataView(data.buffer);
    view.setUint16(0, 8, true);
    expect(parseDefcolwidthRecord(data)).toEqual({ defaultCharWidth: 8 });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseDefcolwidthRecord(new Uint8Array(1))).toThrow(/Invalid DEFCOLWIDTH payload length/);
  });
});

