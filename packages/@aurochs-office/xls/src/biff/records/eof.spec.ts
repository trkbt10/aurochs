/**
 * @file EOF record parser tests
 */

import { parseEofRecord } from "./eof";

describe("xls/biff/records/eof", () => {
  it("parses EOF with empty payload", () => {
    expect(parseEofRecord(new Uint8Array())).toEqual({});
  });

  it("throws if payload is not empty", () => {
    expect(() => parseEofRecord(new Uint8Array([0x00]))).toThrow(/Invalid EOF payload length/);
  });
});

