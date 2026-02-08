/**
 * @file BIFF BOOLERR record tests
 */

import { parseBoolerrRecord } from "./boolerr";

describe("parseBoolerrRecord", () => {
  it("parses boolean values", () => {
    const data = new Uint8Array(8);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true);
    view.setUint16(2, 2, true);
    view.setUint16(4, 3, true);
    data[6] = 1;
    data[7] = 0;
    expect(parseBoolerrRecord(data)).toEqual({ row: 1, col: 2, xfIndex: 3, value: { type: "boolean", value: true } });
  });

  it("parses error values", () => {
    const data = new Uint8Array(8);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 0, true);
    view.setUint16(4, 0, true);
    data[6] = 0x07;
    data[7] = 1;
    expect(parseBoolerrRecord(data)).toEqual({ row: 0, col: 0, xfIndex: 0, value: { type: "error", value: "#DIV/0!" } });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseBoolerrRecord(new Uint8Array())).toThrow(/BOOLERR/);
  });

  it("tolerates trailing padding bytes", () => {
    const data = new Uint8Array(9);
    data[6] = 1;
    data[7] = 0;
    data[8] = 0;
    expect(parseBoolerrRecord(data).value).toEqual({ type: "boolean", value: true });
  });

  it("throws on unknown error code", () => {
    const data = new Uint8Array(8);
    data[6] = 0xff;
    data[7] = 1;
    expect(() => parseBoolerrRecord(data)).toThrow(/Unknown BOOLERR error code/);
  });
});
