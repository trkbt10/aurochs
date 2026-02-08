/**
 * @file NUMBER record parser tests
 */

import { parseNumberRecord } from "./number";

describe("xls/biff/records/number", () => {
  it("parses row/col/xf/value", () => {
    const data = new Uint8Array(14);
    const view = new DataView(data.buffer);
    view.setUint16(0, 7, true);
    view.setUint16(2, 3, true);
    view.setUint16(4, 12, true);
    view.setFloat64(6, 1.5, true);

    expect(parseNumberRecord(data)).toEqual({ row: 7, col: 3, xfIndex: 12, value: 1.5 });
  });

  it("parses an integer-like value (Excel may store it as RK in practice)", () => {
    const data = new Uint8Array(14);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 0, true);
    view.setUint16(4, 0, true);
    view.setFloat64(6, 42, true);

    expect(parseNumberRecord(data).value).toBe(42);
  });

  it("parses negative and exponent-form values", () => {
    const cases = [-123.456, 1e308, 1e-300];
    for (const value of cases) {
      const data = new Uint8Array(14);
      const view = new DataView(data.buffer);
      view.setUint16(0, 0, true);
      view.setUint16(2, 0, true);
      view.setUint16(4, 0, true);
      view.setFloat64(6, value, true);

      expect(parseNumberRecord(data).value).toBe(value);
    }
  });

  it("throws on invalid payload length", () => {
    expect(() => parseNumberRecord(new Uint8Array(13))).toThrow(/Invalid NUMBER payload length/);
  });
});
