import { describe, expect, it } from "vitest";
import { decodeCcittFax } from "./ccitt-fax-decode";

describe("decodeCcittFax (Group 3 mixed 1D/2D)", () => {
  it("decodes K>0 (mixed) for a minimal 16x2 pattern", () => {
    // Encoded bitstream (MSB-first):
    // - line0 (1D): white=8 (5 bits 10011), black=8 (6 bits 000101)
    // - line1 (2D): vertical(0), vertical(0) => 1,1
    // => 13 bits total => 0x98 0xB8 (padded)
    const encoded = new Uint8Array([0x98, 0xb8]);

    const decoded = decodeCcittFax({
      encoded,
      width: 16,
      height: 2,
      parms: {
        k: 1,
        columns: 16,
        rows: 2,
        endOfLine: false,
        encodedByteAlign: false,
        blackIs1: false,
        endOfBlock: true,
        damagedRowsBeforeError: 0,
      },
    });

    // Row bytes = 2; expected rows: [FF 00], [FF 00]
    expect(Array.from(decoded)).toEqual([0xff, 0x00, 0xff, 0x00]);
  });
});

