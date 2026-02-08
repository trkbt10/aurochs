/**
 * @file XLS extractor tests
 */

import { BIFF_RECORD_TYPES } from "../biff/record-types";
import { parseWorkbookStream } from "../biff/workbook-stream";
import { extractXlsWorkbook } from "./index";

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(length);
  chunks.reduce((offset, chunk) => {
    out.set(chunk, offset);
    return offset + chunk.length;
  }, 0);
  return out;
}

function makeRecordBytes(type: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, type, true);
  view.setUint16(2, payload.length, true);
  out.set(payload, 4);
  return out;
}

function makeBofPayload(substreamType: number): Uint8Array {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0x0600, true);
  view.setUint16(2, substreamType, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint32(8, 0, true);
  view.setUint32(12, 0x0600, true);
  return out;
}

describe("extractXlsWorkbook", () => {
  it("extracts dateSystem and numeric cells", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
    const datemode = makeRecordBytes(BIFF_RECORD_TYPES.DATEMODE, new Uint8Array([0x01, 0x00]));

    const sheetName = "Sheet1";
    const nameBytes = new Uint8Array([0x00, ...Array.from(sheetName).map((c) => c.charCodeAt(0))]);
    const boundsheetPayload = new Uint8Array(7 + nameBytes.length);
    const boundsheetView = new DataView(boundsheetPayload.buffer);
    boundsheetView.setUint32(0, 0, true); // lbPlyPos placeholder
    boundsheetView.setUint16(4, 0x0000, true); // hsState=visible, dt=worksheet
    boundsheetPayload[6] = sheetName.length;
    boundsheetPayload.set(nameBytes, 7);
    const boundsheetRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, boundsheetPayload);

    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());
    const globalsBytes = concat([bofGlobals, datemode, boundsheetRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));
    const numberPayload = new Uint8Array(14);
    const numberView = new DataView(numberPayload.buffer);
    numberView.setUint16(0, 0, true); // row
    numberView.setUint16(2, 0, true); // col
    numberView.setUint16(4, 0, true); // ixfe
    numberView.setFloat64(6, 42, true); // value
    const numberRecord = makeRecordBytes(BIFF_RECORD_TYPES.NUMBER, numberPayload);

    const boolPayload = new Uint8Array(8);
    const boolView = new DataView(boolPayload.buffer);
    boolView.setUint16(0, 0, true);
    boolView.setUint16(2, 1, true);
    boolView.setUint16(4, 0, true);
    boolPayload[6] = 1;
    boolPayload[7] = 0;
    const boolRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOOLERR, boolPayload);

    const formulaNumBytes = new Uint8Array(8);
    new DataView(formulaNumBytes.buffer).setFloat64(0, 11, true);
    const formulaTokens = new Uint8Array([0x1e, 0x05, 0x00, 0x1e, 0x06, 0x00, 0x03]);
    const formulaPayload = new Uint8Array(22 + formulaTokens.length);
    const formulaView = new DataView(formulaPayload.buffer);
    formulaView.setUint16(0, 0, true);
    formulaView.setUint16(2, 2, true);
    formulaView.setUint16(4, 0, true);
    formulaPayload.set(formulaNumBytes, 6);
    formulaView.setUint16(14, 0x0001, true); // alwaysCalc
    formulaView.setUint32(16, 0, true);
    formulaView.setUint16(20, formulaTokens.length, true);
    formulaPayload.set(formulaTokens, 22);
    const formulaRecord = makeRecordBytes(BIFF_RECORD_TYPES.FORMULA, formulaPayload);
    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([globalsBytes, bofSheet, numberRecord, boolRecord, formulaRecord, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + datemode.length + 4; // payload start of BOUNDSHEET within stream
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    const xls = extractXlsWorkbook(parsed);

    expect(xls.dateSystem).toBe("1904");
    expect(xls.fonts).toEqual([]);
    expect(xls.numberFormats).toEqual([]);
    expect(xls.xfs).toEqual([]);
    expect(xls.sheets).toHaveLength(1);
    expect(xls.sheets[0]?.cells).toEqual([
      { row: 0, col: 0, xfIndex: 0, value: { type: "number", value: 42 } },
      { row: 0, col: 1, xfIndex: 0, value: { type: "boolean", value: true } },
      {
        row: 0,
        col: 2,
        xfIndex: 0,
        value: { type: "number", value: 11 },
        formula: { tokens: formulaTokens, alwaysCalc: true, calcOnLoad: false, isSharedFormula: false },
      },
    ]);
  });
});
