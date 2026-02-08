/** @file FKP parser tests */
import { parseChpFkp, parsePapFkp } from "./fkp";
import { SPRM_CHP, SPRM_PAP } from "../sprm/sprm-decoder";

function buildFkpPage(): { data: Uint8Array; view: DataView } {
  // Build a full 512-byte page inside a larger stream
  const data = new Uint8Array(1024);
  const view = new DataView(data.buffer);
  return { data, view };
}

describe("parseChpFkp", () => {
  it("returns empty for crun=0", () => {
    const { data } = buildFkpPage();
    // Page 0: crun at byte 511 = 0
    data[511] = 0;
    expect(parseChpFkp(data, 0)).toEqual([]);
  });

  it("parses a single run with default properties", () => {
    const { data, view } = buildFkpPage();
    // crun = 1
    data[511] = 1;
    // rgfc[0] = 0, rgfc[1] = 100
    view.setUint32(0, 0, true);
    view.setUint32(4, 100, true);
    // rgb[0] = 0 → default
    data[8] = 0;

    const runs = parseChpFkp(data, 0);
    expect(runs).toHaveLength(1);
    expect(runs[0].fcStart).toBe(0);
    expect(runs[0].fcEnd).toBe(100);
    expect(runs[0].sprms).toHaveLength(0);
  });

  it("parses a run with bold SPRM", () => {
    const { data, view } = buildFkpPage();
    data[511] = 1;
    view.setUint32(0, 0, true);
    view.setUint32(4, 50, true);

    // Place CHPX at offset 200 (= rgb value 100, since 100*2=200)
    data[8] = 100; // rgb[0] = 100

    // CHPX at 200: cb=3, then sprmCFBold=0x0835 ON
    data[200] = 3; // cb
    data[201] = 0x35; // opcode lo
    data[202] = 0x08; // opcode hi
    data[203] = 0x01; // operand = ON

    const runs = parseChpFkp(data, 0);
    expect(runs).toHaveLength(1);
    expect(runs[0].sprms).toHaveLength(1);
    expect(runs[0].sprms[0].opcode.raw).toBe(SPRM_CHP.CFBold);
  });

  it("parses multiple runs", () => {
    const { data, view } = buildFkpPage();
    data[511] = 2;
    // rgfc[0..2]
    view.setUint32(0, 0, true);
    view.setUint32(4, 10, true);
    view.setUint32(8, 20, true);
    // rgb[0] = 0 (default), rgb[1] = 100
    data[12] = 0;
    data[13] = 100;

    // CHPX at 200: cb=3, bold
    data[200] = 3;
    data[201] = 0x35;
    data[202] = 0x08;
    data[203] = 0x01;

    const runs = parseChpFkp(data, 0);
    expect(runs).toHaveLength(2);
    expect(runs[0].sprms).toHaveLength(0);
    expect(runs[1].sprms).toHaveLength(1);
  });

  it("reads from non-zero page number", () => {
    const data = new Uint8Array(1536); // 3 pages
    const view = new DataView(data.buffer);
    // Page 1 at offset 512
    data[512 + 511] = 1;
    view.setUint32(512, 0, true);
    view.setUint32(516, 50, true);
    data[512 + 8] = 0; // default

    const runs = parseChpFkp(data, 1);
    expect(runs).toHaveLength(1);
    expect(runs[0].fcEnd).toBe(50);
  });
});

describe("parsePapFkp", () => {
  it("returns empty for crun=0", () => {
    const { data } = buildFkpPage();
    data[511] = 0;
    expect(parsePapFkp(data, 0)).toEqual([]);
  });

  it("parses a single run with style and SPRMs", () => {
    const { data, view } = buildFkpPage();
    data[511] = 1;
    // rgfc
    view.setUint32(0, 0, true);
    view.setUint32(4, 100, true);

    // rgbx[0]: bOffset=100 (→ 200), + 12 bytes PHE (unused)
    data[8] = 100;

    // PAPX at 200: cb=3 → total=6 bytes (cb*2)
    // istd(2B) + grpprl(4B, but only 3B used, last byte zero padding)
    data[200] = 3; // cb → totalSize=6 → grpprlSize=4
    view.setUint16(201, 5, true); // istd = 5
    // sprmPJc (0x2461) = center (1) — 3 bytes of SPRM, 1 byte left (not enough for opcode)
    data[203] = 0x61;
    data[204] = 0x24;
    data[205] = 0x01;

    const runs = parsePapFkp(data, 0);
    expect(runs).toHaveLength(1);
    expect(runs[0].istd).toBe(5);
    expect(runs[0].sprms).toHaveLength(1);
    expect(runs[0].sprms[0].opcode.raw).toBe(SPRM_PAP.PJc);
  });

  it("handles cb=0 case (alternate size encoding)", () => {
    const { data, view } = buildFkpPage();
    data[511] = 1;
    view.setUint32(0, 0, true);
    view.setUint32(4, 50, true);

    data[8] = 100; // bOffset
    // PAPX at 200: cb=0, cb'=4
    data[200] = 0; // cb = 0
    data[201] = 4; // cb' = 4
    // istd at 202
    view.setUint16(202, 3, true); // istd = 3
    // 2 bytes grpprl remaining (4 - 2 = 2): not enough for a SPRM

    const runs = parsePapFkp(data, 0);
    expect(runs).toHaveLength(1);
    expect(runs[0].istd).toBe(3);
  });

  it("handles bOffset=0 (default)", () => {
    const { data, view } = buildFkpPage();
    data[511] = 1;
    view.setUint32(0, 0, true);
    view.setUint32(4, 100, true);
    data[8] = 0; // bOffset = 0

    const runs = parsePapFkp(data, 0);
    expect(runs).toHaveLength(1);
    expect(runs[0].istd).toBe(0);
    expect(runs[0].sprms).toHaveLength(0);
  });
});
