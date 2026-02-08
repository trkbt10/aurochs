/**
 * @file BIFF record-reader tests
 */

import { readRecord } from "./record-reader";

function makeRecordBytes(type: number, data: number[]): Uint8Array {
  const out = new Uint8Array(4 + data.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, type, true);
  view.setUint16(2, data.length, true);
  out.set(new Uint8Array(data), 4);
  return out;
}

describe("xls/biff/record-reader", () => {
  it("reads type, length, data, and offset", () => {
    const bytes = makeRecordBytes(0x1234, [1, 2, 3]);
    const record = readRecord(bytes, 0);

    expect(record.type).toBe(0x1234);
    expect(record.length).toBe(3);
    expect([...record.data]).toEqual([1, 2, 3]);
    expect(record.offset).toBe(0);
  });

  it("supports non-zero offsets", () => {
    const a = makeRecordBytes(0x1111, [9]);
    const b = makeRecordBytes(0x2222, [8, 7]);
    const bytes = new Uint8Array(a.length + b.length);
    bytes.set(a, 0);
    bytes.set(b, a.length);

    const record = readRecord(bytes, a.length);
    expect(record.type).toBe(0x2222);
    expect(record.offset).toBe(a.length);
    expect([...record.data]).toEqual([8, 7]);
  });

  it("throws on truncated header", () => {
    expect(() => readRecord(new Uint8Array([0x01, 0x02, 0x03]), 0)).toThrow(/Truncated BIFF record header/);
  });

  it("throws on truncated data", () => {
    const bytes = makeRecordBytes(0x1234, [1, 2, 3]);
    expect(() => readRecord(bytes.subarray(0, bytes.length - 1), 0)).toThrow(/Truncated BIFF record data/);
  });

  it("throws when length exceeds maxRecordDataLength in strict mode", () => {
    const bytes = new Uint8Array(4);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 0x1234, true);
    view.setUint16(2, 8225, true);
    expect(() => readRecord(bytes, 0, { strict: true })).toThrow(/Invalid BIFF record length/);
  });
});
