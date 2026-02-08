/** @file TAP extractor tests */
import { extractTapProps } from "./tap-extractor";
import { parseGrpprl } from "../sprm/sprm-decoder";

function pushUint16(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

function pushInt16(arr: number[], value: number): void {
  const buf = new ArrayBuffer(2);
  new DataView(buf).setInt16(0, value, true);
  const bytes = new Uint8Array(buf);
  arr.push(bytes[0], bytes[1]);
}

describe("extractTapProps", () => {
  it("extracts row height from TDyaRowHeight", () => {
    // sprmTDyaRowHeight(0x9407) = 480 twips
    const bytes: number[] = [];
    pushUint16(bytes, 0x9407);
    pushInt16(bytes, 480);
    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBe(480);
  });

  it("extracts negative row height (exact)", () => {
    // Negative dyaRowHeight means exact height
    const bytes: number[] = [];
    pushUint16(bytes, 0x9407);
    pushInt16(bytes, -240);
    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBe(-240);
  });

  it("extracts header row flag from TTableHeader", () => {
    // sprmTTableHeader(0x3404) = 1 (true)
    const sprms = parseGrpprl(new Uint8Array([0x04, 0x34, 0x01]));
    const props = extractTapProps(sprms);
    expect(props.isHeader).toBe(true);
  });

  it("extracts header row flag = false", () => {
    const sprms = parseGrpprl(new Uint8Array([0x04, 0x34, 0x00]));
    const props = extractTapProps(sprms);
    expect(props.isHeader).toBe(false);
  });

  it("extracts table alignment from TJc", () => {
    // sprmTJc(0x548A) = center (1)
    const bytes: number[] = [];
    pushUint16(bytes, 0x548a);
    pushUint16(bytes, 1);
    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.alignment).toBe("center");
  });

  it("extracts cell widths from TDefTable", () => {
    // sprmTDefTable(0xD608) — variable-length SPRM (spra=6)
    // Operand: cb(2B) + itcMac(1B) + rgdxaCenter[(itcMac+1) × 2B] + rgtc[...]
    // Build a 3-cell table with widths: 2000, 3000, 2500
    // Centers: [0, 2000, 5000, 7500]
    const itcMac = 3;
    const rgdxaCenter = [0, 2000, 5000, 7500];

    const operandBytes: number[] = [];
    // itcMac
    operandBytes.push(itcMac);
    // rgdxaCenter
    for (const c of rgdxaCenter) {
      pushInt16(operandBytes, c);
    }

    // cb = operandBytes.length (everything after cb)
    const cb = operandBytes.length;

    // Build full SPRM: opcode(2B) + cb(2B) + operand
    const bytes: number[] = [];
    pushUint16(bytes, 0xd608); // opcode
    pushUint16(bytes, cb); // cb (variable-length size)
    bytes.push(...operandBytes);

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);

    expect(props.cellWidths).toEqual([2000, 3000, 2500]);
  });

  it("returns empty props when no TAP SPRMs present", () => {
    // Only a PAP SPRM (Bold)
    const sprms = parseGrpprl(new Uint8Array([0x35, 0x08, 0x01]));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBeUndefined();
    expect(props.isHeader).toBeUndefined();
    expect(props.cellWidths).toBeUndefined();
  });

  it("handles multiple TAP SPRMs together", () => {
    const bytes: number[] = [];

    // TDyaRowHeight = 360
    pushUint16(bytes, 0x9407);
    pushInt16(bytes, 360);

    // TTableHeader = true
    bytes.push(0x04, 0x34, 0x01);

    // TJc = right (2)
    pushUint16(bytes, 0x548a);
    pushUint16(bytes, 2);

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBe(360);
    expect(props.isHeader).toBe(true);
    expect(props.alignment).toBe("right");
  });

  it("extracts vertical alignment from TVertAlign", () => {
    // sprmTVertAlign(0xD62C) — spra=6 (variable, 1-byte cb prefix)
    // Operand: cb(1B) + alignment bytes per cell
    const bytes: number[] = [];
    pushUint16(bytes, 0xd62c); // opcode
    bytes.push(3); // cb = 3 bytes (1-byte prefix)
    bytes.push(0, 1, 2); // top, center, bottom

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.verticalAlign).toEqual(["top", "center", "bottom"]);
  });

  it("extracts vertical merge from TVertMerge", () => {
    // sprmTVertMerge(0xD62B) — spra=6 (variable, 1-byte cb prefix)
    // Operand: cb(1B) + itc(1B) + flags(1B)
    // Two SPRMs: cell 0 = restart (3), cell 1 = continue (1)
    const bytes: number[] = [];

    // First: cell 0 = restart
    pushUint16(bytes, 0xd62b);
    bytes.push(2); // cb = 2 (1-byte prefix)
    bytes.push(0, 3); // itc=0, flags=3 (restart)

    // Second: cell 1 = continue
    pushUint16(bytes, 0xd62b);
    bytes.push(2); // cb = 2 (1-byte prefix)
    bytes.push(1, 1); // itc=1, flags=1 (continue)

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.verticalMerge).toEqual(["restart", "continue"]);
  });

  it("extracts horizontal merge from TMerge", () => {
    // sprmTMerge(0x5624) — spra=2 (2B operand)
    // itcFirst(1B) + itcLim(1B)
    const bytes: number[] = [];
    pushUint16(bytes, 0x5624);
    bytes.push(0, 3); // merge cells [0, 3)

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.horizontalMerge).toEqual(["restart", "continue", "continue"]);
  });

  it("extracts table borders from TTableBorders", () => {
    // sprmTTableBorders(0xD613) — spra=6 (variable, 1-byte cb prefix)
    // Operand: cb(1B) + 6 × BRC80 (4B each)
    // BRC80: dptLineWidth(1B) + brcType(1B) + ico(1B) + dptSpace+flags(1B)
    const bytes: number[] = [];
    pushUint16(bytes, 0xd613);
    bytes.push(24); // cb = 24 (6 × 4B, 1-byte prefix)

    // top: width=1, single(1), black(1)
    bytes.push(1, 1, 1, 0);
    // left: width=2, double(3), red(6)
    bytes.push(2, 3, 6, 0);
    // bottom: width=1, single(1), black(1)
    bytes.push(1, 1, 1, 0);
    // right: width=2, double(3), red(6)
    bytes.push(2, 3, 6, 0);
    // insideH: empty
    bytes.push(0, 0, 0, 0);
    // insideV: empty
    bytes.push(0, 0, 0, 0);

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.borders).toBeDefined();
    expect(props.borders?.top).toEqual({ style: "single", width: 1, color: "000000" });
    expect(props.borders?.left).toEqual({ style: "double", width: 2, color: "FF0000" });
    expect(props.borders?.insideH).toBeUndefined();
  });

  it("extracts cell shading from TDefTableShd", () => {
    // sprmTDefTableShd(0xD612) — spra=6 (variable, 1-byte cb prefix)
    // Operand: cb(1B) + SHD[](each 10B: cvFore(4B) + cvBack(4B) + ipat(2B))
    const bytes: number[] = [];
    pushUint16(bytes, 0xd612);
    bytes.push(20); // cb = 20 (2 × 10B, 1-byte prefix)

    // Cell 0: cvFore=0, cvBack=0xFF0000 (red), ipat=0
    bytes.push(0, 0, 0, 0); // cvFore (R,G,B,0)
    bytes.push(0xff, 0, 0, 0); // cvBack (R=255, G=0, B=0)
    pushUint16(bytes, 0); // ipat

    // Cell 1: cvFore=0, cvBack=0x00FF00 (green), ipat=0
    bytes.push(0, 0, 0, 0); // cvFore
    bytes.push(0, 0xff, 0, 0); // cvBack (R=0, G=255, B=0)
    pushUint16(bytes, 0); // ipat

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.cellShading).toEqual(["FF0000", "00FF00"]);
  });

  it("returns undefined shading for black background", () => {
    const bytes: number[] = [];
    pushUint16(bytes, 0xd612);
    bytes.push(10); // cb = 10 (1 × 10B, 1-byte prefix)

    bytes.push(0, 0, 0, 0); // cvFore
    bytes.push(0, 0, 0, 0); // cvBack = black (treated as auto/transparent)
    pushUint16(bytes, 0); // ipat

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.cellShading).toEqual([undefined]);
  });
});
