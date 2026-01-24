/**
 * @file BIFF continue-handler tests
 */

import { BIFF_RECORD_TYPES } from "./record-types";
import { readRecord } from "./record-reader";
import { readRecordWithContinues } from "./continue-handler";

function makeRecordBytes(type: number, data: number[]): Uint8Array {
  const out = new Uint8Array(4 + data.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, type, true);
  view.setUint16(2, data.length, true);
  out.set(new Uint8Array(data), 4);
  return out;
}

describe("xls/biff/continue-handler", () => {
  it("merges subsequent CONTINUE records into a single record payload", () => {
    const first = makeRecordBytes(0x2222, [1, 2]);
    const cont = makeRecordBytes(BIFF_RECORD_TYPES.CONTINUE, [3, 4, 5]);
    const eof = makeRecordBytes(BIFF_RECORD_TYPES.EOF, []);

    const bytes = new Uint8Array(first.length + cont.length + eof.length);
    bytes.set(first, 0);
    bytes.set(cont, first.length);
    bytes.set(eof, first.length + cont.length);

    const result = readRecordWithContinues(bytes, 0);
    expect(result.record.type).toBe(0x2222);
    expect(result.record.length).toBe(5);
    expect([...result.record.data]).toEqual([1, 2, 3, 4, 5]);
    expect(result.continues).toHaveLength(1);
    expect(result.nextOffset).toBe(first.length + cont.length);

    const next = readRecord(bytes, result.nextOffset);
    expect(next.type).toBe(BIFF_RECORD_TYPES.EOF);
  });

  it("does not merge when the next record is not CONTINUE", () => {
    const first = makeRecordBytes(0x2222, [1, 2]);
    const other = makeRecordBytes(0x3333, [9]);
    const bytes = new Uint8Array(first.length + other.length);
    bytes.set(first, 0);
    bytes.set(other, first.length);

    const result = readRecordWithContinues(bytes, 0);
    expect(result.record.type).toBe(0x2222);
    expect(result.record.length).toBe(2);
    expect([...result.record.data]).toEqual([1, 2]);
    expect(result.continues).toHaveLength(0);
    expect(result.nextOffset).toBe(first.length);
  });
});
