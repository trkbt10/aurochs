/**
 * @file MERGECELLS record parser tests
 */

import { parseMergeCellsRecord } from "./mergecells";
import { createXlsWarningCollector } from "../../warnings";

describe("xls/biff/records/mergecells", () => {
  it("parses refs array", () => {
    const data = new Uint8Array(2 + 2 * 8);
    const view = new DataView(data.buffer);
    view.setUint16(0, 2, true); // count

    // ref 0: A1:B2 (0-based rows/cols => rows 0..1 cols 0..1)
    view.setUint16(2, 0, true);
    view.setUint16(4, 1, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 1, true);

    // ref 1: C3:D3
    view.setUint16(10, 2, true);
    view.setUint16(12, 2, true);
    view.setUint16(14, 2, true);
    view.setUint16(16, 3, true);

    const record = parseMergeCellsRecord(data);
    expect(record.refs).toEqual([
      { firstRow: 0, lastRow: 1, firstCol: 0, lastCol: 1 },
      { firstRow: 2, lastRow: 2, firstCol: 2, lastCol: 3 },
    ]);
  });

  it("warns and truncates when refs are missing in lenient mode", () => {
    const data = new Uint8Array(3);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true);
    const collector = createXlsWarningCollector();
    expect(parseMergeCellsRecord(data, { mode: "lenient", warn: collector.warn })).toEqual({ refs: [] });
    expect(collector.warnings.map((w) => w.code)).toContain("MERGECELLS_COUNT_MISMATCH");
  });

  it("throws when refs are missing in strict mode", () => {
    const data = new Uint8Array(3);
    const view = new DataView(data.buffer);
    view.setUint16(0, 1, true);
    expect(() => parseMergeCellsRecord(data, { mode: "strict" })).toThrow(/Invalid MERGECELLS payload length/);
  });
});
