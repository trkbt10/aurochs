/** @file BinTable parser tests */
import { parseBinTable, findFkpPage, type BinTable } from "./bin-table";

function buildPlcBte(entries: Array<{ fcStart: number; fcEnd: number; page: number }>): {
  data: Uint8Array;
  offset: number;
  size: number;
} {
  const n = entries.length;
  const size = (n + 1) * 4 + n * 4;
  const data = new Uint8Array(size + 16); // extra padding
  const view = new DataView(data.buffer);
  const offset = 0;

  // Write rgfc (n+1 values)
  for (let i = 0; i < n; i++) {
    view.setUint32(offset + i * 4, entries[i].fcStart, true);
  }
  view.setUint32(offset + n * 4, entries[n - 1].fcEnd, true);

  // Write rgpn (n values)
  const pnBase = offset + (n + 1) * 4;
  for (let i = 0; i < n; i++) {
    view.setUint32(pnBase + i * 4, entries[i].page, true);
  }

  return { data, offset, size };
}

describe("parseBinTable", () => {
  it("returns empty for lcb=0", () => {
    const bt = parseBinTable(new Uint8Array(10), 0, 0);
    expect(bt.entries).toHaveLength(0);
  });

  it("throws for out-of-bounds data", () => {
    expect(() => parseBinTable(new Uint8Array(10), 5, 20)).toThrow("extends beyond");
  });

  it("parses a single entry", () => {
    const { data, offset, size } = buildPlcBte([{ fcStart: 100, fcEnd: 500, page: 3 }]);
    const bt = parseBinTable(data, offset, size);

    expect(bt.entries).toHaveLength(1);
    expect(bt.entries[0].fcStart).toBe(100);
    expect(bt.entries[0].fcEnd).toBe(500);
    expect(bt.entries[0].pageNumber).toBe(3);
  });

  it("parses multiple entries", () => {
    const { data, offset, size } = buildPlcBte([
      { fcStart: 0, fcEnd: 100, page: 1 },
      { fcStart: 100, fcEnd: 200, page: 5 },
      { fcStart: 200, fcEnd: 300, page: 10 },
    ]);
    const bt = parseBinTable(data, offset, size);

    expect(bt.entries).toHaveLength(3);
    expect(bt.entries[0].pageNumber).toBe(1);
    expect(bt.entries[1].pageNumber).toBe(5);
    expect(bt.entries[2].pageNumber).toBe(10);
  });
});

describe("findFkpPage", () => {
  const bt: BinTable = {
    entries: [
      { fcStart: 0, fcEnd: 100, pageNumber: 1 },
      { fcStart: 100, fcEnd: 200, pageNumber: 5 },
      { fcStart: 200, fcEnd: 300, pageNumber: 10 },
    ],
  };

  it("finds page for FC at start of first entry", () => {
    expect(findFkpPage(bt, 0)).toBe(1);
  });

  it("finds page for FC in middle of range", () => {
    expect(findFkpPage(bt, 150)).toBe(5);
  });

  it("finds page for FC at start of last entry", () => {
    expect(findFkpPage(bt, 200)).toBe(10);
  });

  it("returns undefined for FC beyond all entries", () => {
    expect(findFkpPage(bt, 300)).toBeUndefined();
  });

  it("returns undefined for empty table", () => {
    expect(findFkpPage({ entries: [] }, 50)).toBeUndefined();
  });

  it("handles FC at exact boundary", () => {
    expect(findFkpPage(bt, 99)).toBe(1);
    expect(findFkpPage(bt, 100)).toBe(5);
  });
});
