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

function readSubstreamRecords(bytes: Uint8Array, startOffset: number): readonly BiffRecord[] {
  // eslint-disable-next-line no-restricted-syntax
  let offset = startOffset;
  // eslint-disable-next-line no-restricted-syntax
  let bofDepth = 0;
  const records: BiffRecord[] = [];

  while (offset < bytes.length) {
    const record = readRecord(bytes, offset);
    records.push(record);
    offset += 4 + record.length;

    if (record.type === BIFF_RECORD_TYPES.BOF) {
      bofDepth += 1;
    } else if (record.type === BIFF_RECORD_TYPES.EOF) {
      bofDepth -= 1;
      if (bofDepth === 0) {
        return records;
      }
    }
  }

  throw new Error(`Unterminated BIFF substream starting at offset ${startOffset}`);
}

function parseWorkbookGlobals(records: readonly BiffRecord[]): WorkbookGlobals {
  const bofRecord = records[0];
  if (!bofRecord || bofRecord.type !== BIFF_RECORD_TYPES.BOF) {
    throw new Error("Workbook stream must start with BOF");
  }
  const bof = parseBofRecord(bofRecord.data);
  if (bof.substreamType !== "workbookGlobals") {
    throw new Error(`Expected workbookGlobals BOF, got: ${bof.substreamType}`);
  }

  const boundsheets: BoundsheetRecord[] = [];
  const fontsRaw: FontRecord[] = [];
  const formats: FormatRecord[] = [];
  const xfs: XfRecord[] = [];
  const styles: StyleRecord[] = [];

  let palette: PaletteRecord | undefined;
  let dateSystem: DatemodeRecord["dateSystem"] = "1900";
  let sharedStrings: SstRecord | undefined;

  // Skip the first BOF and last EOF.
  // eslint-disable-next-line no-restricted-syntax
  for (let i = 1; i < records.length - 1; i++) {
    const record = records[i];
    if (!record) continue;

    switch (record.type) {
      case BIFF_RECORD_TYPES.BOUNDSHEET: {
        boundsheets.push(parseBoundsheetRecord(record.data));
        break;
      }
      case BIFF_RECORD_TYPES.DATEMODE: {
        dateSystem = parseDatemodeRecord(record.data).dateSystem;
        break;
      }
      case BIFF_RECORD_TYPES.PALETTE: {
        palette = parsePaletteRecord(record.data);
        break;
      }
      case BIFF_RECORD_TYPES.FONT: {
        fontsRaw.push(parseFontRecord(record.data));
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
        styles.push(parseStyleRecord(record.data));
        break;
      }
      case BIFF_RECORD_TYPES.SST: {
        const continues: Uint8Array[] = [];
        // eslint-disable-next-line no-restricted-syntax
        let j = i + 1;
        while (j < records.length - 1) {
          const next = records[j];
          if (!next || next.type !== BIFF_RECORD_TYPES.CONTINUE) break;
          continues.push(next.data);
          j += 1;
        }
        sharedStrings = parseSstRecord(record.data, continues);
        i = j - 1;
        break;
      }
      default:
        break;
    }
  }

  const fonts: FontRecord[] = (() => {
    if (fontsRaw.length <= 4) {
      return fontsRaw;
    }
    const placeholder = fontsRaw[0];
    if (!placeholder) {
      throw new Error("FONT table is missing required default font record (index 0)");
    }
    return [...fontsRaw.slice(0, 4), placeholder, ...fontsRaw.slice(4)];
  })();

  return { bof, dateSystem, boundsheets, sharedStrings, palette, fonts, formats, xfs, styles };
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

export function parseWorkbookStream(bytes: Uint8Array): WorkbookStreamParseResult {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseWorkbookStream: bytes must be a Uint8Array");
  }

  const globalRecords = readSubstreamRecords(bytes, 0);
  const globals = parseWorkbookGlobals(globalRecords);

  const sheets: ParsedWorksheetSubstream[] = [];
  const sharedStrings = globals.sharedStrings?.strings;

  for (const boundsheet of globals.boundsheets) {
    if (boundsheet.sheetType !== "worksheet") {
      continue;
    }

    const sheetRecords = readSubstreamRecords(bytes, boundsheet.streamPosition);
    const sheetBofRecord = sheetRecords[0];
    if (!sheetBofRecord || sheetBofRecord.type !== BIFF_RECORD_TYPES.BOF) {
      throw new Error(`Sheet substream must start with BOF at offset ${boundsheet.streamPosition}`);
    }
    const sheetBof = parseBofRecord(sheetBofRecord.data);
    if (sheetBof.substreamType !== "worksheet") {
      throw new Error(`Expected worksheet BOF, got: ${sheetBof.substreamType}`);
    }

    const rows: RowRecord[] = [];
    const columns: ColinfoRecord[] = [];
    const mergeCells: MergeCellRef[] = [];
    const cells: ParsedCell[] = [];

    let dimensions: DimensionsRecord | undefined;
    let defaultColumnWidth: DefcolwidthRecord | undefined;
    let defaultRowHeight: DefaultrowheightRecord | undefined;

    let pendingFormulaString: { readonly formula: FormulaRecord } | undefined;

    // eslint-disable-next-line no-restricted-syntax
    for (let i = 1; i < sheetRecords.length - 1; i++) {
      const record = sheetRecords[i];
      if (!record) continue;

      if (pendingFormulaString && record.type !== BIFF_RECORD_TYPES.STRING) {
        throw new Error("Expected STRING record after FORMULA (string result)");
      }

      switch (record.type) {
        case BIFF_RECORD_TYPES.DIMENSIONS: {
          dimensions = parseDimensionsRecord(record.data);
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
          const parsed = parseMergeCellsRecord(record.data);
          mergeCells.push(...parsed.refs);
          break;
        }
        case BIFF_RECORD_TYPES.DEFCOLWIDTH: {
          defaultColumnWidth = parseDefcolwidthRecord(record.data);
          break;
        }
        case BIFF_RECORD_TYPES.DEFAULTROWHEIGHT: {
          defaultRowHeight = parseDefaultrowheightRecord(record.data);
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
          const parsed = parseMulrkRecord(record.data);
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
          const parsed = parseMulblankRecord(record.data);
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
          const parsed = parseFormulaRecord(record.data);
          if (parsed.cached.type === "string") {
            pendingFormulaString = { formula: parsed };
            break;
          }
          cells.push(toParsedCellFromFormulaRecord(parsed));
          break;
        }
        case BIFF_RECORD_TYPES.STRING: {
          if (!pendingFormulaString) {
            throw new Error("STRING record encountered without preceding FORMULA string result");
          }
          const parsed: StringRecord = parseStringRecord(record.data);
          cells.push(toParsedCellFromFormulaRecord(pendingFormulaString.formula, parsed.text));
          pendingFormulaString = undefined;
          break;
        }
        case BIFF_RECORD_TYPES.LABELSST: {
          if (!sharedStrings) {
            throw new Error("LABELSST encountered but SST was not parsed");
          }
          const parsed = parseLabelSstRecord(record.data);
          const value = sharedStrings[parsed.sstIndex];
          if (value === undefined) {
            throw new Error(`Invalid SST index: ${parsed.sstIndex}`);
          }
          cells.push({ kind: "string", row: parsed.row, col: parsed.col, xfIndex: parsed.xfIndex, value });
          break;
        }
        default:
          break;
      }
    }

    if (pendingFormulaString) {
      throw new Error("FORMULA cached string ended without a following STRING record");
    }

    sheets.push({
      boundsheet,
      bof: sheetBof,
      dimensions,
      rows,
      columns,
      mergeCells,
      defaultColumnWidth,
      defaultRowHeight,
      cells,
    });
  }

  return { globals, sheets };
}
