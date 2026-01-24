/**
 * @file BIFF stream-iterator tests
 */

import { iterateRecords } from "./stream-iterator";

function makeRecordBytes(type: number, data: number[]): Uint8Array {
  const out = new Uint8Array(4 + data.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, type, true);
  view.setUint16(2, data.length, true);
  out.set(new Uint8Array(data), 4);
  return out;
}

describe("xls/biff/stream-iterator", () => {
  it("iterates over sequential records", () => {
    const a = makeRecordBytes(0x1111, [1]);
    const b = makeRecordBytes(0x2222, [2, 3]);
    const bytes = new Uint8Array(a.length + b.length);
    bytes.set(a, 0);
    bytes.set(b, a.length);

    const records = [...iterateRecords(bytes)];
    expect(records.map((r) => r.type)).toEqual([0x1111, 0x2222]);
    expect(records.map((r) => r.offset)).toEqual([0, a.length]);
    expect(records.map((r) => [...r.data])).toEqual([[1], [2, 3]]);
  });

  it("yields no records for empty stream", () => {
    expect([...iterateRecords(new Uint8Array())]).toEqual([]);
  });

  it("can ignore trailing bytes when allowTrailingBytes is true", () => {
    const a = makeRecordBytes(0x1111, [1]);
    const bytes = new Uint8Array(a.length + 2);
    bytes.set(a, 0);
    bytes.set([0xff, 0xee], a.length);
    expect([...iterateRecords(bytes, { allowTrailingBytes: true })].map((r) => r.type)).toEqual([0x1111]);
  });

  it("throws on trailing bytes when allowTrailingBytes is false", () => {
    const a = makeRecordBytes(0x1111, [1]);
    const bytes = new Uint8Array(a.length + 2);
    bytes.set(a, 0);
    bytes.set([0xff, 0xee], a.length);
    expect(() => [...iterateRecords(bytes, { allowTrailingBytes: false })]).toThrow(/Truncated BIFF record header/);
  });
});
