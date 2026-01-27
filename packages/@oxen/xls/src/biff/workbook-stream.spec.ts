/**
 * @file Workbook stream parser tests
 */

import { BIFF_RECORD_TYPES } from "./record-types";
import { parseWorkbookStream } from "./workbook-stream";
import { createXlsWarningCollector } from "../warnings";

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

function makeSstPayload(strings: readonly string[]): Uint8Array {
  // This helper only supports compressed ASCII strings for tests.
  const header = new Uint8Array([...u32le(strings.length), ...u32le(strings.length)]);
  const encoded = strings.map((s) => {
    const cch = s.length;
    const bytes = new Uint8Array(2 + 1 + cch);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, cch, true);
    bytes[2] = 0x00;
    bytes.set(Array.from(s).map((c) => c.charCodeAt(0)), 3);
    return bytes;
  });
  return concat([header, ...encoded]);
}

function makeSstPayloadWithUnicode(
  strings: readonly { readonly text: string; readonly highByte: boolean }[],
): Uint8Array {
  const header = new Uint8Array([...u32le(strings.length), ...u32le(strings.length)]);
  const encoded = strings.map(({ text, highByte }) => {
    const cch = text.length;
    const bytes = new Uint8Array(2 + 1 + (highByte ? cch * 2 : cch));
    const view = new DataView(bytes.buffer);
    view.setUint16(0, cch, true);
    bytes[2] = highByte ? 0x01 : 0x00;

    if (highByte) {
      for (let i = 0; i < cch; i++) {
        view.setUint16(3 + i * 2, text.charCodeAt(i), true);
      }
      return bytes;
    }

    for (let i = 0; i < cch; i++) {
      bytes[3 + i] = text.charCodeAt(i);
    }
    return bytes;
  });
  return concat([header, ...encoded]);
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function makeFontPayload(name: string): Uint8Array {
  const nameBytes = new Uint8Array([0x00, ...Array.from(name).map((c) => c.charCodeAt(0))]); // grbit + chars
  const out = new Uint8Array(15 + nameBytes.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, 200, true); // dyHeight
  view.setUint16(2, 0, true); // grbit
  view.setUint16(4, 0x0008, true); // icv
  view.setUint16(6, 0x0190, true); // bls
  view.setUint16(8, 0, true); // sss
  out[10] = 0; // uls
  out[11] = 0; // bFamily
  out[12] = 0; // bCharSet
  out[13] = 0; // reserved
  out[14] = name.length; // cch
  out.set(nameBytes, 15);
  return out;
}

function makeXfPayload(args: { readonly fontIndex: number; readonly formatIndex: number }): Uint8Array {
  const out = new Uint8Array(20);
  const view = new DataView(out.buffer);
  view.setUint16(0, args.fontIndex, true); // ifnt
  view.setUint16(2, args.formatIndex, true); // ifmt
  view.setUint16(4, 0x0001, true); // fLocked
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint32(12, 0, true);
  view.setUint32(16, 0, true);
  return out;
}

describe("xls/biff/workbook-stream", () => {
  it("parses globals and one worksheet with LABELSST", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

    // BOUNDSHEET payload (lbPlyPos patched later)
    const sheetName = "Sheet1";
    const nameBytes = new Uint8Array([0x00, ...Array.from(sheetName).map((c) => c.charCodeAt(0))]);
    const boundsheetPayload = new Uint8Array(7 + nameBytes.length);
    const boundsheetView = new DataView(boundsheetPayload.buffer);
    boundsheetView.setUint32(0, 0, true); // lbPlyPos placeholder
    boundsheetView.setUint16(4, 0x0000, true); // hsState=visible, dt=worksheet
    boundsheetPayload[6] = sheetName.length;
    boundsheetPayload.set(nameBytes, 7);
    const boundsheetRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, boundsheetPayload);

    const sstRecord = makeRecordBytes(BIFF_RECORD_TYPES.SST, makeSstPayload(["Hello"]));
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const globalsBytes = concat([bofGlobals, boundsheetRecord, sstRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    // Patch lbPlyPos in the final stream.
    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));
    const labelsstPayload = new Uint8Array(10);
    const labelsstView = new DataView(labelsstPayload.buffer);
    labelsstView.setUint16(0, 0, true); // row
    labelsstView.setUint16(2, 0, true); // col
    labelsstView.setUint16(4, 0, true); // ixfe
    labelsstView.setUint32(6, 0, true); // isst
    const labelsstRecord = makeRecordBytes(BIFF_RECORD_TYPES.LABELSST, labelsstPayload);
    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([globalsBytes, bofSheet, labelsstRecord, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4; // payload start of BOUNDSHEET within stream
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.globals.dateSystem).toBe("1900");
    expect(parsed.globals.boundsheets).toHaveLength(1);
    expect(parsed.globals.boundsheets[0]?.sheetName).toBe("Sheet1");
    expect(parsed.globals.sharedStrings?.strings).toEqual(["Hello"]);
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0]?.cells).toEqual([{ kind: "string", row: 0, col: 0, xfIndex: 0, value: "Hello" }]);
  });

  it("skips non-worksheet BOUNDSHEET entries (chart and vbModule)", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

    const mkBoundsheetRecord = (sheetName: string, hiddenState: number, sheetType: number): Uint8Array => {
      const nameBytes = new Uint8Array([0x00, ...Array.from(sheetName).map((c) => c.charCodeAt(0))]);
      const payload = new Uint8Array(7 + nameBytes.length);
      const view = new DataView(payload.buffer);
      view.setUint32(0, 0, true); // lbPlyPos placeholder
      const grbit = (hiddenState & 0x03) | ((sheetType & 0xff) << 8);
      view.setUint16(4, grbit, true);
      payload[6] = sheetName.length;
      payload.set(nameBytes, 7);
      return makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, payload);
    };

    // One real worksheet, plus two that should be ignored by parseWorkbookStream.
    const boundsheetSheet = mkBoundsheetRecord("Sheet1", 0x00, 0x00);
    const boundsheetChart = mkBoundsheetRecord("Chart1", 0x00, 0x02);
    const boundsheetVb = mkBoundsheetRecord("Module1", 0x00, 0x06);
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());
    const globalsBytes = concat([bofGlobals, boundsheetSheet, boundsheetChart, boundsheetVb, eofGlobals]);

    const sheetStartOffset = globalsBytes.length;
    const sheetBytes = concat([
      makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
      makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array()),
    ]);

    const stream = concat([globalsBytes, sheetBytes]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetSheetOffset = bofGlobals.length + 4;
    const boundsheetChartOffset = boundsheetSheetOffset + boundsheetSheet.length;
    const boundsheetVbOffset = boundsheetChartOffset + boundsheetChart.length;

    streamView.setUint32(boundsheetSheetOffset, sheetStartOffset, true);
    // The chart/vb boundsheets might point anywhere; parseWorkbookStream should ignore them.
    streamView.setUint32(boundsheetChartOffset, 0, true);
    streamView.setUint32(boundsheetVbOffset, 0, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.globals.boundsheets.map((b) => b.sheetName)).toEqual(["Sheet1", "Chart1", "Module1"]);
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0]?.boundsheet.sheetName).toBe("Sheet1");
  });

  it("parses FONT records even when they use the legacy record id (0x0031)", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const fontLegacy = makeRecordBytes(0x0031, makeFontPayload("Legacy"));
    const fontNormal = makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("Normal"));
    const xf = makeRecordBytes(BIFF_RECORD_TYPES.XF, makeXfPayload({ fontIndex: 1, formatIndex: 0 }));

    const globalsBytes = concat([bofGlobals, fontLegacy, fontNormal, xf, eofGlobals]);
    const parsed = parseWorkbookStream(globalsBytes, { mode: "strict" });

    expect(parsed.globals.fonts.map((f) => f.name)).toEqual(["Legacy", "Normal"]);
    expect(parsed.globals.xfs[0]?.fontIndex).toBe(1);
  });

  it("parses multiple sheets and preserves hidden state from BOUNDSHEET", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

    const mkBoundsheetRecord = (sheetName: string, hiddenState: number, sheetType: number): Uint8Array => {
      const nameBytes = new Uint8Array([0x00, ...Array.from(sheetName).map((c) => c.charCodeAt(0))]);
      const payload = new Uint8Array(7 + nameBytes.length);
      const view = new DataView(payload.buffer);
      view.setUint32(0, 0, true); // lbPlyPos placeholder
      const grbit = (hiddenState & 0x03) | ((sheetType & 0xff) << 8);
      view.setUint16(4, grbit, true);
      payload[6] = sheetName.length;
      payload.set(nameBytes, 7);
      return makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, payload);
    };

    const boundsheet1 = mkBoundsheetRecord("Visible", 0x00, 0x00);
    const boundsheet2 = mkBoundsheetRecord("Hidden", 0x02, 0x00); // veryHidden
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());
    const globalsBytes = concat([bofGlobals, boundsheet1, boundsheet2, eofGlobals]);

    const sheet1StartOffset = globalsBytes.length;
    const sheet1Bytes = concat([
      makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
      makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array()),
    ]);
    const sheet2StartOffset = sheet1StartOffset + sheet1Bytes.length;
    const sheet2Bytes = concat([
      makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
      makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array()),
    ]);

    const stream = concat([globalsBytes, sheet1Bytes, sheet2Bytes]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheet1AbsoluteOffset = bofGlobals.length + 4;
    const boundsheet2AbsoluteOffset = boundsheet1AbsoluteOffset + boundsheet1.length;
    streamView.setUint32(boundsheet1AbsoluteOffset, sheet1StartOffset, true);
    streamView.setUint32(boundsheet2AbsoluteOffset, sheet2StartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.sheets.map((s) => ({ name: s.boundsheet.sheetName, state: s.boundsheet.hiddenState }))).toEqual([
      { name: "Visible", state: "visible" },
      { name: "Hidden", state: "veryHidden" },
    ]);
  });

  it("parses many worksheets (100+) and preserves the BOUNDSHEET order", () => {
    const sheetCount = 120;
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

    const mkBoundsheetRecord = (sheetName: string): Uint8Array => {
      const nameBytes = new Uint8Array([0x00, ...Array.from(sheetName).map((c) => c.charCodeAt(0))]);
      const payload = new Uint8Array(7 + nameBytes.length);
      const view = new DataView(payload.buffer);
      view.setUint32(0, 0, true); // lbPlyPos placeholder
      view.setUint16(4, 0x0000, true); // hsState=visible, dt=worksheet
      payload[6] = sheetName.length;
      payload.set(nameBytes, 7);
      return makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, payload);
    };

    const boundsheets: Uint8Array[] = [];
    for (let i = 0; i < sheetCount; i++) {
      boundsheets.push(mkBoundsheetRecord(`S${i + 1}`));
    }
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());
    const globalsBytes = concat([bofGlobals, ...boundsheets, eofGlobals]);

    const sheetBytesList: Uint8Array[] = [];
    const startOffsets: number[] = [];
    for (let i = 0, currentOffset = globalsBytes.length; i < sheetCount; i++) {
      startOffsets.push(currentOffset);
      const sheetBytes = concat([
        makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
        makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array()),
      ]);
      sheetBytesList.push(sheetBytes);
      currentOffset += sheetBytes.length;
    }

    const stream = concat([globalsBytes, ...sheetBytesList]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);

    for (let i = 0, boundsheetOffset = bofGlobals.length + 4; i < sheetCount; i++) {
      streamView.setUint32(boundsheetOffset, startOffsets[i] ?? 0, true);
      boundsheetOffset += boundsheets[i]?.length ?? 0;
    }

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.sheets).toHaveLength(sheetCount);
    expect(parsed.sheets[0]?.boundsheet.sheetName).toBe("S1");
    expect(parsed.sheets[sheetCount - 1]?.boundsheet.sheetName).toBe(`S${sheetCount}`);
  });

  it("throws when a worksheet substream is missing EOF (BOF/EOF mismatch)", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

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
    const globalsBytes = concat([bofGlobals, boundsheetRecord, eofGlobals]);

    const sheetStartOffset = globalsBytes.length;
    const sheetBytes = concat([
      makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
      // no EOF here
    ]);

    const stream = concat([globalsBytes, sheetBytes]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4;
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    expect(() => parseWorkbookStream(stream, { mode: "strict" })).toThrow(/Unterminated BIFF substream/);
  });

  it("handles Simple Save padding bytes after the last substream EOF", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

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
    const globalsBytes = concat([bofGlobals, boundsheetRecord, eofGlobals]);

    const sheetStartOffset = globalsBytes.length;
    const sheetBytes = concat([
      makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
      makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array()),
    ]);

    const streamCore = concat([globalsBytes, sheetBytes]);
    const padded = new Uint8Array(streamCore.length + 4096);
    padded.set(streamCore, 0);
    padded.set([0xaa, 0xbb, 0xcc, 0xdd], streamCore.length); // non-zero padding

    const paddedView = new DataView(padded.buffer);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4; // payload start of BOUNDSHEET within stream
    paddedView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(padded, { mode: "strict" });
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0]?.boundsheet.sheetName).toBe("Sheet1");
  });

  it("allows worksheets without a DIMENSIONS record", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

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

    const globalsBytes = concat([bofGlobals, boundsheetRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));
    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([globalsBytes, bofSheet, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4; // payload start of BOUNDSHEET within stream
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0]?.dimensions).toBeUndefined();
    expect(parsed.sheets[0]?.cells).toEqual([]);
  });

  it("parses LABELSST cells with empty/last/japanese/long strings from SST", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));

    // BOUNDSHEET payload (lbPlyPos patched later)
    const sheetName = "Sheet1";
    const nameBytes = new Uint8Array([0x00, ...Array.from(sheetName).map((c) => c.charCodeAt(0))]);
    const boundsheetPayload = new Uint8Array(7 + nameBytes.length);
    const boundsheetView = new DataView(boundsheetPayload.buffer);
    boundsheetView.setUint32(0, 0, true); // lbPlyPos placeholder
    boundsheetView.setUint16(4, 0x0000, true); // hsState=visible, dt=worksheet
    boundsheetPayload[6] = sheetName.length;
    boundsheetPayload.set(nameBytes, 7);
    const boundsheetRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, boundsheetPayload);

    const long = "A".repeat(300);
    const sstRecord = makeRecordBytes(
      BIFF_RECORD_TYPES.SST,
      makeSstPayloadWithUnicode([
        { text: "", highByte: false },
        { text: "日本語", highByte: true },
        { text: long, highByte: false },
        { text: "LAST", highByte: false },
      ]),
    );
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const globalsBytes = concat([bofGlobals, boundsheetRecord, sstRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));
    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const cells: Uint8Array[] = [];
    const addLabelSst = (row: number, col: number, sstIndex: number): void => {
      const labelsstPayload = new Uint8Array(10);
      const labelsstView = new DataView(labelsstPayload.buffer);
      labelsstView.setUint16(0, row, true);
      labelsstView.setUint16(2, col, true);
      labelsstView.setUint16(4, 0, true);
      labelsstView.setUint32(6, sstIndex, true);
      cells.push(makeRecordBytes(BIFF_RECORD_TYPES.LABELSST, labelsstPayload));
    };

    addLabelSst(0, 0, 0); // empty string
    addLabelSst(0, 1, 1); // japanese
    addLabelSst(0, 2, 2); // long
    addLabelSst(0, 3, 3); // last entry

    const stream = concat([globalsBytes, bofSheet, ...cells, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4; // payload start of BOUNDSHEET within stream
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.sheets[0]?.cells).toEqual([
      { kind: "string", row: 0, col: 0, xfIndex: 0, value: "" },
      { kind: "string", row: 0, col: 1, xfIndex: 0, value: "日本語" },
      { kind: "string", row: 0, col: 2, xfIndex: 0, value: long },
      { kind: "string", row: 0, col: 3, xfIndex: 0, value: "LAST" },
    ]);
  });

  it("parses BOOLERR cells (boolean and error)", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
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
    const globalsBytes = concat([bofGlobals, boundsheetRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));

    const boolPayload = new Uint8Array(8);
    const boolView = new DataView(boolPayload.buffer);
    boolView.setUint16(0, 0, true);
    boolView.setUint16(2, 0, true);
    boolView.setUint16(4, 0, true);
    boolPayload[6] = 1;
    boolPayload[7] = 0;
    const boolRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOOLERR, boolPayload);

    const errPayload = new Uint8Array(8);
    const errView = new DataView(errPayload.buffer);
    errView.setUint16(0, 0, true);
    errView.setUint16(2, 1, true);
    errView.setUint16(4, 0, true);
    errPayload[6] = 0x07;
    errPayload[7] = 1;
    const errRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOOLERR, errPayload);

    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([globalsBytes, bofSheet, boolRecord, errRecord, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4;
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.sheets[0]?.cells).toEqual([
      { kind: "boolean", row: 0, col: 0, xfIndex: 0, value: true },
      { kind: "error", row: 0, col: 1, xfIndex: 0, value: "#DIV/0!" },
    ]);
  });

  it("parses FORMULA cells (numeric and string results)", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
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
    const globalsBytes = concat([bofGlobals, boundsheetRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));

    // Numeric formula: cached value 11, tokens for "=5+6" (ptgInt 5, ptgInt 6, ptgAdd)
    const numBytes = new Uint8Array(8);
    new DataView(numBytes.buffer).setFloat64(0, 11, true);
    const tokens = new Uint8Array([0x1e, 0x05, 0x00, 0x1e, 0x06, 0x00, 0x03]);
    const formulaPayload = new Uint8Array(22 + tokens.length);
    const formulaView = new DataView(formulaPayload.buffer);
    formulaView.setUint16(0, 0, true);
    formulaView.setUint16(2, 0, true);
    formulaView.setUint16(4, 0, true);
    formulaPayload.set(numBytes, 6);
    formulaView.setUint16(14, 0, true);
    formulaView.setUint32(16, 0, true);
    formulaView.setUint16(20, tokens.length, true);
    formulaPayload.set(tokens, 22);
    const formulaRecord = makeRecordBytes(BIFF_RECORD_TYPES.FORMULA, formulaPayload);

    // String formula marker + STRING record following
    const strNumBytes = new Uint8Array([0x00, 0, 0, 0, 0, 0, 0xff, 0xff]);
    const strFormulaPayload = new Uint8Array(22);
    const strFormulaView = new DataView(strFormulaPayload.buffer);
    strFormulaView.setUint16(0, 0, true);
    strFormulaView.setUint16(2, 1, true);
    strFormulaView.setUint16(4, 0, true);
    strFormulaPayload.set(strNumBytes, 6);
    strFormulaView.setUint16(14, 0, true);
    strFormulaView.setUint32(16, 0, true);
    strFormulaView.setUint16(20, 0, true);
    const strFormulaRecord = makeRecordBytes(BIFF_RECORD_TYPES.FORMULA, strFormulaPayload);
    const stringRecord = makeRecordBytes(BIFF_RECORD_TYPES.STRING, new Uint8Array([0x02, 0x00, 0x00, 0x48, 0x69])); // "Hi"

    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([globalsBytes, bofSheet, formulaRecord, strFormulaRecord, stringRecord, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4;
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const parsed = parseWorkbookStream(stream, { mode: "strict" });
    expect(parsed.sheets[0]?.cells).toMatchObject([
      { kind: "formula", row: 0, col: 0, xfIndex: 0, resultKind: "number", value: 11 },
      { kind: "formula", row: 0, col: 1, xfIndex: 0, resultKind: "string", value: "Hi" },
    ]);
  });

  it("tolerates missing STRING records after FORMULA string results", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
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
    const globalsBytes = concat([bofGlobals, boundsheetRecord, eofGlobals]);
    const sheetStartOffset = globalsBytes.length;

    const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));

    const strNumBytes = new Uint8Array([0x00, 0, 0, 0, 0, 0, 0xff, 0xff]);
    const strFormulaPayload = new Uint8Array(22);
    const strFormulaView = new DataView(strFormulaPayload.buffer);
    strFormulaView.setUint16(0, 0, true);
    strFormulaView.setUint16(2, 1, true);
    strFormulaView.setUint16(4, 0, true);
    strFormulaPayload.set(strNumBytes, 6);
    strFormulaView.setUint16(14, 0, true);
    strFormulaView.setUint32(16, 0, true);
    strFormulaView.setUint16(20, 0, true);
    const strFormulaRecord = makeRecordBytes(BIFF_RECORD_TYPES.FORMULA, strFormulaPayload);

    const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([globalsBytes, bofSheet, strFormulaRecord, eofSheet]);
    const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
    const boundsheetAbsoluteOffset = bofGlobals.length + 4;
    streamView.setUint32(boundsheetAbsoluteOffset, sheetStartOffset, true);

    const collector = createXlsWarningCollector();
    const parsed = parseWorkbookStream(stream, { mode: "lenient", warn: collector.warn });
    expect(parsed.sheets[0]?.cells).toMatchObject([{ kind: "formula", row: 0, col: 1, xfIndex: 0, resultKind: "string", value: "" }]);
    expect(collector.warnings.map((w) => w.code)).toContain("FORMULA_CACHED_STRING_MISSING_STRING_RECORD");
  });

  it("inserts a placeholder at ifnt=04h in the FONT table", () => {
    const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
    const fonts = concat([
      makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("F0")),
      makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("F1")),
      makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("F2")),
      makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("F3")),
      makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("F5")),
    ]);
    const xf = makeRecordBytes(BIFF_RECORD_TYPES.XF, makeXfPayload({ fontIndex: 5, formatIndex: 0 }));
    const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

    const stream = concat([bofGlobals, fonts, xf, eofGlobals]);
    const parsed = parseWorkbookStream(stream, { mode: "strict" });

    expect(parsed.globals.fonts).toHaveLength(6);
    expect(parsed.globals.fonts[4]?.name).toBe("F0");
    expect(parsed.globals.fonts[5]?.name).toBe("F5");
    expect(parsed.globals.xfs[0]?.fontIndex).toBe(5);
  });
});
