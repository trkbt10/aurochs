/**
 * @file Tests for filter-parse.ts
 *
 * Tests each PNG unfilter type individually.
 */

import { createFilter } from "./filter-parse";
import { createSyncReader } from "./sync-reader";
import { concatUint8Arrays } from "./buffer-util";

function unfilter(args: {
  rawLines: Uint8Array[];
  width: number;
  height: number;
  bpp: number;
  depth: number;
}): Uint8Array[] {
  const combined = concatUint8Arrays(args.rawLines);
  const reader = createSyncReader(combined);
  const output: Uint8Array[] = [];
  const filter = createFilter(
    { width: args.width, height: args.height, interlace: false, bpp: args.bpp, depth: args.depth },
    { read: reader.read, write: (d) => output.push(d.slice()), complete: () => {} },
  );
  filter.start();
  reader.process();
  return output;
}

describe("createFilter", () => {
  describe("filter type 0 (None)", () => {
    it("passes through data unchanged", () => {
      const lines = unfilter({
        rawLines: [new Uint8Array([0, 10, 20, 30, 40])],
        width: 1, height: 1, bpp: 4, depth: 8,
      });
      expect(Array.from(lines[0])).toEqual([10, 20, 30, 40]);
    });

    it("works for multi-pixel line", () => {
      const lines = unfilter({
        rawLines: [new Uint8Array([0, 1, 2, 3])],
        width: 3, height: 1, bpp: 1, depth: 8,
      });
      expect(Array.from(lines[0])).toEqual([1, 2, 3]);
    });
  });

  describe("filter type 1 (Sub)", () => {
    it("adds left neighbor", () => {
      // encoded: [1, 100, 10] → decoded: [100, 110]
      const lines = unfilter({
        rawLines: [new Uint8Array([1, 100, 10])],
        width: 2, height: 1, bpp: 1, depth: 8,
      });
      expect(lines[0][0]).toBe(100);
      expect(lines[0][1]).toBe(110);
    });

    it("works with bpp=4", () => {
      // first 4 bytes raw, next 4 add left
      const lines = unfilter({
        rawLines: [new Uint8Array([1, 10, 20, 30, 40, 5, 5, 5, 5])],
        width: 2, height: 1, bpp: 4, depth: 8,
      });
      expect(lines[0][4]).toBe(15); // 5+10
      expect(lines[0][5]).toBe(25); // 5+20
      expect(lines[0][6]).toBe(35); // 5+30
      expect(lines[0][7]).toBe(45); // 5+40
    });
  });

  describe("filter type 2 (Up)", () => {
    it("adds above neighbor across lines", () => {
      const lines = unfilter({
        rawLines: [
          new Uint8Array([0, 50]),
          new Uint8Array([2, 30]),
        ],
        width: 1, height: 2, bpp: 1, depth: 8,
      });
      expect(lines[0][0]).toBe(50);
      expect(lines[1][0]).toBe(80); // 30+50
    });

    it("first line with Up has no above (treated as 0)", () => {
      const lines = unfilter({
        rawLines: [new Uint8Array([2, 42])],
        width: 1, height: 1, bpp: 1, depth: 8,
      });
      expect(lines[0][0]).toBe(42); // 42+0
    });
  });

  describe("filter type 3 (Average)", () => {
    it("computes floor((left+up)/2)", () => {
      const lines = unfilter({
        rawLines: [
          new Uint8Array([0, 100]),    // line 0: None, val=100
          new Uint8Array([3, 0]),       // line 1: Avg, encoded=0. floor((0+100)/2)=50. decoded=0+50=50
        ],
        width: 1, height: 2, bpp: 1, depth: 8,
      });
      expect(lines[1][0]).toBe(50);
    });
  });

  describe("filter type 4 (Paeth)", () => {
    it("first line single pixel: paeth(0,0,0)=0, decoded=raw", () => {
      const lines = unfilter({
        rawLines: [new Uint8Array([4, 42])],
        width: 1, height: 1, bpp: 1, depth: 8,
      });
      expect(lines[0][0]).toBe(42);
    });

    it("second line uses above for paeth", () => {
      const lines = unfilter({
        rawLines: [
          new Uint8Array([0, 100]),
          new Uint8Array([4, 5]),   // paeth(0, 100, 0) = 100. decoded = 5+100=105
        ],
        width: 1, height: 2, bpp: 1, depth: 8,
      });
      expect(lines[1][0]).toBe(105);
    });
  });

  describe("unknown filter type", () => {
    it("throws on filter byte 99", () => {
      expect(() => {
        unfilter({
          rawLines: [new Uint8Array([99, 0, 0, 0, 0])],
          width: 1, height: 1, bpp: 4, depth: 8,
        });
      }).toThrow("Unrecognised filter type");
    });
  });

  describe("multiple lines", () => {
    it("processes 3 lines with different filter types", () => {
      const lines = unfilter({
        rawLines: [
          new Uint8Array([0, 10]),  // None
          new Uint8Array([0, 20]),  // None
          new Uint8Array([2, 5]),   // Up: 5+20=25
        ],
        width: 1, height: 3, bpp: 1, depth: 8,
      });
      expect(lines.length).toBe(3);
      expect(lines[0][0]).toBe(10);
      expect(lines[1][0]).toBe(20);
      expect(lines[2][0]).toBe(25);
    });
  });
});
