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

describe("decodeCcittFax (Group 3 EndOfLine)", () => {
  it("decodes K=0 with EndOfLine=true (single line)", () => {
    // line0 (1D): white=8 (5 bits 10011), black=8 (6 bits 000101), then EOL (12 bits 000000000001)
    // => 23 bits => 0x98 0xA0 0x02 (padded)
    const encoded = new Uint8Array([0x98, 0xa0, 0x02]);

    const decoded = decodeCcittFax({
      encoded,
      width: 16,
      height: 1,
      parms: {
        k: 0,
        columns: 16,
        rows: 1,
        endOfLine: true,
        encodedByteAlign: false,
        blackIs1: false,
        endOfBlock: true,
        damagedRowsBeforeError: 0,
      },
    });

    expect(Array.from(decoded)).toEqual([0xff, 0x00]);
  });

  it("decodes K=0 with EndOfLine=true and EncodedByteAlign=true (multi-line)", () => {
    // Same as above, repeated twice and padded to byte boundary after each EOL.
    const encoded = new Uint8Array([0x98, 0xa0, 0x02, 0x98, 0xa0, 0x02]);

    const decoded = decodeCcittFax({
      encoded,
      width: 16,
      height: 2,
      parms: {
        k: 0,
        columns: 16,
        rows: 2,
        endOfLine: true,
        encodedByteAlign: true,
        blackIs1: false,
        endOfBlock: true,
        damagedRowsBeforeError: 0,
      },
    });

    expect(Array.from(decoded)).toEqual([0xff, 0x00, 0xff, 0x00]);
  });
});
