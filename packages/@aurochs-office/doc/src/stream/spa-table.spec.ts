/** @file PlcSpaMom parser tests */
import { parsePlcSpaMom } from "./spa-table";

/**
 * Build a PlcSpaMom binary structure.
 * PlcSpaMom = CPs[n+1] (4B each) + FSPAs[n] (26B each)
 */
function buildPlcSpaMom(
  entries: Array<{
    cp: number;
    spid: number;
    xaLeft: number;
    yaTop: number;
    xaRight: number;
    yaBottom: number;
    flags: number;
  }>,
  lastCp: number,
): Uint8Array {
  const n = entries.length;
  const size = (n + 1) * 4 + n * 26;
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);

  // Write CPs
  for (let i = 0; i < n; i++) {
    view.setInt32(i * 4, entries[i].cp, true);
  }
  view.setInt32(n * 4, lastCp, true);

  // Write FSPAs
  const fspaBase = (n + 1) * 4;
  for (let i = 0; i < n; i++) {
    const offset = fspaBase + i * 26;
    view.setInt32(offset, entries[i].spid, true);
    view.setInt32(offset + 4, entries[i].xaLeft, true);
    view.setInt32(offset + 8, entries[i].yaTop, true);
    view.setInt32(offset + 12, entries[i].xaRight, true);
    view.setInt32(offset + 16, entries[i].yaBottom, true);
    view.setUint16(offset + 20, entries[i].flags, true);
  }

  return buf;
}

describe("parsePlcSpaMom", () => {
  it("returns empty for lcb=0", () => {
    expect(parsePlcSpaMom(new Uint8Array(100), 0, 0)).toEqual([]);
  });

  it("returns empty for invalid lcb (non-integer n)", () => {
    // lcb = 10 → n = (10-4)/30 = 0.2 (not integer)
    expect(parsePlcSpaMom(new Uint8Array(100), 0, 10)).toEqual([]);
  });

  it("parses single shape anchor", () => {
    const data = buildPlcSpaMom(
      [{ cp: 5, spid: 1001, xaLeft: 100, yaTop: 200, xaRight: 500, yaBottom: 600, flags: 0 }],
      100,
    );

    const anchors = parsePlcSpaMom(data, 0, data.length);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].cp).toBe(5);
    expect(anchors[0].spid).toBe(1001);
    expect(anchors[0].xaLeft).toBe(100);
    expect(anchors[0].yaTop).toBe(200);
    expect(anchors[0].xaRight).toBe(500);
    expect(anchors[0].yaBottom).toBe(600);
    expect(anchors[0].wrapping).toBe(0);
    expect(anchors[0].fBelowText).toBe(false);
    expect(anchors[0].fAnchorLock).toBe(false);
  });

  it("parses multiple shape anchors", () => {
    const data = buildPlcSpaMom(
      [
        { cp: 10, spid: 2001, xaLeft: 0, yaTop: 0, xaRight: 1440, yaBottom: 720, flags: 0x02 },
        { cp: 50, spid: 2002, xaLeft: 500, yaTop: 300, xaRight: 2000, yaBottom: 1200, flags: 0x05 },
      ],
      100,
    );

    const anchors = parsePlcSpaMom(data, 0, data.length);
    expect(anchors).toHaveLength(2);
    expect(anchors[0].cp).toBe(10);
    expect(anchors[0].spid).toBe(2001);
    expect(anchors[0].wrapping).toBe(2);  // flags & 0x0F
    expect(anchors[1].cp).toBe(50);
    expect(anchors[1].spid).toBe(2002);
    expect(anchors[1].wrapping).toBe(5);
  });

  it("decodes fBelowText and fAnchorLock flags", () => {
    // fBelowText = bit 9 = 0x0200
    // fAnchorLock = bit 10 = 0x0400
    const flags = 0x0200 | 0x0400 | 0x03; // wr=3, fBelowText=true, fAnchorLock=true
    const data = buildPlcSpaMom(
      [{ cp: 0, spid: 3001, xaLeft: 0, yaTop: 0, xaRight: 100, yaBottom: 100, flags }],
      50,
    );

    const anchors = parsePlcSpaMom(data, 0, data.length);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].wrapping).toBe(3);
    expect(anchors[0].fBelowText).toBe(true);
    expect(anchors[0].fAnchorLock).toBe(true);
  });

  it("handles data at non-zero offset in table stream", () => {
    const spaData = buildPlcSpaMom(
      [{ cp: 20, spid: 4001, xaLeft: 50, yaTop: 50, xaRight: 300, yaBottom: 200, flags: 0 }],
      80,
    );

    const offset = 100;
    const tableStream = new Uint8Array(offset + spaData.length);
    tableStream.set(spaData, offset);

    const anchors = parsePlcSpaMom(tableStream, offset, spaData.length);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].cp).toBe(20);
    expect(anchors[0].spid).toBe(4001);
  });

  it("returns empty when data truncated", () => {
    const data = buildPlcSpaMom(
      [{ cp: 0, spid: 1, xaLeft: 0, yaTop: 0, xaRight: 0, yaBottom: 0, flags: 0 }],
      10,
    );
    // Claim the data is at offset 0 with full lcb, but provide truncated buffer
    expect(parsePlcSpaMom(data.subarray(0, 10), 0, data.length)).toEqual([]);
  });
});
