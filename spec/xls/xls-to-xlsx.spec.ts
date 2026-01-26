/**
 * @file XLS-to-XLSX end-to-end conversion tests
 */

import { parseXls } from "../../src/xls";
import { CFB_SIGNATURE, ENDOFCHAIN, FATSECT, FREESECT, NOSTREAM } from "../../src/cfb/constants";
import { BIFF_RECORD_TYPES } from "../../src/xls/biff/record-types";
import JSZip from "jszip";
import { exportXlsx } from "../../src/xlsx/exporter";
import { parseXlsxWorkbook } from "../../src/xlsx/parser";

function u16le(view: DataView, offset: number, v: number): void {
  view.setUint16(offset, v, true);
}

function u32le(view: DataView, offset: number, v: number): void {
  view.setUint32(offset, v >>> 0, true);
}

function u64le(view: DataView, offset: number, v: bigint): void {
  view.setBigUint64(offset, v, true);
}

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
  const header = new Uint8Array(8);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, strings.length, true);
  headerView.setUint32(4, strings.length, true);

  const encoded = strings.map((s) => {
    const bytes = new Uint8Array(2 + 1 + s.length);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, s.length, true);
    bytes[2] = 0x00; // compressed
    bytes.set(Array.from(s).map((c) => c.charCodeAt(0)), 3);
    return bytes;
  });

  return concat([header, ...encoded]);
}

function makeFontPayload(name: string): Uint8Array {
  const nameBytes = new Uint8Array([0x00, ...Array.from(name).map((c) => c.charCodeAt(0))]); // grbit + chars
  const out = new Uint8Array(15 + nameBytes.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, 200, true); // dyHeight=10pt
  view.setUint16(2, 0x0002, true); // grbit: italic
  view.setUint16(4, 0x0008, true); // icv: black (0x08)
  view.setUint16(6, 700, true); // bls: bold-ish (used as "bold" mapping)
  view.setUint16(8, 0, true); // sss
  out[10] = 1; // uls: single underline
  out[11] = 2; // bFamily
  out[12] = 0; // bCharSet
  out[13] = 0; // reserved
  out[14] = name.length; // cch (number of characters)
  out.set(nameBytes, 15);
  return out;
}

function makeFormatPayload(formatIndex: number, formatCode: string): Uint8Array {
  const bytes = new Uint8Array(Array.from(formatCode).map((c) => c.charCodeAt(0)));
  const out = new Uint8Array(5 + bytes.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, formatIndex, true);
  view.setUint16(2, formatCode.length, true);
  out[4] = 0x00; // grbit: compressed
  out.set(bytes, 5);
  return out;
}

function makeXfPayload(args: { readonly fontIndex: number; readonly formatIndex: number }): Uint8Array {
  const out = new Uint8Array(20);
  const view = new DataView(out.buffer);
  view.setUint16(0, args.fontIndex, true); // ifnt
  view.setUint16(2, args.formatIndex, true); // ifmt
  view.setUint16(4, 0x0001, true); // fLocked=1
  view.setUint16(6, 0x001a, true); // horizontal=2 (center), wrap=1, vertical=1
  view.setUint16(8, 0xfc01, true); // indent=1 + apply flags
  view.setUint16(10, 0x3210, true); // border: left=0, right=1, top=2, bottom=3
  view.setUint32(12, 0, true); // borderColorsAndDiag
  const fillRaw = (0x01 << 26) | (0x09 << 7) | 0x0a; // solid, icvBack=9, icvFore=10
  view.setUint32(16, fillRaw, true);
  return out;
}

function writeDirectoryEntry(args: {
  readonly buf: Uint8Array;
  readonly entryIndex: number;
  readonly name: string;
  readonly type: number;
  readonly leftSiblingId: number;
  readonly rightSiblingId: number;
  readonly childId: number;
  readonly startingSector: number;
  readonly streamSize: bigint;
}): void {
  const base = args.entryIndex * 128;
  const view = new DataView(args.buf.buffer, args.buf.byteOffset, args.buf.byteLength);
  for (let i = 0; i < args.name.length; i++) {
    view.setUint16(base + i * 2, args.name.charCodeAt(i), true);
  }
  view.setUint16(base + args.name.length * 2, 0, true);
  u16le(view, base + 64, (args.name.length + 1) * 2);
  view.setUint8(base + 66, args.type);
  view.setUint8(base + 67, 0x01);
  u32le(view, base + 68, args.leftSiblingId);
  u32le(view, base + 72, args.rightSiblingId);
  u32le(view, base + 76, args.childId);
  u32le(view, base + 116, args.startingSector);
  u64le(view, base + 120, args.streamSize);
}

function buildMinimalCfbWithWorkbookStream(workbookBytes: Uint8Array): Uint8Array {
  const sectorSize = 512;
  const headerSize = 512;

  const streamSectors = Math.ceil(workbookBytes.length / sectorSize);
  const directorySectors = 1;
  const fatSectors = 1;

  const totalSectors = directorySectors + streamSectors + fatSectors;
  const fileBytes = new Uint8Array(headerSize + totalSectors * sectorSize);
  const headerView = new DataView(fileBytes.buffer);

  fileBytes.set(CFB_SIGNATURE, 0);
  u16le(headerView, 26, 0x0003);
  u16le(headerView, 28, 0xfffe);
  u16le(headerView, 30, 0x0009);
  u16le(headerView, 32, 0x0006);
  u32le(headerView, 44, fatSectors);
  u32le(headerView, 48, 0); // first directory sector
  u32le(headerView, 56, 0x1000);
  u32le(headerView, 60, ENDOFCHAIN);
  u32le(headerView, 64, 0);
  u32le(headerView, 68, ENDOFCHAIN);
  u32le(headerView, 72, 0);

  const fatSectorNumber = totalSectors - 1;
  u32le(headerView, 76, fatSectorNumber);
  for (let i = 1; i < 109; i++) {
    u32le(headerView, 76 + i * 4, FREESECT);
  }

  const directoryOffset = headerSize + 0 * sectorSize;
  const directory = new Uint8Array(fileBytes.buffer, directoryOffset, sectorSize);
  directory.fill(0);
  writeDirectoryEntry({
    buf: directory,
    entryIndex: 0,
    name: "Root Entry",
    type: 0x05,
    leftSiblingId: NOSTREAM,
    rightSiblingId: NOSTREAM,
    childId: 1,
    startingSector: ENDOFCHAIN,
    streamSize: 0n,
  });
  writeDirectoryEntry({
    buf: directory,
    entryIndex: 1,
    name: "Workbook",
    type: 0x02,
    leftSiblingId: NOSTREAM,
    rightSiblingId: NOSTREAM,
    childId: NOSTREAM,
    startingSector: 1,
    streamSize: BigInt(workbookBytes.length),
  });

  for (let i = 0; i < streamSectors; i++) {
    const sectorNumber = 1 + i;
    const offset = headerSize + sectorNumber * sectorSize;
    const slice = workbookBytes.subarray(i * sectorSize, (i + 1) * sectorSize);
    fileBytes.set(slice, offset);
  }

  const fatOffset = headerSize + fatSectorNumber * sectorSize;
  const fat = new Uint8Array(fileBytes.buffer, fatOffset, sectorSize);
  fat.fill(0xff);
  const fatView = new DataView(fat.buffer, fat.byteOffset, fat.byteLength);

  u32le(fatView, 0 * 4, ENDOFCHAIN); // directory
  for (let s = 0; s < streamSectors; s++) {
    const sectorNumber = 1 + s;
    const next = s === streamSectors - 1 ? ENDOFCHAIN : sectorNumber + 1;
    u32le(fatView, sectorNumber * 4, next);
  }
  u32le(fatView, fatSectorNumber * 4, FATSECT);

  return fileBytes;
}

function buildWorkbookStreamBytes(): Uint8Array {
  const bofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0005));
  const datemode = makeRecordBytes(BIFF_RECORD_TYPES.DATEMODE, new Uint8Array([0x01, 0x00]));

  const palettePayload = new Uint8Array(2 + 2 * 4);
  const paletteView = new DataView(palettePayload.buffer);
  paletteView.setUint16(0, 2, true);
  palettePayload.set([0x01, 0x02, 0x03, 0x00], 2);
  palettePayload.set([0xff, 0x00, 0x10, 0x00], 6);
  const paletteRecord = makeRecordBytes(BIFF_RECORD_TYPES.PALETTE, palettePayload);

  const fontRecord = makeRecordBytes(BIFF_RECORD_TYPES.FONT, makeFontPayload("Arial"));
  const formatRecord = makeRecordBytes(BIFF_RECORD_TYPES.FORMAT, makeFormatPayload(164, "0.00"));
  const xfStyleRecord = makeRecordBytes(BIFF_RECORD_TYPES.XF, makeStyleXfPayload({ fontIndex: 0, formatIndex: 0 }));
  const xfCellRecord = makeRecordBytes(BIFF_RECORD_TYPES.XF, makeXfPayload({ fontIndex: 0, formatIndex: 164 }));

  const stylePayload = new Uint8Array(4);
  const styleView = new DataView(stylePayload.buffer);
  styleView.setUint16(0, 0x8000 | 0x0000, true); // built-in + styleXfIndex=0
  stylePayload[2] = 0x00; // Normal
  stylePayload[3] = 0x00;
  const styleRecord = makeRecordBytes(BIFF_RECORD_TYPES.STYLE, stylePayload);

  const sheet1Name = "Sheet1";
  const sheet1NameBytes = new Uint8Array([0x00, ...Array.from(sheet1Name).map((c) => c.charCodeAt(0))]);
  const boundsheet1Payload = new Uint8Array(7 + sheet1NameBytes.length);
  const boundsheet1View = new DataView(boundsheet1Payload.buffer);
  boundsheet1View.setUint32(0, 0, true); // lbPlyPos placeholder
  boundsheet1View.setUint16(4, 0x0000, true); // hsState=visible, dt=worksheet
  boundsheet1Payload[6] = sheet1Name.length;
  boundsheet1Payload.set(sheet1NameBytes, 7);
  const boundsheet1Record = makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, boundsheet1Payload);

  const sheet2Name = "Hidden";
  const sheet2NameBytes = new Uint8Array([0x00, ...Array.from(sheet2Name).map((c) => c.charCodeAt(0))]);
  const boundsheet2Payload = new Uint8Array(7 + sheet2NameBytes.length);
  const boundsheet2View = new DataView(boundsheet2Payload.buffer);
  boundsheet2View.setUint32(0, 0, true); // lbPlyPos placeholder
  boundsheet2View.setUint16(4, 0x0001, true); // hsState=hidden, dt=worksheet
  boundsheet2Payload[6] = sheet2Name.length;
  boundsheet2Payload.set(sheet2NameBytes, 7);
  const boundsheet2Record = makeRecordBytes(BIFF_RECORD_TYPES.BOUNDSHEET, boundsheet2Payload);

  const sstRecord = makeRecordBytes(BIFF_RECORD_TYPES.SST, makeSstPayload(["Hello"]));
  const eofGlobals = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

  const globalsBytes = concat([
    bofGlobals,
    datemode,
    paletteRecord,
    fontRecord,
    formatRecord,
    xfStyleRecord,
    xfCellRecord,
    styleRecord,
    boundsheet1Record,
    boundsheet2Record,
    sstRecord,
    eofGlobals,
  ]);
  const sheet1StartOffset = globalsBytes.length;

  const bofSheet = makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010));

  const defcolwidthRecord = makeRecordBytes(BIFF_RECORD_TYPES.DEFCOLWIDTH, new Uint8Array([0x0a, 0x00])); // 10 chars
  const defaultrowheightPayload = new Uint8Array(4);
  const defaultrowheightView = new DataView(defaultrowheightPayload.buffer);
  defaultrowheightView.setUint16(0, 0x0000, true); // grbit
  defaultrowheightView.setUint16(2, 400, true); // 20pt
  const defaultrowheightRecord = makeRecordBytes(BIFF_RECORD_TYPES.DEFAULTROWHEIGHT, defaultrowheightPayload);

  const colinfoPayload = new Uint8Array(12);
  const colinfoView = new DataView(colinfoPayload.buffer);
  colinfoView.setUint16(0, 0, true); // colFirst=A
  colinfoView.setUint16(2, 0, true); // colLast=A
  colinfoView.setUint16(4, 512, true); // width256 => 2 chars
  colinfoView.setUint16(6, 1, true); // xfIndex (cell XF)
  colinfoView.setUint16(8, 0, true); // grbit
  colinfoView.setUint16(10, 0, true); // reserved
  const colinfoRecord = makeRecordBytes(BIFF_RECORD_TYPES.COLINFO, colinfoPayload);

  const rowPayload = new Uint8Array(16);
  const rowView = new DataView(rowPayload.buffer);
  rowView.setUint16(0, 0, true); // row 0
  rowView.setUint16(2, 0, true); // colMic
  rowView.setUint16(4, 3, true); // colMac
  rowView.setUint16(6, 480, true); // miyRw => 24pt (non-standard height)
  rowView.setUint16(12, 0x0080, true); // grbit (hasDefaultFormat)
  rowView.setUint16(14, 1, true); // ixfeRaw (cell XF)
  const rowRecord = makeRecordBytes(BIFF_RECORD_TYPES.ROW, rowPayload);

  const dimensionsPayload = new Uint8Array(14);
  const dimensionsView = new DataView(dimensionsPayload.buffer);
  dimensionsView.setUint32(0, 0, true); // firstRow
  dimensionsView.setUint32(4, 2, true); // lastRowExclusive
  dimensionsView.setUint16(8, 0, true); // firstCol
  dimensionsView.setUint16(10, 3, true); // lastColExclusive
  dimensionsView.setUint16(12, 0, true); // reserved
  const dimensionsRecord = makeRecordBytes(BIFF_RECORD_TYPES.DIMENSIONS, dimensionsPayload);

  const numberPayload = new Uint8Array(14);
  const numberView = new DataView(numberPayload.buffer);
  numberView.setUint16(0, 0, true); // row A1
  numberView.setUint16(2, 0, true); // col
  numberView.setUint16(4, 1, true); // xfIndex (cell XF)
  numberView.setFloat64(6, 123.5, true);
  const numberRecord = makeRecordBytes(BIFF_RECORD_TYPES.NUMBER, numberPayload);

  const boolPayload = new Uint8Array(8);
  const boolView = new DataView(boolPayload.buffer);
  boolView.setUint16(0, 1, true); // row A2
  boolView.setUint16(2, 0, true); // col
  boolView.setUint16(4, 1, true); // xfIndex (cell XF)
  boolPayload[6] = 1;
  boolPayload[7] = 0;
  const boolRecord = makeRecordBytes(BIFF_RECORD_TYPES.BOOLERR, boolPayload);

  const formulaNumBytes = new Uint8Array(8);
  new DataView(formulaNumBytes.buffer).setFloat64(0, 11, true);
  const formulaTokens = new Uint8Array([0x1e, 0x05, 0x00, 0x1e, 0x06, 0x00, 0x03]);
  const formulaPayload = new Uint8Array(22 + formulaTokens.length);
  const formulaView = new DataView(formulaPayload.buffer);
  formulaView.setUint16(0, 0, true); // row C1 (0-based)
  formulaView.setUint16(2, 2, true); // col
  formulaView.setUint16(4, 1, true); // xfIndex (cell XF)
  formulaPayload.set(formulaNumBytes, 6);
  formulaView.setUint16(14, 0, true);
  formulaView.setUint32(16, 0, true);
  formulaView.setUint16(20, formulaTokens.length, true);
  formulaPayload.set(formulaTokens, 22);
  const formulaRecord = makeRecordBytes(BIFF_RECORD_TYPES.FORMULA, formulaPayload);

  const labelsstPayload = new Uint8Array(10);
  const labelsstView = new DataView(labelsstPayload.buffer);
  labelsstView.setUint16(0, 1, true); // row B2 (0-based)
  labelsstView.setUint16(2, 1, true); // col
  labelsstView.setUint16(4, 1, true); // xfIndex (cell XF)
  labelsstView.setUint32(6, 0, true); // SST index
  const labelsstRecord = makeRecordBytes(BIFF_RECORD_TYPES.LABELSST, labelsstPayload);

  const mergeCellsPayload = new Uint8Array(2 + 8);
  const mergeCellsView = new DataView(mergeCellsPayload.buffer);
  mergeCellsView.setUint16(0, 1, true); // count
  mergeCellsView.setUint16(2, 0, true); // firstRow
  mergeCellsView.setUint16(4, 0, true); // lastRow
  mergeCellsView.setUint16(6, 0, true); // firstCol
  mergeCellsView.setUint16(8, 1, true); // lastCol (B)
  const mergeCellsRecord = makeRecordBytes(BIFF_RECORD_TYPES.MERGECELLS, mergeCellsPayload);

  const eofSheet = makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array());

  const sheet1Bytes = concat([
    bofSheet,
    defcolwidthRecord,
    defaultrowheightRecord,
    colinfoRecord,
    dimensionsRecord,
    rowRecord,
    numberRecord,
    boolRecord,
    formulaRecord,
    labelsstRecord,
    mergeCellsRecord,
    eofSheet,
  ]);
  const sheet2StartOffset = sheet1StartOffset + sheet1Bytes.length;
  const sheet2Bytes = concat([
    makeRecordBytes(BIFF_RECORD_TYPES.BOF, makeBofPayload(0x0010)),
    makeRecordBytes(BIFF_RECORD_TYPES.DIMENSIONS, dimensionsPayload),
    makeRecordBytes(BIFF_RECORD_TYPES.EOF, new Uint8Array()),
  ]);

  const streamCore = concat([globalsBytes, sheet1Bytes, sheet2Bytes]);
  const padded = new Uint8Array(4096);
  padded.set(streamCore, 0);

  // Patch lbPlyPos in the padded stream.
  const paddedView = new DataView(padded.buffer);
  const boundsheet1Start = bofGlobals.length
    + datemode.length
    + paletteRecord.length
    + fontRecord.length
    + formatRecord.length
    + xfStyleRecord.length
    + xfCellRecord.length
    + styleRecord.length;
  const boundsheet2Start = boundsheet1Start + boundsheet1Record.length;
  paddedView.setUint32(boundsheet1Start + 4, sheet1StartOffset, true);
  paddedView.setUint32(boundsheet2Start + 4, sheet2StartOffset, true);

  return padded;
}

function makeStyleXfPayload(args: { readonly fontIndex: number; readonly formatIndex: number }): Uint8Array {
  const bytes = makeXfPayload(args);
  const view = new DataView(bytes.buffer);
  view.setUint16(4, 0x0005, true); // fLocked=1 + fStyle=1
  return bytes;
}

describe("XLS → XLSX (end-to-end)", () => {
  it("parses an .xls CFB container and returns XlsxWorkbook", () => {
    const workbookStream = buildWorkbookStreamBytes();
    const xlsBytes = buildMinimalCfbWithWorkbookStream(workbookStream);
    const wb = parseXls(xlsBytes);

    expect(wb.dateSystem).toBe("1904");
    expect(wb.sheets).toHaveLength(2);
    expect(wb.sheets[0]?.dateSystem).toBe("1904");
    expect(wb.sheets[1]?.dateSystem).toBe("1904");
    expect(wb.sharedStrings).toEqual(["Hello"]);

    expect(wb.sheets[0]?.sheetFormatPr).toEqual({ defaultRowHeight: 20, defaultColWidth: 10, zeroHeight: false });
    expect(wb.sheets[0]?.columns?.[0]).toMatchObject({ min: 1, max: 1, width: 2 });
    expect(wb.sheets[0]?.mergeCells?.[0]).toEqual({
      start: { row: 1, col: 1, rowAbsolute: false, colAbsolute: false },
      end: { row: 1, col: 2, rowAbsolute: false, colAbsolute: false },
    });
    expect(wb.sheets[1]?.state).toBe("hidden");

    const rows = wb.sheets[0]?.rows ?? [];
    const row1 = rows.find((r) => r.rowNumber === 1);
    const row2 = rows.find((r) => r.rowNumber === 2);
    expect(row1?.height).toBe(24);
    expect(row1?.cells[0]?.address).toEqual({ row: 1, col: 1, rowAbsolute: false, colAbsolute: false });
    expect(row1?.cells[0]?.value).toEqual({ type: "number", value: 123.5 });
    expect(row1?.cells[0]?.styleId).toBe(0);
    expect(row1?.cells[1]?.address).toEqual({ row: 1, col: 3, rowAbsolute: false, colAbsolute: false });
    expect(row1?.cells[1]?.value).toEqual({ type: "number", value: 11 });
    expect(row1?.cells[1]?.formula).toEqual({ expression: "5+6", type: "normal" });
    expect(row1?.cells[1]?.styleId).toBe(0);
    expect(row2?.cells[0]?.address).toEqual({ row: 2, col: 1, rowAbsolute: false, colAbsolute: false });
    expect(row2?.cells[0]?.value).toEqual({ type: "boolean", value: true });
    expect(row2?.cells[0]?.styleId).toBe(0);
    expect(row2?.cells[1]?.address).toEqual({ row: 2, col: 2, rowAbsolute: false, colAbsolute: false });
    expect(row2?.cells[1]?.value).toEqual({ type: "string", value: "Hello" });
    expect(row2?.cells[1]?.styleId).toBe(0);

    expect(wb.styles.indexedColors).toHaveLength(64);
    expect(wb.styles.indexedColors?.[8]).toBe("FF010203");
    expect(wb.styles.indexedColors?.[9]).toBe("FFFF0010");

    expect(wb.styles.numberFormats).toEqual([{ numFmtId: 164, formatCode: "0.00" }]);
    expect(wb.styles.fonts[0]).toMatchObject({ name: "Arial", size: 10, italic: true, underline: "single", family: 2 });
    expect(wb.styles.fills.length).toBeGreaterThanOrEqual(3);
    expect(wb.styles.borders.length).toBeGreaterThanOrEqual(2);
    expect(wb.styles.cellXfs[0]).toMatchObject({
      numFmtId: 164,
      fontId: 0,
      applyNumberFormat: true,
      applyFont: true,
      applyFill: true,
      applyBorder: true,
      applyAlignment: true,
      applyProtection: true,
    });
  });

  it("round-trips: parseXls → exportXlsx → parseXlsxWorkbook", async () => {
    const workbookStream = buildWorkbookStreamBytes();
    const xlsBytes = buildMinimalCfbWithWorkbookStream(workbookStream);
    const wb = parseXls(xlsBytes);

    const xlsxBytes = await exportXlsx(wb);
    const zip = await JSZip.loadAsync(xlsxBytes);

    const parsed = await parseXlsxWorkbook(async (path) => {
      const file = zip.file(path);
      return file ? await file.async("text") : undefined;
    });

    expect(parsed.sheets).toHaveLength(2);
    expect(parsed.sheets[1]?.state).toBe("hidden");
    expect(parsed.sharedStrings).toEqual(["Hello"]);

    const sheet1 = parsed.sheets[0];
    expect(sheet1?.mergeCells?.[0]?.start).toEqual({ row: 1, col: 1, rowAbsolute: false, colAbsolute: false });
    expect(sheet1?.mergeCells?.[0]?.end).toEqual({ row: 1, col: 2, rowAbsolute: false, colAbsolute: false });
    expect(sheet1?.columns?.[0]).toMatchObject({ min: 1, max: 1, width: 2 });

    const row1 = sheet1?.rows.find((r) => r.rowNumber === 1);
    const a1 = row1?.cells.find((c) => c.address.col === 1);
    expect(a1?.value).toEqual({ type: "number", value: 123.5 });
    const c1 = row1?.cells.find((c) => c.address.col === 3);
    expect(c1?.formula).toEqual({ expression: "5+6", type: "normal" });

    const row2 = sheet1?.rows.find((r) => r.rowNumber === 2);
    const a2 = row2?.cells.find((c) => c.address.col === 1);
    const b2 = row2?.cells.find((c) => c.address.col === 2);
    expect(a2?.value).toEqual({ type: "boolean", value: true });
    expect(b2?.value).toEqual({ type: "string", value: "Hello" });

    expect(parsed.styles.indexedColors?.[8]).toBe("FF010203");
    expect(parsed.styles.numberFormats).toEqual([{ numFmtId: 164, formatCode: "0.00" }]);
    expect(parsed.styles.fonts.some((f) => f.name === "Arial")).toBe(true);
    expect(parsed.styles.fills.length).toBeGreaterThanOrEqual(3);
    expect(parsed.styles.borders.length).toBeGreaterThanOrEqual(2);
    expect(parsed.styles.cellXfs[0]).toMatchObject({
      applyFill: true,
      applyBorder: true,
      applyAlignment: true,
      alignment: { horizontal: "center", vertical: "center", wrapText: true, indent: 1 },
    });

    const sheet1Xml = await zip.file("xl/worksheets/sheet1.xml")!.async("text");
    expect(sheet1Xml).toContain('<sheetFormatPr defaultRowHeight="20" defaultColWidth="10" zeroHeight="0"/>');
  });
});
