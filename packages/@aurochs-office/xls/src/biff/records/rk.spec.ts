/**
 * @file RK record parser tests
 */

import { decodeRkNumber, parseRkRecord } from "./rk";

function encodeRkFromInt(value: number, div100: boolean): number {
  const flags = 0x02 | (div100 ? 0x01 : 0x00);
  return ((value << 2) | flags) >>> 0;
}

function encodeRkFromFloat(value: number, div100: boolean): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, true);
  const highDword = view.getUint32(4, true) & 0xfffffffc;
  return (highDword | (div100 ? 0x01 : 0x00)) >>> 0;
}

describe("xls/biff/records/rk", () => {
  it("decodes integer RK", () => {
    expect(decodeRkNumber(encodeRkFromInt(12345678, false))).toBe(12345678);
  });

  it("decodes an integer RK that is divisible by 100 using the div100 flag", () => {
    // Stored integer is 1000; div100 flag makes it 10.
    expect(decodeRkNumber(encodeRkFromInt(1000, true))).toBe(10);
  });

  it("decodes integer/100 RK", () => {
    expect(decodeRkNumber(encodeRkFromInt(12345, true))).toBeCloseTo(123.45, 10);
  });

  it("decodes a very large 30-bit integer RK", () => {
    expect(decodeRkNumber(encodeRkFromInt(0x1fffffff, false))).toBe(0x1fffffff);
  });

  it("decodes IEEE RK", () => {
    expect(decodeRkNumber(encodeRkFromFloat(99, false))).toBeCloseTo(99, 10);
  });

  it("decodes IEEE/100 RK", () => {
    expect(decodeRkNumber(encodeRkFromFloat(99, true))).toBeCloseTo(0.99, 10);
  });

  it("decodes an IEEE RK near float precision limits", () => {
    const nearLimit = 2 ** 52;
    expect(decodeRkNumber(encodeRkFromFloat(nearLimit, false))).toBe(nearLimit);
  });

  it("parses row/col/xf/value", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true);
    view.setUint16(2, 2, true);
    view.setUint16(4, 3, true);
    view.setUint32(6, encodeRkFromInt(-5, false), true);
    expect(parseRkRecord(data)).toEqual({ row: 1, col: 2, xfIndex: 3, value: -5 });
  });

  it("throws on invalid payload length", () => {
    expect(() => parseRkRecord(new Uint8Array(9))).toThrow(/Invalid RK payload length/);
  });
});
