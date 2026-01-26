/**
 * @file Workbook stream parser (BIFF substreams)
 *
 * Parses the BIFF "Workbook" stream into:
 * - Workbook globals (fonts, formats, xfs, styles, SST, boundsheets)
 * - Worksheet substreams (by BOUNDSHEET streamPosition)
 */

import { BIFF_RECORD_TYPES } from "./record-types";
import { readRecord } from "./record-reader";
import type { BiffRecord } from "./types";
import type { ErrorValue } from "../../xlsx/domain/cell/types";
import type { XlsParseContext } from "../parse-context";
import { isStrict, warnOrThrow } from "../parse-context";
import {
  parseBlankRecord,
  parseBofRecord,
  parseBoolerrRecord,
  parseBoundsheetRecord,
  parseColinfoRecord,
  parseDatemodeRecord,
  parseDefcolwidthRecord,
  parseDefaultrowheightRecord,
  parseDimensionsRecord,
  parseFontRecord,
  parseFormulaRecord,
  parseFormatRecord,
  parseLabelSstRecord,
  parseMergeCellsRecord,
  parseMulblankRecord,
  parseMulrkRecord,
  parseNumberRecord,
  parsePaletteRecord,
  parseRkRecord,
  parseRowRecord,
  parseSstRecord,
  parseStringRecord,
  parseStyleRecord,
  parseXfRecord,
  type BlankRecord,
  type BoolerrRecord,
  type BoundsheetRecord,
  type ColinfoRecord,
  type DatemodeRecord,
  type DefcolwidthRecord,
  type DefaultrowheightRecord,
  type DimensionsRecord,
  type FontRecord,
  type FormulaRecord,
  type FormatRecord,
  type MergeCellRef,
  type NumberRecord,
  type PaletteRecord,
  type RowRecord,
  type RkRecord,
  type SstRecord,
  type StringRecord,
  type StyleRecord,
  type XfRecord,
} from "./records";

export type ParsedFormula = {
  readonly tokens: Uint8Array;
  readonly alwaysCalc: boolean;
  readonly calcOnLoad: boolean;
  readonly isSharedFormula: boolean;
};

export type ParsedCellValue = number | string | boolean | ErrorValue;

export type ParsedFormulaCell =
  | {
      readonly kind: "formula";
      readonly row: number;
      readonly col: number;
      readonly xfIndex: number;
      readonly resultKind: "number";
      readonly value: number;
      readonly formula: ParsedFormula;
    }
  | {
      readonly kind: "formula";
      readonly row: number;
      readonly col: number;
      readonly xfIndex: number;
      readonly resultKind: "empty";
      readonly formula: ParsedFormula;
    }
  | {
      readonly kind: "formula";
      readonly row: number;
      readonly col: number;
      readonly xfIndex: number;
      readonly resultKind: "boolean";
      readonly value: boolean;
      readonly formula: ParsedFormula;
    }
  | {
      readonly kind: "formula";
      readonly row: number;
      readonly col: number;
      readonly xfIndex: number;
      readonly resultKind: "error";
      readonly value: ErrorValue;
      readonly formula: ParsedFormula;
    }
  | {
      readonly kind: "formula";
      readonly row: number;
      readonly col: number;
      readonly xfIndex: number;
      readonly resultKind: "string";
      readonly value: string;
      readonly formula: ParsedFormula;
    };

export type ParsedCell =
  | { readonly kind: "number"; readonly row: number; readonly col: number; readonly xfIndex: number; readonly value: number }
  | { readonly kind: "string"; readonly row: number; readonly col: number; readonly xfIndex: number; readonly value: string }
  | { readonly kind: "boolean"; readonly row: number; readonly col: number; readonly xfIndex: number; readonly value: boolean }
  | { readonly kind: "error"; readonly row: number; readonly col: number; readonly xfIndex: number; readonly value: ErrorValue }
  | { readonly kind: "empty"; readonly row: number; readonly col: number; readonly xfIndex: number }
  | ParsedFormulaCell;

export type WorkbookGlobals = {
  readonly bof: ReturnType<typeof parseBofRecord>;
  /** Workbook date system (1900/1904) that affects date serial interpretation */
  readonly dateSystem: DatemodeRecord["dateSystem"];
  readonly boundsheets: readonly BoundsheetRecord[];
  readonly sharedStrings?: SstRecord;
  /** Custom indexed palette override (PALETTE record), when present */
  readonly palette?: PaletteRecord;
  readonly fonts: readonly FontRecord[];
  readonly formats: readonly FormatRecord[];
  readonly xfs: readonly XfRecord[];
  readonly styles: readonly StyleRecord[];
};

export type ParsedWorksheetSubstream = {
  readonly boundsheet: BoundsheetRecord;
  readonly bof: ReturnType<typeof parseBofRecord>;
  readonly dimensions?: DimensionsRecord;
  readonly rows: readonly RowRecord[];
  readonly columns: readonly ColinfoRecord[];
  readonly mergeCells: readonly MergeCellRef[];
  readonly defaultColumnWidth?: DefcolwidthRecord;
  readonly defaultRowHeight?: DefaultrowheightRecord;
  readonly cells: readonly ParsedCell[];
};

export type WorkbookStreamParseResult = {
  readonly globals: WorkbookGlobals;
  readonly sheets: readonly ParsedWorksheetSubstream[];
};

function tryReadRecordAtOffset(bytes: Uint8Array, offset: number, startOffset: number, ctx: XlsParseContext): BiffRecord | undefined {
  try {
    return readRecord(bytes, offset, { strict: isStrict(ctx) });
  } catch (err) {
    if (isStrict(ctx)) {
      throw err;
    }
    warnOrThrow(
      ctx,
      { code: "BIFF_SUBSTREAM_TRUNCATED", where: "readSubstreamRecords", message: "BIFF record stream truncated; stopping early.", meta: { startOffset } },
      err instanceof Error ? err : new Error(String(err)),
    );
    return undefined;
  }
}

function collectContinueRecordPayloads(records: readonly BiffRecord[], startIndex: number, endIndexExclusive: number): { readonly payloads: readonly Uint8Array[]; readonly stopIndex: number } {
  const payloads: Uint8Array[] = [];
  for (let i = startIndex; i < endIndexExclusive; i++) {
    const next = records[i];
    if (!next || next.type !== BIFF_RECORD_TYPES.CONTINUE) {
      return { payloads, stopIndex: i };
    }
    payloads.push(next.data);
  }
  return { payloads, stopIndex: endIndexExclusive };
}

function readSubstreamRecords(bytes: Uint8Array, startOffset: number, ctx: XlsParseContext): readonly BiffRecord[] {
  const records: BiffRecord[] = [];

  const cursor: { offset: number; bofDepth: number } = { offset: startOffset, bofDepth: 0 };
  for (; cursor.offset < bytes.length; ) {
    const record = tryReadRecordAtOffset(bytes, cursor.offset, startOffset, ctx);
    if (!record) {
      break;
    }
    records.push(record);
    cursor.offset += 4 + record.length;

    if (record.type === BIFF_RECORD_TYPES.BOF) {
      cursor.bofDepth += 1;
    } else if (record.type === BIFF_RECORD_TYPES.EOF) {
      cursor.bofDepth -= 1;
      if (cursor.bofDepth === 0) {
        return records;
      }
    }
  }

  if (isStrict(ctx)) {
    throw new Error(`Unterminated BIFF substream starting at offset ${startOffset}`);
  }

  if (cursor.bofDepth > 0) {
    try {
      throw new Error(`Unterminated BIFF substream starting at offset ${startOffset}`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "BIFF_SUBSTREAM_TRUNCATED",
          where: "readSubstreamRecords",
          message: "BIFF substream ended without matching EOF; appending EOF record.",
          meta: { startOffset },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
    records.push({ type: BIFF_RECORD_TYPES.EOF, length: 0, data: new Uint8Array(), offset: Math.min(cursor.offset, bytes.length) });
  }
  return records;
}

function normalizeFontTable(fontsRaw: readonly FontRecord[]): readonly FontRecord[] {
  if (fontsRaw.length <= 4) {
    return fontsRaw;
  }
  const placeholder = fontsRaw[0];
  if (!placeholder) {
    throw new Error("FONT table is missing required default font record (index 0)");
  }
  return [...fontsRaw.slice(0, 4), placeholder, ...fontsRaw.slice(4)];
}

function parseWorkbookGlobals(records: readonly BiffRecord[], ctx: XlsParseContext): WorkbookGlobals {
  const bofRecord = records[0];
  if (!bofRecord || bofRecord.type !== BIFF_RECORD_TYPES.BOF) {
    throw new Error("Workbook stream must start with BOF");
  }
  const bof = parseBofRecord(bofRecord.data, ctx);
  if (bof.substreamType !== "workbookGlobals") {
    throw new Error(`Expected workbookGlobals BOF, got: ${bof.substreamType}`);
  }

  const boundsheets: BoundsheetRecord[] = [];
  const fontsRaw: FontRecord[] = [];
  const formats: FormatRecord[] = [];
  const xfs: XfRecord[] = [];
  const styles: StyleRecord[] = [];

  const globals: { palette?: PaletteRecord; dateSystem: DatemodeRecord["dateSystem"]; sharedStrings?: SstRecord } = { dateSystem: "1900" };

  // Skip the first BOF and last EOF.
  for (let i = 1; i < records.length - 1; i++) {
    const record = records[i];
    if (!record) {
      continue;
    }

    switch (record.type) {
      case BIFF_RECORD_TYPES.BOUNDSHEET: {
        boundsheets.push(parseBoundsheetRecord(record.data, ctx));
        break;
      }
      case BIFF_RECORD_TYPES.DATEMODE: {
        globals.dateSystem = parseDatemodeRecord(record.data, ctx).dateSystem;
        break;
      }
      case BIFF_RECORD_TYPES.PALETTE: {
        globals.palette = parsePaletteRecord(record.data, ctx);
        break;
      }
      case BIFF_RECORD_TYPES.FONT: {
        fontsRaw.push(parseFontRecord(record.data, ctx));
        break;
      }
      case BIFF_RECORD_TYPES.FONT_LEGACY: {
        fontsRaw.push(parseFontRecord(record.data, ctx));
        break;
      }
      case BIFF_RECORD_TYPES.FORMAT: {
        formats.push(parseFormatRecord(record.data));
        break;
      }
      case BIFF_RECORD_TYPES.XF: {
        xfs.push(parseXfRecord(record.data));
        break;
      }
      case BIFF_RECORD_TYPES.STYLE: {
        styles.push(parseStyleRecord(record.data, ctx));
        break;
      }
      case BIFF_RECORD_TYPES.SST: {
        const { payloads, stopIndex } = collectContinueRecordPayloads(records, i + 1, records.length - 1);
        globals.sharedStrings = parseSstRecord(record.data, payloads, ctx);
        i = stopIndex - 1;
        break;
      }
      default:
        break;
    }
  }

  const fonts = normalizeFontTable(fontsRaw);

  return { bof, dateSystem: globals.dateSystem, boundsheets, sharedStrings: globals.sharedStrings, palette: globals.palette, fonts, formats, xfs, styles };
}

function toParsedCellFromNumberRecord(record: NumberRecord): ParsedCell {
  return { kind: "number", row: record.row, col: record.col, xfIndex: record.xfIndex, value: record.value };
}

function toParsedCellFromRkRecord(record: RkRecord): ParsedCell {
  return { kind: "number", row: record.row, col: record.col, xfIndex: record.xfIndex, value: record.value };
}

function toParsedCellFromBlankRecord(record: BlankRecord): ParsedCell {
  return { kind: "empty", row: record.row, col: record.col, xfIndex: record.xfIndex };
}

function toParsedCellFromBoolerrRecord(record: BoolerrRecord): ParsedCell {
  if (record.value.type === "boolean") {
    return { kind: "boolean", row: record.row, col: record.col, xfIndex: record.xfIndex, value: record.value.value };
  }
  return { kind: "error", row: record.row, col: record.col, xfIndex: record.xfIndex, value: record.value.value };
}

function toParsedFormulaFromFormulaRecord(record: FormulaRecord): ParsedFormula {
  return {
    tokens: record.tokens,
    alwaysCalc: record.flags.alwaysCalc,
    calcOnLoad: record.flags.calcOnLoad,
    isSharedFormula: record.flags.isSharedFormula,
  };
}

function toParsedCellFromFormulaRecord(record: FormulaRecord, stringValue?: string): ParsedFormulaCell {
  const formula = toParsedFormulaFromFormulaRecord(record);
  switch (record.cached.type) {
    case "number":
      return { kind: "formula", row: record.row, col: record.col, xfIndex: record.xfIndex, resultKind: "number", value: record.cached.value, formula };
    case "empty":
      return { kind: "formula", row: record.row, col: record.col, xfIndex: record.xfIndex, resultKind: "empty", formula };
    case "boolean":
      return { kind: "formula", row: record.row, col: record.col, xfIndex: record.xfIndex, resultKind: "boolean", value: record.cached.value, formula };
    case "error":
      return { kind: "formula", row: record.row, col: record.col, xfIndex: record.xfIndex, resultKind: "error", value: record.cached.value, formula };
    case "string": {
      if (stringValue === undefined) {
        throw new Error("FORMULA cached string requires a following STRING record");
      }
      return { kind: "formula", row: record.row, col: record.col, xfIndex: record.xfIndex, resultKind: "string", value: stringValue, formula };
    }
  }
}

/** Parse a workbook-stream BIFF record sequence into workbook globals + worksheet substreams. */
export function parseWorkbookStream(bytes: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): WorkbookStreamParseResult {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseWorkbookStream: bytes must be a Uint8Array");
  }

  const globalRecords = readSubstreamRecords(bytes, 0, ctx);
  const globals = parseWorkbookGlobals(globalRecords, ctx);

  const sheets: ParsedWorksheetSubstream[] = [];
  const sharedStrings = globals.sharedStrings?.strings;

  for (const boundsheet of globals.boundsheets) {
    if (boundsheet.sheetType !== "worksheet") {
      continue;
    }

    const sheetRecords = readSubstreamRecords(bytes, boundsheet.streamPosition, ctx);
    const sheetBofRecord = sheetRecords[0];
    if (!sheetBofRecord || sheetBofRecord.type !== BIFF_RECORD_TYPES.BOF) {
      throw new Error(`Sheet substream must start with BOF at offset ${boundsheet.streamPosition}`);
    }
    const sheetBof = parseBofRecord(sheetBofRecord.data, ctx);
    if (sheetBof.substreamType !== "worksheet") {
      continue;
    }

    const rows: RowRecord[] = [];
    const columns: ColinfoRecord[] = [];
    const mergeCells: MergeCellRef[] = [];
    const cells: ParsedCell[] = [];

    const sheetState: {
      dimensions?: DimensionsRecord;
      defaultColumnWidth?: DefcolwidthRecord;
      defaultRowHeight?: DefaultrowheightRecord;
      pendingFormulaString?: { readonly formula: FormulaRecord };
    } = {};

    for (let i = 1; i < sheetRecords.length - 1; i++) {
      const record = sheetRecords[i];
      if (!record) {
        continue;
      }

      if (sheetState.pendingFormulaString && record.type !== BIFF_RECORD_TYPES.STRING) {
        // In BIFF8, STRING should follow FORMULA immediately when cached type is string.
        // Some real-world files omit it; treat missing cached string as empty and continue.
        try {
          throw new Error("Expected STRING record after FORMULA (string result)");
        } catch (err) {
          warnOrThrow(
            ctx,
            {
              code: "FORMULA_CACHED_STRING_MISSING_STRING_RECORD",
              where: "WorksheetSubstream",
              message: "FORMULA cached string result missing following STRING record; using empty string.",
            },
            err instanceof Error ? err : new Error(String(err)),
          );
        }
        cells.push(toParsedCellFromFormulaRecord(sheetState.pendingFormulaString.formula, ""));
        sheetState.pendingFormulaString = undefined;
      }

      switch (record.type) {
        case BIFF_RECORD_TYPES.DIMENSIONS: {
          sheetState.dimensions = parseDimensionsRecord(record.data);
          break;
        }
        case BIFF_RECORD_TYPES.ROW: {
          rows.push(parseRowRecord(record.data));
          break;
        }
        case BIFF_RECORD_TYPES.COLINFO: {
          columns.push(parseColinfoRecord(record.data));
          break;
        }
        case BIFF_RECORD_TYPES.MERGECELLS: {
          const parsed = parseMergeCellsRecord(record.data, ctx);
          mergeCells.push(...parsed.refs);
          break;
        }
        case BIFF_RECORD_TYPES.DEFCOLWIDTH: {
          sheetState.defaultColumnWidth = parseDefcolwidthRecord(record.data);
          break;
        }
        case BIFF_RECORD_TYPES.DEFAULTROWHEIGHT: {
          sheetState.defaultRowHeight = parseDefaultrowheightRecord(record.data);
          break;
        }

        case BIFF_RECORD_TYPES.NUMBER: {
          cells.push(toParsedCellFromNumberRecord(parseNumberRecord(record.data)));
          break;
        }
        case BIFF_RECORD_TYPES.RK: {
          cells.push(toParsedCellFromRkRecord(parseRkRecord(record.data)));
          break;
        }
        case BIFF_RECORD_TYPES.MULRK: {
          const parsed = parseMulrkRecord(record.data, ctx);
          parsed.cells.forEach((cell, idx) => {
            cells.push({
              kind: "number",
              row: parsed.row,
              col: parsed.colFirst + idx,
              xfIndex: cell.xfIndex,
              value: cell.value,
            });
          });
          break;
        }
        case BIFF_RECORD_TYPES.BLANK: {
          cells.push(toParsedCellFromBlankRecord(parseBlankRecord(record.data)));
          break;
        }
        case BIFF_RECORD_TYPES.MULBLANK: {
          const parsed = parseMulblankRecord(record.data, ctx);
          parsed.xfIndexes.forEach((xfIndex, idx) => {
            cells.push({
              kind: "empty",
              row: parsed.row,
              col: parsed.colFirst + idx,
              xfIndex,
            });
          });
          break;
        }
        case BIFF_RECORD_TYPES.BOOLERR: {
          cells.push(toParsedCellFromBoolerrRecord(parseBoolerrRecord(record.data)));
          break;
        }
        case BIFF_RECORD_TYPES.FORMULA: {
          const parsed = parseFormulaRecord(record.data, ctx);
          if (parsed.cached.type === "string") {
            sheetState.pendingFormulaString = { formula: parsed };
            break;
          }
          cells.push(toParsedCellFromFormulaRecord(parsed));
          break;
        }
        case BIFF_RECORD_TYPES.STRING: {
          if (!sheetState.pendingFormulaString) {
            break;
          }
          const { payloads, stopIndex } = collectContinueRecordPayloads(sheetRecords, i + 1, sheetRecords.length - 1);
          const parsed: StringRecord = parseStringRecord(record.data, payloads, ctx);
          cells.push(toParsedCellFromFormulaRecord(sheetState.pendingFormulaString.formula, parsed.text));
          sheetState.pendingFormulaString = undefined;
          i = stopIndex - 1;
          break;
        }
        case BIFF_RECORD_TYPES.LABELSST: {
          const parsed = parseLabelSstRecord(record.data);
          const value = sharedStrings?.[parsed.sstIndex] ?? "";
          cells.push({ kind: "string", row: parsed.row, col: parsed.col, xfIndex: parsed.xfIndex, value });
          break;
        }
        default:
          break;
      }
    }

    if (sheetState.pendingFormulaString) {
      try {
        throw new Error("FORMULA cached string ended without a following STRING record");
      } catch (err) {
        warnOrThrow(
          ctx,
          {
            code: "FORMULA_CACHED_STRING_MISSING_STRING_RECORD",
            where: "WorksheetSubstream",
            message: "FORMULA cached string result ended without following STRING record; using empty string.",
          },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      cells.push(toParsedCellFromFormulaRecord(sheetState.pendingFormulaString.formula, ""));
    }

    sheets.push({
      boundsheet,
      bof: sheetBof,
      dimensions: sheetState.dimensions,
      rows,
      columns,
      mergeCells,
      defaultColumnWidth: sheetState.defaultColumnWidth,
      defaultRowHeight: sheetState.defaultRowHeight,
      cells,
    });
  }

  return { globals, sheets };
}
