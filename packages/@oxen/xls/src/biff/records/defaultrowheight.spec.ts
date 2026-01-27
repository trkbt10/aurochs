/**
 * @file DEFAULTROWHEIGHT record parser tests
 */

import { parseDefaultrowheightRecord } from "./defaultrowheight";

describe("xls/biff/records/defaultrowheight", () => {
  it("parses flags and heightTwips", () => {
    const data = new Uint8Array(4);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0x0001 | 0x0004, true); // unsynced + exAsc
    view.setUint16(2, 255, true);

    const record = parseDefaultrowheightRecord(data);
    expect(record.isUnsynced).toBe(true);
    expect(record.isHeightZero).toBe(false);
    expect(record.hasExtraSpaceAbove).toBe(true);
    expect(record.hasExtraSpaceBelow).toBe(false);
    expect(record.heightTwips).toBe(255);
  });

  it("throws on invalid payload length", () => {
    expect(() => parseDefaultrowheightRecord(new Uint8Array(3))).toThrow(/Invalid DEFAULTROWHEIGHT payload length/);
  });
});

