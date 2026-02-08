/** @file PAP extractor tests */
import { extractPapProps } from "./pap-extractor";
import { parseGrpprl } from "../sprm/sprm-decoder";

describe("extractPapProps", () => {
  it("extracts alignment (center)", () => {
    // sprmPJc(0x2461) = 1 (center)
    const sprms = parseGrpprl(new Uint8Array([0x61, 0x24, 0x01]));
    const props = extractPapProps(sprms, 0);
    expect(props.alignment).toBe("center");
  });

  it("extracts alignment (justify)", () => {
    const sprms = parseGrpprl(new Uint8Array([0x61, 0x24, 0x03]));
    const props = extractPapProps(sprms, 0);
    expect(props.alignment).toBe("justify");
  });

  it("extracts left indent", () => {
    // sprmPDxaLeft(0x845E) = 720 twips (0.5 inch)
    const sprms = parseGrpprl(new Uint8Array([0x5e, 0x84, 0xd0, 0x02]));
    const props = extractPapProps(sprms, 0);
    expect(props.indentLeft).toBe(720);
  });

  it("extracts space before/after", () => {
    // sprmPDyaBefore(0xA413) = 240 + sprmPDyaAfter(0xA414) = 120
    const buf = new Uint8Array([
      0x13, 0xa4, 0xf0, 0x00, // spaceBefore = 240
      0x14, 0xa4, 0x78, 0x00, // spaceAfter = 120
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.spaceBefore).toBe(240);
    expect(props.spaceAfter).toBe(120);
  });

  it("extracts line spacing (proportional)", () => {
    // sprmPDyaLine(0x6412) = 360(dyaLine) + 1(fMult) → 1.5 line spacing
    const buf = new Uint8Array([0x12, 0x64, 0x68, 0x01, 0x01, 0x00]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.lineSpacing).toEqual({ value: 360, multi: true });
  });

  it("extracts keepTogether flag", () => {
    const sprms = parseGrpprl(new Uint8Array([0x05, 0x24, 0x01]));
    const props = extractPapProps(sprms, 0);
    expect(props.keepTogether).toBe(true);
  });

  it("extracts table flags", () => {
    const buf = new Uint8Array([
      0x16, 0x24, 0x01, // inTable
      0x17, 0x24, 0x01, // isRowEnd (TTP)
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.inTable).toBe(true);
    expect(props.isRowEnd).toBe(true);
  });

  it("extracts list reference", () => {
    // sprmPIlfo(0x460B) = 3 + sprmPIlvl(0x260A) = 1
    const buf = new Uint8Array([
      0x0b, 0x46, 0x03, 0x00, // listIndex = 3
      0x0a, 0x26, 0x01,       // listLevel = 1
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.listIndex).toBe(3);
    expect(props.listLevel).toBe(1);
  });

  it("preserves istd from PAPX", () => {
    const props = extractPapProps([], 42);
    expect(props.istd).toBe(42);
  });

  it("extracts legacy paragraph top border (PBrcTop80)", () => {
    // sprmPBrcTop80 (0x6424, spra=3 → 4B operand)
    // BRC80: dptLineWidth=6, brcType=1(single), ico=1(black), extra=0
    const buf = new Uint8Array([0x24, 0x64, 0x06, 0x01, 0x01, 0x00]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.borders).toBeDefined();
    expect(props.borders!.top).toBeDefined();
    expect(props.borders!.top!.style).toBe("single");
    expect(props.borders!.top!.width).toBe(6);
    expect(props.borders!.top!.color).toBe("000000");
  });

  it("extracts multiple legacy borders", () => {
    const buf = new Uint8Array([
      0x24, 0x64, 0x06, 0x01, 0x01, 0x00, // PBrcTop80: single, black
      0x26, 0x64, 0x04, 0x03, 0x06, 0x00, // PBrcBottom80: double, red
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.borders!.top!.style).toBe("single");
    expect(props.borders!.bottom!.style).toBe("double");
    expect(props.borders!.bottom!.color).toBe("FF0000");
  });

  it("extracts modern paragraph border (PBrcTop)", () => {
    // sprmPBrcTop (0xC64E, spra=6 → variable: cb(1B) + BRC(8B))
    // BRC: cv=0x0000FF(blue), dptLineWidth=4, brcType=1(single), dptSpace=0, flags=0
    const buf = new Uint8Array([
      0x4e, 0xc6,                                     // opcode
      0x08,                                            // cb = 8 (8 bytes of BRC data follow)
      0x00, 0x00, 0xff, 0x00, 0x04, 0x01, 0x00, 0x00, // BRC: blue, width=4, single
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.borders).toBeDefined();
    expect(props.borders!.top!.style).toBe("single");
    expect(props.borders!.top!.width).toBe(4);
    expect(props.borders!.top!.color).toBe("0000FF");
  });

  it("extracts legacy border between paragraphs (PBrcBetween80)", () => {
    // sprmPBrcBetween80 (0x6428, spra=3 → 4B)
    const buf = new Uint8Array([0x28, 0x64, 0x08, 0x07, 0x08, 0x00]); // width=8, dashed, white
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.borders!.between!.style).toBe("dashed");
    expect(props.borders!.between!.color).toBe("FFFFFF");
  });

  it("extracts legacy bar border (PBrcBar80)", () => {
    // sprmPBrcBar80 (0x6629, spra=3 → 4B)
    const buf = new Uint8Array([0x29, 0x66, 0x02, 0x02, 0x02, 0x00]); // width=2, thick, blue
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.borders!.bar!.style).toBe("thick");
    expect(props.borders!.bar!.color).toBe("0000FF");
  });

  it("does not set borders for zero BRC80", () => {
    const buf = new Uint8Array([0x24, 0x64, 0x00, 0x00, 0x00, 0x00]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.borders).toBeUndefined();
  });

  it("extracts legacy shading (PShd80)", () => {
    // sprmPShd80 (0x4622, spra=2 → 2B operand)
    // icoFore=1(black, bits 0-4), icoBack=8(white, bits 5-9), ipat=1(solid, bits 10-15)
    // val = 1 | (8 << 5) | (1 << 10) = 1 | 256 | 1024 = 0x0501
    const buf = new Uint8Array([0x22, 0x46, 0x01, 0x05]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.shading).toBeDefined();
    expect(props.shading!.foreColor).toBe("000000");
    expect(props.shading!.backColor).toBe("FFFFFF");
    expect(props.shading!.pattern).toBe(1);
  });

  it("returns undefined shading for Shd80Nil", () => {
    // Shd80Nil: icoFore=0x1F, icoBack=0x1F, ipat=0x3F
    // val = 0x1F | (0x1F << 5) | (0x3F << 10) = 0xFFFF
    const buf = new Uint8Array([0x22, 0x46, 0xff, 0xff]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.shading).toBeUndefined();
  });

  it("extracts modern shading (PShd)", () => {
    // sprmPShd (0xC64D, spra=6 → variable: cb(1B) + cvFore(4B) + cvBack(4B) + ipat(2B))
    // cb=10, cvFore=red(FF,00,00,00), cvBack=blue(00,00,FF,00), ipat=0
    const buf = new Uint8Array([
      0x4d, 0xc6,                   // opcode
      0x0a,                          // cb = 10
      0xff, 0x00, 0x00, 0x00,       // cvFore = red
      0x00, 0x00, 0xff, 0x00,       // cvBack = blue
      0x00, 0x00,                    // ipat = 0 (clear)
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.shading).toBeDefined();
    expect(props.shading!.foreColor).toBe("FF0000");
    expect(props.shading!.backColor).toBe("0000FF");
    expect(props.shading!.pattern).toBeUndefined();
  });

  it("extracts tab stops (PChgTabsPapx)", () => {
    // sprmPChgTabsPapx (0xC615, spra=6, 2-byte size prefix)
    // cb=7(2B) + itbdMac=2(1B) + rgdxaTab=[720,1440](2×2B) + rgtbd=[0x00,0x09](2×1B)
    // tab 0: pos=720, jc=0(left), tlc=0(none)
    // tab 1: pos=1440, jc=1(center), tlc=1(dot)
    const buf = new Uint8Array([
      0x15, 0xc6,                   // opcode
      0x07, 0x00,                   // cb = 7 (2-byte size prefix)
      0x02,                          // itbdMac = 2
      0xd0, 0x02,                   // dxaTab[0] = 720
      0xa0, 0x05,                   // dxaTab[1] = 1440
      0x00,                          // tbd[0]: jc=0(left), tlc=0(none)
      0x09,                          // tbd[1]: jc=1(center), tlc=1(dot) → 1 | (1<<3) = 9
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.tabs).toBeDefined();
    expect(props.tabs).toHaveLength(2);
    expect(props.tabs![0].position).toBe(720);
    expect(props.tabs![0].alignment).toBe("left");
    expect(props.tabs![0].leader).toBeUndefined();
    expect(props.tabs![1].position).toBe(1440);
    expect(props.tabs![1].alignment).toBe("center");
    expect(props.tabs![1].leader).toBe("dot");
  });

  it("extracts tab stops with right alignment and underscore leader", () => {
    const buf = new Uint8Array([
      0x15, 0xc6,
      0x04, 0x00,                   // cb = 4
      0x01,                          // itbdMac = 1
      0x10, 0x27,                   // dxaTab = 10000
      0x1a,                          // tbd: jc=2(right), tlc=3(underscore) → 2 | (3<<3) = 26 = 0x1a
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.tabs).toHaveLength(1);
    expect(props.tabs![0].position).toBe(10000);
    expect(props.tabs![0].alignment).toBe("right");
    expect(props.tabs![0].leader).toBe("underscore");
  });

  it("extracts tab stops with decimal and bar alignment", () => {
    const buf = new Uint8Array([
      0x15, 0xc6,
      0x07, 0x00,
      0x02,
      0xe8, 0x03,                   // 1000
      0xd0, 0x07,                   // 2000
      0x03,                          // jc=3(decimal)
      0x04,                          // jc=4(bar)
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.tabs![0].alignment).toBe("decimal");
    expect(props.tabs![1].alignment).toBe("bar");
  });

  it("returns undefined tabs for zero itbdMac", () => {
    const buf = new Uint8Array([
      0x15, 0xc6,
      0x01, 0x00,                   // cb = 1
      0x00,                          // itbdMac = 0
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.tabs).toBeUndefined();
  });

  it("extracts modern shading with pattern", () => {
    const buf = new Uint8Array([
      0x4d, 0xc6,
      0x0a,
      0x00, 0x00, 0x00, 0x00,       // cvFore = auto
      0x80, 0x80, 0x80, 0x00,       // cvBack = gray
      0x05, 0x00,                    // ipat = 5 (pct25)
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.shading!.backColor).toBe("808080");
    expect(props.shading!.pattern).toBe(5);
  });

  it("extracts spaceBeforeAuto", () => {
    // sprmPFDyaBeforeAuto(0x245B) = 1
    const sprms = parseGrpprl(new Uint8Array([0x5b, 0x24, 0x01]));
    const props = extractPapProps(sprms, 0);
    expect(props.spaceBeforeAuto).toBe(true);
  });

  it("extracts spaceAfterAuto", () => {
    // sprmPFDyaAfterAuto(0x245C) = 1
    const sprms = parseGrpprl(new Uint8Array([0x5c, 0x24, 0x01]));
    const props = extractPapProps(sprms, 0);
    expect(props.spaceAfterAuto).toBe(true);
  });
});
