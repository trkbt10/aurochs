/** @file SPRM decoder tests */
import {
  decodeSprmOpcode,
  getOperandSize,
  parseGrpprl,
  sprmToggle,
  sprmUint8,
  sprmUint16,
  sprmUint32,
  colorRefToHex,
  SPRM_CHP,
  SPRM_PAP,
  SPRM_SEP,
  ICO_COLORS,
} from "./sprm-decoder";

describe("decodeSprmOpcode", () => {
  it("decodes sprmCFBold (0x0835)", () => {
    const op = decodeSprmOpcode(0x0835);
    expect(op.ispmd).toBe(0x35);
    expect(op.fSpec).toBe(false);
    expect(op.sgc).toBe(2); // character
    expect(op.spra).toBe(0); // toggle
  });

  it("decodes sprmCHps (0x4A43)", () => {
    const op = decodeSprmOpcode(0x4a43);
    expect(op.ispmd).toBe(0x43);
    expect(op.fSpec).toBe(true);
    expect(op.sgc).toBe(2); // character
    expect(op.spra).toBe(2); // 2 bytes
  });

  it("decodes sprmPJc (0x2461)", () => {
    const op = decodeSprmOpcode(0x2461);
    expect(op.ispmd).toBe(0x61);
    expect(op.fSpec).toBe(false);
    expect(op.sgc).toBe(1); // paragraph
    expect(op.spra).toBe(1); // 1 byte
  });

  it("decodes sprmCCv (0x6870)", () => {
    const op = decodeSprmOpcode(0x6870);
    expect(op.ispmd).toBe(0x70);
    expect(op.fSpec).toBe(false);
    expect(op.sgc).toBe(2); // character
    expect(op.spra).toBe(3); // 4 bytes
  });

  it("decodes section SPRM sprmSXaPage (0xB01F)", () => {
    const op = decodeSprmOpcode(0xb01f);
    expect(op.sgc).toBe(4); // section
    expect(op.spra).toBe(5); // 2 bytes
  });
});

describe("getOperandSize", () => {
  const dummy = new Uint8Array(10);

  it("returns 1 for spra=0 (toggle)", () => {
    expect(getOperandSize(0, 0, dummy, 0)).toBe(1);
  });

  it("returns 1 for spra=1", () => {
    expect(getOperandSize(1, 0, dummy, 0)).toBe(1);
  });

  it("returns 2 for spra=2", () => {
    expect(getOperandSize(2, 0, dummy, 0)).toBe(2);
  });

  it("returns 4 for spra=3", () => {
    expect(getOperandSize(3, 0, dummy, 0)).toBe(4);
  });

  it("returns 3 for spra=7", () => {
    expect(getOperandSize(7, 0, dummy, 0)).toBe(3);
  });

  it("handles variable-length (spra=6) with 1-byte size", () => {
    const data = new Uint8Array([5, 0, 0, 0, 0, 0]);
    expect(getOperandSize(6, 0x0000, data, 0)).toBe(6); // 5 + 1 (size byte)
  });

  it("handles variable-length (spra=6) with 2-byte size for sprmTDefTable", () => {
    const data = new Uint8Array([10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getOperandSize(6, 0xd608, data, 0)).toBe(12); // 10 + 2 (2-byte size)
  });
});

describe("parseGrpprl", () => {
  it("parses a simple grpprl with one toggle SPRM", () => {
    // sprmCFBold (0x0835) with operand 0x01 (ON)
    const buf = new Uint8Array([0x35, 0x08, 0x01]);
    const sprms = parseGrpprl(buf);
    expect(sprms).toHaveLength(1);
    expect(sprms[0].opcode.raw).toBe(0x0835);
    expect(sprmToggle(sprms[0])).toBe(true);
  });

  it("parses multiple SPRMs in sequence", () => {
    // sprmCFBold ON + sprmCFItalic ON + sprmCHps=24 (12pt)
    const buf = new Uint8Array([
      0x35, 0x08, 0x01,       // Bold ON
      0x36, 0x08, 0x01,       // Italic ON
      0x43, 0x4a, 0x18, 0x00, // fontSize = 24 half-points
    ]);
    const sprms = parseGrpprl(buf);
    expect(sprms).toHaveLength(3);
    expect(sprms[0].opcode.raw).toBe(SPRM_CHP.CFBold);
    expect(sprms[1].opcode.raw).toBe(SPRM_CHP.CFItalic);
    expect(sprms[2].opcode.raw).toBe(SPRM_CHP.CHps);
    expect(sprmUint16(sprms[2])).toBe(24);
  });

  it("parses 4-byte operand (COLORREF)", () => {
    // sprmCCv (0x6870) with 0xFF,0x00,0x00,0x00 = red
    const buf = new Uint8Array([0x70, 0x68, 0xff, 0x00, 0x00, 0x00]);
    const sprms = parseGrpprl(buf);
    expect(sprms).toHaveLength(1);
    expect(colorRefToHex(sprms[0])).toBe("FF0000");
  });

  it("parses paragraph alignment SPRM", () => {
    // sprmPJc (0x2461) with operand 1 (center)
    const buf = new Uint8Array([0x61, 0x24, 0x01]);
    const sprms = parseGrpprl(buf);
    expect(sprms).toHaveLength(1);
    expect(sprms[0].opcode.raw).toBe(SPRM_PAP.PJc);
    expect(sprmUint8(sprms[0])).toBe(1);
  });

  it("parses section SPRM for page width", () => {
    // sprmSXaPage (0xB01F) with 12240 twips (= 8.5 inches)
    const buf = new Uint8Array([0x1f, 0xb0, 0xd0, 0x2f]);
    const sprms = parseGrpprl(buf);
    expect(sprms).toHaveLength(1);
    expect(sprms[0].opcode.raw).toBe(SPRM_SEP.SXaPage);
    expect(sprmUint16(sprms[0])).toBe(12240);
  });

  it("handles empty grpprl", () => {
    const sprms = parseGrpprl(new Uint8Array(0));
    expect(sprms).toHaveLength(0);
  });

  it("stops at truncated data", () => {
    // Only 1 byte - not enough for opcode
    const sprms = parseGrpprl(new Uint8Array([0x35]));
    expect(sprms).toHaveLength(0);
  });
});

describe("sprmToggle", () => {
  it("returns false for 0x00 (OFF)", () => {
    const buf = new Uint8Array([0x35, 0x08, 0x00]);
    const sprms = parseGrpprl(buf);
    expect(sprmToggle(sprms[0])).toBe(false);
  });

  it("returns true for 0x01 (ON)", () => {
    const buf = new Uint8Array([0x35, 0x08, 0x01]);
    const sprms = parseGrpprl(buf);
    expect(sprmToggle(sprms[0])).toBe(true);
  });

  it("returns true for 0x80 (inherit + toggle)", () => {
    const buf = new Uint8Array([0x35, 0x08, 0x80]);
    const sprms = parseGrpprl(buf);
    expect(sprmToggle(sprms[0])).toBe(true);
  });
});

describe("colorRefToHex", () => {
  it("converts blue (0,0,255,0)", () => {
    const buf = new Uint8Array([0x70, 0x68, 0x00, 0x00, 0xff, 0x00]);
    const sprms = parseGrpprl(buf);
    expect(colorRefToHex(sprms[0])).toBe("0000FF");
  });
});

describe("ICO_COLORS", () => {
  it("has correct mapping for common colors", () => {
    expect(ICO_COLORS[0]).toBeUndefined(); // auto
    expect(ICO_COLORS[1]).toBe("000000");  // black
    expect(ICO_COLORS[6]).toBe("FF0000");  // red
    expect(ICO_COLORS[8]).toBe("FFFFFF");  // white
  });
});

describe("SPRM constants", () => {
  it("has correct opcode values", () => {
    expect(SPRM_CHP.CFBold).toBe(0x0835);
    expect(SPRM_CHP.CHps).toBe(0x4a43);
    expect(SPRM_PAP.PJc).toBe(0x2461);
    expect(SPRM_SEP.SXaPage).toBe(0xb01f);
  });
});
