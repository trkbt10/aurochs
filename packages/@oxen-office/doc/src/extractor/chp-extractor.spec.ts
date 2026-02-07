/** @file CHP extractor tests */
import { extractChpProps, chpPropsToRunProps, cpToFc, fcToCp, getAllChpxRunsInRange } from "./chp-extractor";
import { parseGrpprl } from "../sprm/sprm-decoder";
import type { PieceDescriptor } from "../stream/piece-table";
import type { BinTable } from "../stream/bin-table";
import type { ChpxRun } from "../stream/fkp";

describe("extractChpProps", () => {
  it("extracts bold property", () => {
    const sprms = parseGrpprl(new Uint8Array([0x35, 0x08, 0x01]));
    const props = extractChpProps(sprms);
    expect(props.bold).toBe(true);
  });

  it("extracts italic property", () => {
    const sprms = parseGrpprl(new Uint8Array([0x36, 0x08, 0x01]));
    const props = extractChpProps(sprms);
    expect(props.italic).toBe(true);
  });

  it("extracts font size (half-points to points)", () => {
    // sprmCHps(0x4A43) = 24 half-points = 12pt
    const sprms = parseGrpprl(new Uint8Array([0x43, 0x4a, 0x18, 0x00]));
    const props = extractChpProps(sprms);
    expect(props.fontSize).toBe(12);
  });

  it("extracts color from COLORREF", () => {
    // sprmCCv(0x6870) = red (0xFF, 0x00, 0x00, 0x00)
    const sprms = parseGrpprl(new Uint8Array([0x70, 0x68, 0xff, 0x00, 0x00, 0x00]));
    const props = extractChpProps(sprms);
    expect(props.color).toBe("FF0000");
  });

  it("extracts underline style", () => {
    // sprmCKul(0x2A3E) = single (1)
    const sprms = parseGrpprl(new Uint8Array([0x3e, 0x2a, 0x01]));
    const props = extractChpProps(sprms);
    expect(props.underline).toBe(true);
    expect(props.underlineStyle).toBe("single");
  });

  it("extracts superscript", () => {
    // sprmCIss(0x2A48) = 1 (superscript)
    const sprms = parseGrpprl(new Uint8Array([0x48, 0x2a, 0x01]));
    const props = extractChpProps(sprms);
    expect(props.superscript).toBe(true);
    expect(props.subscript).toBe(false);
  });

  it("extracts font index", () => {
    // sprmCRgFtc0(0x4A4F) = font index 2
    const sprms = parseGrpprl(new Uint8Array([0x4f, 0x4a, 0x02, 0x00]));
    const props = extractChpProps(sprms);
    expect(props.fontIndex).toBe(2);
  });

  it("extracts legacy 16-color index", () => {
    // sprmCIco(0x2A42) = red (6)
    const sprms = parseGrpprl(new Uint8Array([0x42, 0x2a, 0x06]));
    const props = extractChpProps(sprms);
    expect(props.color).toBe("FF0000");
  });

  it("handles multiple properties", () => {
    const buf = new Uint8Array([
      0x35, 0x08, 0x01, // Bold ON
      0x36, 0x08, 0x01, // Italic ON
      0x43, 0x4a, 0x18, 0x00, // fontSize = 24 half-points (12pt)
      0x70, 0x68, 0x00, 0x00, 0xff, 0x00, // color = blue
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractChpProps(sprms);
    expect(props.bold).toBe(true);
    expect(props.italic).toBe(true);
    expect(props.fontSize).toBe(12);
    expect(props.color).toBe("0000FF");
  });

  it("extracts fSpecial (CFSpec) toggle", () => {
    // sprmCFSpec = 0x0855, toggle operand = 1 (ON)
    const sprms = parseGrpprl(new Uint8Array([0x55, 0x08, 0x01]));
    const props = extractChpProps(sprms);
    expect(props.fSpecial).toBe(true);
  });

  it("extracts fSpecial as false when toggle is 0", () => {
    const sprms = parseGrpprl(new Uint8Array([0x55, 0x08, 0x00]));
    const props = extractChpProps(sprms);
    expect(props.fSpecial).toBe(false);
  });
});

describe("chpPropsToRunProps", () => {
  it("resolves font index to font name", () => {
    const fontLookup = new Map([[2, "Arial"]]);
    const props = chpPropsToRunProps({ fontIndex: 2 }, fontLookup);
    expect(props.fontName).toBe("Arial");
  });

  it("returns empty for no properties", () => {
    const props = chpPropsToRunProps({}, new Map());
    expect(Object.keys(props)).toHaveLength(0);
  });
});

describe("cpToFc", () => {
  const pieces: readonly PieceDescriptor[] = [
    { cpStart: 0, cpEnd: 50, fc: 0x40000000 | 200, compressed: true, fileOffset: 100 },
    { cpStart: 50, cpEnd: 100, fc: 400, compressed: false, fileOffset: 400 },
  ];

  it("converts CP in compressed piece", () => {
    const fc = cpToFc(10, pieces);
    // baseFc = (0x40000000 | 200) & ~0x40000000 = 200, baseFc/2 = 100
    // fc = 100 + 10 = 110
    expect(fc).toBe(110);
  });

  it("converts CP in Unicode piece", () => {
    const fc = cpToFc(60, pieces);
    // fc = 400 + (60-50) * 2 = 420
    expect(fc).toBe(420);
  });

  it("returns undefined for CP beyond all pieces", () => {
    expect(cpToFc(200, pieces)).toBeUndefined();
  });
});

describe("fcToCp", () => {
  const pieces: readonly PieceDescriptor[] = [
    { cpStart: 0, cpEnd: 50, fc: 0x40000000 | 200, compressed: true, fileOffset: 100 },
    { cpStart: 50, cpEnd: 100, fc: 400, compressed: false, fileOffset: 400 },
  ];

  it("converts FC in compressed piece", () => {
    // baseFc = 200/2 = 100, fc=110 → offset=10, cp = 0+10 = 10
    expect(fcToCp(110, pieces)).toBe(10);
  });

  it("converts FC in Unicode piece", () => {
    // fc=420 → offset=(420-400)/2=10, cp = 50+10 = 60
    expect(fcToCp(420, pieces)).toBe(60);
  });

  it("returns undefined for FC beyond all pieces", () => {
    expect(fcToCp(9999, pieces)).toBeUndefined();
  });

  it("returns undefined for FC between pieces", () => {
    // baseFc for piece 0 is 100, range is [100, 150). FC 160 is beyond piece 0.
    // piece 1 fc range starts at 400. So FC 160 is not in any piece.
    expect(fcToCp(160, pieces)).toBeUndefined();
  });

  it("roundtrips with cpToFc for compressed piece", () => {
    const cp = 25;
    const fc = cpToFc(cp, pieces);
    expect(fc).toBeDefined();
    expect(fcToCp(fc!, pieces)).toBe(cp);
  });

  it("roundtrips with cpToFc for Unicode piece", () => {
    const cp = 75;
    const fc = cpToFc(cp, pieces);
    expect(fc).toBeDefined();
    expect(fcToCp(fc!, pieces)).toBe(cp);
  });
});

describe("getAllChpxRunsInRange", () => {
  // Build a minimal FKP page with 2 runs:
  // Run 0: FC [100, 110) with Bold SPRM
  // Run 1: FC [110, 120) with no SPRM (default)
  function buildTestFkpPage(): Uint8Array {
    const page = new Uint8Array(512);
    const view = new DataView(page.buffer);
    // crun = 2
    page[511] = 2;
    // rgfc[0]=100, rgfc[1]=110, rgfc[2]=120
    view.setUint32(0, 100, true);
    view.setUint32(4, 110, true);
    view.setUint32(8, 120, true);
    // rgb offsets start at (crun+1)*4 = 12
    // rgb[0] = offset to CHPX → put at byte 200, so offset = 100
    page[12] = 100;
    // rgb[1] = 0 (default properties)
    page[13] = 0;
    // CHPX at offset 100*2=200: cb=3, grpprl = Bold SPRM (0x0835, 0x01)
    page[200] = 3;
    page[201] = 0x35;
    page[202] = 0x08;
    page[203] = 0x01;
    return page;
  }

  it("collects runs overlapping FC range", () => {
    const fkpPage = buildTestFkpPage();
    // Place FKP at page 0 (offset 0) in a 512-byte stream
    const wordDocStream = fkpPage;

    const binTable: BinTable = {
      entries: [{ fcStart: 100, fcEnd: 120, pageNumber: 0 }],
    };
    const cache = new Map<number, readonly ChpxRun[]>();

    const runs = getAllChpxRunsInRange(100, 120, binTable, wordDocStream, cache);
    expect(runs).toHaveLength(2);
    expect(runs[0].fcStart).toBe(100);
    expect(runs[0].fcEnd).toBe(110);
    expect(runs[0].sprms).toHaveLength(1); // Bold
    expect(runs[1].fcStart).toBe(110);
    expect(runs[1].fcEnd).toBe(120);
    expect(runs[1].sprms).toHaveLength(0); // Default
  });

  it("returns only overlapping runs for partial range", () => {
    const wordDocStream = buildTestFkpPage();
    const binTable: BinTable = {
      entries: [{ fcStart: 100, fcEnd: 120, pageNumber: 0 }],
    };
    const cache = new Map<number, readonly ChpxRun[]>();

    // Only request FC [105, 115) - overlaps both runs
    const runs = getAllChpxRunsInRange(105, 115, binTable, wordDocStream, cache);
    expect(runs).toHaveLength(2);
  });

  it("returns empty for non-overlapping range", () => {
    const wordDocStream = buildTestFkpPage();
    const binTable: BinTable = {
      entries: [{ fcStart: 100, fcEnd: 120, pageNumber: 0 }],
    };
    const cache = new Map<number, readonly ChpxRun[]>();

    const runs = getAllChpxRunsInRange(200, 300, binTable, wordDocStream, cache);
    expect(runs).toHaveLength(0);
  });

  it("returns empty for empty range", () => {
    const wordDocStream = buildTestFkpPage();
    const binTable: BinTable = {
      entries: [{ fcStart: 100, fcEnd: 120, pageNumber: 0 }],
    };
    const cache = new Map<number, readonly ChpxRun[]>();

    const runs = getAllChpxRunsInRange(110, 110, binTable, wordDocStream, cache);
    expect(runs).toHaveLength(0);
  });

  it("uses cache for repeated calls", () => {
    const wordDocStream = buildTestFkpPage();
    const binTable: BinTable = {
      entries: [{ fcStart: 100, fcEnd: 120, pageNumber: 0 }],
    };
    const cache = new Map<number, readonly ChpxRun[]>();

    getAllChpxRunsInRange(100, 120, binTable, wordDocStream, cache);
    expect(cache.has(0)).toBe(true);

    // Second call should use cache (same result)
    const runs = getAllChpxRunsInRange(100, 120, binTable, wordDocStream, cache);
    expect(runs).toHaveLength(2);
  });
});
