/**
 * @file BIFF FORMULA record tests
 */

import { parseFormulaRecord } from "./formula";
import { createXlsWarningCollector } from "../../warnings";

function makeFormulaPayload(args: {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly numBytes: Uint8Array;
  readonly grbit: number;
  readonly tokens: Uint8Array;
}): Uint8Array {
  const out = new Uint8Array(22 + args.tokens.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, args.row, true);
  view.setUint16(2, args.col, true);
  view.setUint16(4, args.xfIndex, true);
  out.set(args.numBytes, 6);
  view.setUint16(14, args.grbit, true);
  view.setUint32(16, 0, true); // chn
  view.setUint16(20, args.tokens.length, true);
  out.set(args.tokens, 22);
  return out;
}

describe("parseFormulaRecord", () => {
  it("parses numeric cached values", () => {
    const numBytes = new Uint8Array(8);
    new DataView(numBytes.buffer).setFloat64(0, 11, true);
    const payload = makeFormulaPayload({
      row: 1,
      col: 2,
      xfIndex: 3,
      numBytes,
      grbit: 0x0003,
      tokens: new Uint8Array([0x1e, 0x05, 0x00, 0x1e, 0x06, 0x00, 0x03]),
    });

    expect(parseFormulaRecord(payload)).toMatchObject({
      row: 1,
      col: 2,
      xfIndex: 3,
      cached: { type: "number", value: 11 },
      flags: { alwaysCalc: true, calcOnLoad: true, isSharedFormula: false },
    });
  });

  it("tolerates inconsistent cce by truncating tokens to available payload bytes", () => {
    const numBytes = new Uint8Array(8);
    new DataView(numBytes.buffer).setFloat64(0, 11, true);
    const payload = makeFormulaPayload({
      row: 0,
      col: 0,
      xfIndex: 0,
      numBytes,
      grbit: 0,
      tokens: new Uint8Array([0xaa, 0xbb]),
    });
    // Overwrite cce with a larger value than available.
    new DataView(payload.buffer).setUint16(20, 0xffff, true);
    const collector = createXlsWarningCollector();
    expect(parseFormulaRecord(payload, { mode: "lenient", warn: collector.warn }).tokens).toEqual(new Uint8Array([0xaa, 0xbb]));
    expect(collector.warnings.map((w) => w.code)).toContain("FORMULA_CCE_TRUNCATED");
  });

  it("throws on inconsistent cce in strict mode", () => {
    const numBytes = new Uint8Array(8);
    new DataView(numBytes.buffer).setFloat64(0, 11, true);
    const payload = makeFormulaPayload({
      row: 0,
      col: 0,
      xfIndex: 0,
      numBytes,
      grbit: 0,
      tokens: new Uint8Array([0xaa, 0xbb]),
    });
    new DataView(payload.buffer).setUint16(20, 0xffff, true);
    expect(() => parseFormulaRecord(payload, { mode: "strict" })).toThrow(/Invalid FORMULA payload length/);
  });

  it("parses string marker cached values", () => {
    const numBytes = new Uint8Array([0x00, 0, 0, 0, 0, 0, 0xff, 0xff]);
    const payload = makeFormulaPayload({
      row: 0,
      col: 0,
      xfIndex: 0,
      numBytes,
      grbit: 0,
      tokens: new Uint8Array([]),
    });
    expect(parseFormulaRecord(payload).cached).toEqual({ type: "string" });
  });

  it("parses boolean cached values", () => {
    const numBytes = new Uint8Array([0x01, 0x00, 0x01, 0, 0, 0, 0xff, 0xff]);
    const payload = makeFormulaPayload({
      row: 0,
      col: 0,
      xfIndex: 0,
      numBytes,
      grbit: 0,
      tokens: new Uint8Array([]),
    });
    expect(parseFormulaRecord(payload).cached).toEqual({ type: "boolean", value: true });
  });

  it("parses error cached values", () => {
    const numBytes = new Uint8Array([0x02, 0x00, 0x07, 0, 0, 0, 0xff, 0xff]);
    const payload = makeFormulaPayload({
      row: 0,
      col: 0,
      xfIndex: 0,
      numBytes,
      grbit: 0,
      tokens: new Uint8Array([]),
    });
    expect(parseFormulaRecord(payload).cached).toEqual({ type: "error", value: "#DIV/0!" });
  });

  it("parses empty cached values", () => {
    const numBytes = new Uint8Array([0x03, 0x00, 0x00, 0, 0, 0, 0xff, 0xff]);
    const payload = makeFormulaPayload({
      row: 0,
      col: 0,
      xfIndex: 0,
      numBytes,
      grbit: 0,
      tokens: new Uint8Array([]),
    });
    expect(parseFormulaRecord(payload).cached).toEqual({ type: "empty" });
  });
});
