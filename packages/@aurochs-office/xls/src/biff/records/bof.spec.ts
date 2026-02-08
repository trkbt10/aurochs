/**
 * @file BOF record parser tests
 */

import { parseBofRecord } from "./bof";
import { createXlsWarningCollector } from "../../warnings";

function makeBof8Payload(substreamType: number, version = 0x0600): Uint8Array {
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

function makeBof5Payload(substreamType: number): Uint8Array {
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0x0500, true);
  view.setUint16(2, substreamType, true);
  view.setUint16(4, 0x1234, true); // buildId
  view.setUint16(6, 0x2026, true); // buildYear
  return out;
}

function makeTruncatedBof8Payload(substreamType: number): Uint8Array {
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0x0600, true);
  view.setUint16(2, substreamType, true);
  view.setUint16(4, 0x1234, true); // buildId
  view.setUint16(6, 0x2026, true); // buildYear
  return out;
}

function makeWeirdBof5Payload(substreamType: number): Uint8Array {
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0x0580, true);
  view.setUint16(2, substreamType, true);
  view.setUint16(4, 0x1234, true);
  view.setUint16(6, 0x2026, true);
  return out;
}

describe("xls/biff/records/bof", () => {
  it("parses a BIFF8 BOF (workbookGlobals)", () => {
    const bof = parseBofRecord(makeBof8Payload(0x0005));
    expect(bof.version).toBe(0x0600);
    expect(bof.substreamType).toBe("workbookGlobals");
    expect(bof.buildId).toBe(0x1234);
    expect(bof.buildYear).toBe(0x2026);
    expect(bof.fileHistoryFlags).toBe(0x9abcdef0);
    expect(bof.lowestBiffVersion).toBe(0x0600);
  });

  it("parses worksheet BOF", () => {
    const bof = parseBofRecord(makeBof8Payload(0x0010));
    expect(bof.substreamType).toBe("worksheet");
  });

  it("parses a BIFF5/7 BOF", () => {
    const bof = parseBofRecord(makeBof5Payload(0x0010));
    expect(bof.version).toBe(0x0500);
    expect(bof.substreamType).toBe("worksheet");
  });

  it("tolerates BIFF5/7 variants by normalizing the version field", () => {
    const bof = parseBofRecord(makeWeirdBof5Payload(0x0010));
    expect(bof.version).toBe(0x0500);
    expect(bof.substreamType).toBe("worksheet");
  });

  it("tolerates truncated BIFF8 BOF payloads", () => {
    const collector = createXlsWarningCollector();
    const bof = parseBofRecord(makeTruncatedBof8Payload(0x0005), { mode: "lenient", warn: collector.warn });
    expect(bof.version).toBe(0x0600);
    expect(bof.substreamType).toBe("workbookGlobals");
    expect(bof.fileHistoryFlags).toBe(0);
    expect(collector.warnings.map((w) => w.code)).toContain("BOF_TRUNCATED");
  });

  it("throws on truncated BIFF8 BOF payloads in strict mode", () => {
    expect(() => parseBofRecord(makeTruncatedBof8Payload(0x0005), { mode: "strict" })).toThrow(/BIFF8/);
  });

  it("throws on unknown substream type", () => {
    expect(() => parseBofRecord(makeBof8Payload(0x7777))).toThrow(/Unknown BOF substream type/);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseBofRecord(new Uint8Array(15))).toThrow(/Invalid BOF payload length/);
  });
});
