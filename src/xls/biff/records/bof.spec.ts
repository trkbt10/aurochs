/**
 * @file BOF record parser tests
 */

import { parseBofRecord } from "./bof";

function makeBofPayload(substreamType: number, version = 0x0600): Uint8Array {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setUint16(0, version, true);
  view.setUint16(2, substreamType, true);
  view.setUint16(4, 0x1234, true); // buildId
  view.setUint16(6, 0x2026, true); // buildYear
  view.setUint32(8, 0x9abcdef0, true); // fileHistoryFlags
  view.setUint32(12, 0x0600, true); // lowestBiffVersion
  return out;
}

describe("xls/biff/records/bof", () => {
  it("parses a BIFF8 BOF (workbookGlobals)", () => {
    const bof = parseBofRecord(makeBofPayload(0x0005));
    expect(bof.version).toBe(0x0600);
    expect(bof.substreamType).toBe("workbookGlobals");
    expect(bof.buildId).toBe(0x1234);
    expect(bof.buildYear).toBe(0x2026);
    expect(bof.fileHistoryFlags).toBe(0x9abcdef0);
    expect(bof.lowestBiffVersion).toBe(0x0600);
  });

  it("parses worksheet BOF", () => {
    const bof = parseBofRecord(makeBofPayload(0x0010));
    expect(bof.substreamType).toBe("worksheet");
  });

  it("throws on non-BIFF8 version", () => {
    expect(() => parseBofRecord(makeBofPayload(0x0005, 0x0500))).toThrow(/Unsupported BIFF version/);
  });

  it("throws on unknown substream type", () => {
    expect(() => parseBofRecord(makeBofPayload(0x7777))).toThrow(/Unknown BOF substream type/);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseBofRecord(new Uint8Array(15))).toThrow(/Invalid BOF payload length/);
  });
});

