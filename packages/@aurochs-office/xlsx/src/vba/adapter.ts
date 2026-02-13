/**
 * @file Excel VBA Host Adapter
 *
 * Implements the HostApi interface for Excel (XLSX) documents.
 * Bridges the VBA runtime with the XLSX domain model.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

import type { HostApi, HostObject, VbaRuntimeValue } from "@aurochs-office/vba";
import { VbaRuntimeError, createHostObject } from "@aurochs-office/vba";
import type { XlsxWorkbook, XlsxWorksheet } from "../domain/workbook";
import type { Cell, CellValue } from "../domain/cell/types";
import type { CellAddress } from "../domain/cell/address";
import { parseRange, formatCellRef } from "../domain/cell/address";
import { colIdx, rowIdx } from "../domain/types";
import type {
  ExcelApplicationObject,
  ExcelWorkbookObject,
  ExcelWorksheetObject,
  ExcelRangeObject,
  ExcelWorksheetsObject,
} from "./types";
import {
  isApplicationObject,
  isWorkbookObject,
  isWorksheetObject,
  isRangeObject,
  isWorksheetsObject,
} from "./types";

// =============================================================================
// Host Object Factories
// =============================================================================

/**
 * Create an Application host object.
 */
function createApplicationObject(): ExcelApplicationObject {
  return createHostObject("Application", { _app: true as const }) as ExcelApplicationObject;
}

/**
 * Create a Workbook host object.
 */
function createWorkbookObject(workbookId: string): ExcelWorkbookObject {
  return createHostObject("Workbook", { _workbookId: workbookId }) as ExcelWorkbookObject;
}

/**
 * Create a Worksheet host object.
 */
function createWorksheetObject(workbookId: string, sheetIndex: number): ExcelWorksheetObject {
  return createHostObject("Worksheet", {
    _workbookId: workbookId,
    _sheetIndex: sheetIndex,
  }) as ExcelWorksheetObject;
}

type RangeObjectParams = {
  readonly workbookId: string;
  readonly sheetIndex: number;
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
};

/**
 * Create a Range host object.
 */
function createRangeObject(params: RangeObjectParams): ExcelRangeObject {
  return createHostObject("Range", {
    _workbookId: params.workbookId,
    _sheetIndex: params.sheetIndex,
    _startRow: params.startRow,
    _startCol: params.startCol,
    _endRow: params.endRow,
    _endCol: params.endCol,
  }) as ExcelRangeObject;
}

/**
 * Create a Worksheets collection host object.
 */
function createWorksheetsObject(workbookId: string): ExcelWorksheetsObject {
  return createHostObject("Worksheets", { _workbookId: workbookId }) as ExcelWorksheetsObject;
}

// =============================================================================
// Value Conversion
// =============================================================================

/**
 * Convert CellValue to VbaRuntimeValue.
 */
function cellValueToVba(cellValue: CellValue): VbaRuntimeValue {
  switch (cellValue.type) {
    case "string":
      return cellValue.value;
    case "number":
      return cellValue.value;
    case "boolean":
      return cellValue.value;
    case "date":
      return cellValue.value;
    case "error":
      // VBA errors are handled differently, for now return as string
      return cellValue.value;
    case "empty":
      return undefined;
  }
}

/**
 * Convert VbaRuntimeValue to CellValue.
 */
function vbaToCellValue(value: VbaRuntimeValue): CellValue {
  if (value === undefined || value === null) {
    return { type: "empty" };
  }
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (typeof value === "number") {
    return { type: "number", value };
  }
  if (typeof value === "boolean") {
    return { type: "boolean", value };
  }
  if (value instanceof Date) {
    return { type: "date", value };
  }
  // For arrays and host objects, convert to string
  return { type: "string", value: String(value) };
}

// =============================================================================
// Cell Lookup Helpers
// =============================================================================

/**
 * Create a simple cell address (non-absolute).
 */
function simpleCellAddress(row: number, col: number): CellAddress {
  return {
    row: rowIdx(row),
    col: colIdx(col),
    rowAbsolute: false,
    colAbsolute: false,
  };
}

/**
 * Find a cell in a worksheet by row and column.
 */
function findCell(sheet: XlsxWorksheet, row: number, col: number): Cell | undefined {
  const sheetRow = sheet.rows.find((r) => r.rowNumber === row);
  if (!sheetRow) {
    return undefined;
  }
  return sheetRow.cells.find((c) => c.address.row === row && c.address.col === col);
}

/**
 * Get cell value from a worksheet.
 */
function getCellValue(sheet: XlsxWorksheet, row: number, col: number): VbaRuntimeValue {
  const cell = findCell(sheet, row, col);
  if (!cell) {
    return undefined; // Empty cell
  }
  return cellValueToVba(cell.value);
}

// =============================================================================
// Excel Host Adapter State
// =============================================================================

/**
 * State for the Excel host adapter.
 */
export type ExcelAdapterState = {
  /** The workbook being operated on */
  readonly workbook: XlsxWorkbook;
  /** Workbook ID (used for object references) */
  readonly workbookId: string;
  /** Current active sheet index */
  activeSheetIndex: number;
  /** Cell mutations (row -> col -> value) */
  readonly mutations: Map<number, Map<number, Map<number, CellValue>>>;
};

/**
 * Create initial adapter state.
 */
export function createExcelAdapterState(workbook: XlsxWorkbook, workbookId = "default"): ExcelAdapterState {
  return {
    workbook,
    workbookId,
    activeSheetIndex: 0,
    mutations: new Map(),
  };
}

// =============================================================================
// Excel Host Adapter Factory
// =============================================================================

/**
 * Create an Excel host adapter.
 *
 * @param state - Adapter state with workbook and mutations
 * @returns HostApi implementation for Excel
 *
 * @example
 * ```typescript
 * const workbook = await parseXlsxWorkbook(bytes);
 * const state = createExcelAdapterState(workbook);
 * const hostApi = createExcelHostAdapter(state);
 * const ctx = createVbaExecutionContext(hostApi);
 * ```
 */
export function createExcelHostAdapter(state: ExcelAdapterState): HostApi {
  const { workbookId } = state;

  // Application singleton
  const applicationObject = createApplicationObject();
  const thisWorkbookObject = createWorkbookObject(workbookId);

  return {
    getGlobalObject(name: string): HostObject | undefined {
      const lowerName = name.toLowerCase();

      switch (lowerName) {
        case "application":
          return applicationObject;
        case "thisworkbook":
        case "activeworkbook":
          return thisWorkbookObject;
        case "activesheet":
          return createWorksheetObject(workbookId, state.activeSheetIndex);
        case "worksheets":
        case "sheets":
          return createWorksheetsObject(workbookId);
        case "cells":
          // Global Cells refers to active sheet
          return createRangeObject({
            workbookId,
            sheetIndex: state.activeSheetIndex,
            startRow: 1,
            startCol: 1,
            endRow: 1048576, // Excel max rows
            endCol: 16384, // Excel max columns
          });
        case "range":
          // Range without arguments - not valid, but return active cell
          return createRangeObject({
            workbookId,
            sheetIndex: state.activeSheetIndex,
            startRow: 1,
            startCol: 1,
            endRow: 1,
            endCol: 1,
          });
        default:
          return undefined;
      }
    },

    getProperty(obj: HostObject, name: string): VbaRuntimeValue {
      const lowerName = name.toLowerCase();

      // Application properties
      if (isApplicationObject(obj)) {
        return getApplicationProperty(state, lowerName);
      }

      // Workbook properties
      if (isWorkbookObject(obj)) {
        return getWorkbookProperty(state, lowerName);
      }

      // Worksheet properties
      if (isWorksheetObject(obj)) {
        return getWorksheetProperty(state, obj, lowerName);
      }

      // Range properties
      if (isRangeObject(obj)) {
        return getRangeProperty(state, obj, lowerName);
      }

      // Worksheets collection properties
      if (isWorksheetsObject(obj)) {
        return getWorksheetsProperty(state, lowerName);
      }

      throw new VbaRuntimeError(`Unknown property: ${name}`, "objectRequired");
    },

    setProperty(obj: HostObject, name: string, value: VbaRuntimeValue): void {
      const lowerName = name.toLowerCase();

      // Range properties
      if (isRangeObject(obj)) {
        setRangeProperty({ state, obj, name: lowerName, value });
        return;
      }

      throw new VbaRuntimeError(`Cannot set property: ${name}`, "objectRequired");
    },

    callMethod(obj: HostObject, name: string, args: readonly VbaRuntimeValue[]): VbaRuntimeValue {
      const lowerName = name.toLowerCase();

      // Worksheet methods
      if (isWorksheetObject(obj)) {
        return callWorksheetMethod({ state, obj, name: lowerName, args });
      }

      // Range methods
      if (isRangeObject(obj)) {
        return callRangeMethod({ obj, name: lowerName, args });
      }

      // Worksheets collection methods
      if (isWorksheetsObject(obj)) {
        return callWorksheetsMethod(state, lowerName, args);
      }

      throw new VbaRuntimeError(`Unknown method: ${name}`, "invalidProcedureCall");
    },

    getIndexed(obj: HostObject, indices: readonly VbaRuntimeValue[]): VbaRuntimeValue {
      // Worksheets(index) or Worksheets("name")
      if (isWorksheetsObject(obj)) {
        return getWorksheetsItem(state, indices[0]);
      }

      // Range(index) - item within range
      if (isRangeObject(obj)) {
        return getRangeItem(state, obj, indices);
      }

      // Cells(row, col)
      // This is handled via Range object with full extent

      throw new VbaRuntimeError("Object does not support indexing", "typeMismatch");
    },

    setIndexed(_obj: HostObject, _indices: readonly VbaRuntimeValue[], _value: VbaRuntimeValue): void {
      // For now, setting indexed values is not implemented
      throw new VbaRuntimeError("Indexed assignment not implemented", "notImplemented");
    },
  };
}

// =============================================================================
// Property Getters
// =============================================================================

function getApplicationProperty(state: ExcelAdapterState, name: string): VbaRuntimeValue {
  switch (name) {
    case "version":
      return "16.0"; // Excel 2016+
    case "name":
      return "Microsoft Excel";
    case "activeworkbook":
      return createWorkbookObject(state.workbookId);
    case "activesheet":
      return createWorksheetObject(state.workbookId, state.activeSheetIndex);
    case "worksheets":
    case "sheets":
      return createWorksheetsObject(state.workbookId);
    default:
      throw new VbaRuntimeError(`Unknown Application property: ${name}`, "invalidProcedureCall");
  }
}

function getWorkbookProperty(state: ExcelAdapterState, name: string): VbaRuntimeValue {
  const { workbook, workbookId } = state;

  switch (name) {
    case "name":
      return "Workbook";
    case "path":
      return "";
    case "fullname":
      return "Workbook";
    case "worksheets":
    case "sheets":
      return createWorksheetsObject(workbookId);
    case "activesheet":
      return createWorksheetObject(workbookId, state.activeSheetIndex);
    case "sheetcount":
      return workbook.sheets.length;
    default:
      throw new VbaRuntimeError(`Unknown Workbook property: ${name}`, "invalidProcedureCall");
  }
}

function getWorksheetProperty(
  state: ExcelAdapterState,
  obj: ExcelWorksheetObject,
  name: string
): VbaRuntimeValue {
  const sheet = state.workbook.sheets[obj._sheetIndex];
  if (!sheet) {
    throw new VbaRuntimeError("Worksheet not found", "subscriptOutOfRange");
  }

  switch (name) {
    case "name":
      return sheet.name;
    case "index":
      return obj._sheetIndex + 1; // VBA is 1-based
    case "visible":
      return sheet.state === "visible";
    case "cells":
      return createRangeObject({
        workbookId: obj._workbookId,
        sheetIndex: obj._sheetIndex,
        startRow: 1,
        startCol: 1,
        endRow: 1048576,
        endCol: 16384,
      });
    case "rows":
      return createRangeObject({
        workbookId: obj._workbookId,
        sheetIndex: obj._sheetIndex,
        startRow: 1,
        startCol: 1,
        endRow: 1048576,
        endCol: 16384,
      });
    case "columns":
      return createRangeObject({
        workbookId: obj._workbookId,
        sheetIndex: obj._sheetIndex,
        startRow: 1,
        startCol: 1,
        endRow: 1048576,
        endCol: 16384,
      });
    case "usedrange":
      if (sheet.dimension) {
        return createRangeObject({
          workbookId: obj._workbookId,
          sheetIndex: obj._sheetIndex,
          startRow: sheet.dimension.start.row,
          startCol: sheet.dimension.start.col,
          endRow: sheet.dimension.end.row,
          endCol: sheet.dimension.end.col,
        });
      }
      // No used range - return A1
      return createRangeObject({
        workbookId: obj._workbookId,
        sheetIndex: obj._sheetIndex,
        startRow: 1,
        startCol: 1,
        endRow: 1,
        endCol: 1,
      });
    default:
      throw new VbaRuntimeError(`Unknown Worksheet property: ${name}`, "invalidProcedureCall");
  }
}

function getRangeProperty(
  state: ExcelAdapterState,
  obj: ExcelRangeObject,
  name: string
): VbaRuntimeValue {
  const sheet = state.workbook.sheets[obj._sheetIndex];
  if (!sheet) {
    throw new VbaRuntimeError("Worksheet not found", "subscriptOutOfRange");
  }

  switch (name) {
    case "value":
    case "value2":
      // For single cell, return the value
      if (obj._startRow === obj._endRow && obj._startCol === obj._endCol) {
        return getCellValue(sheet, obj._startRow, obj._startCol);
      }
      // For range, return 2D array
      return getRangeValues(sheet, obj);

    case "text":
      // For single cell, return formatted text
      if (obj._startRow === obj._endRow && obj._startCol === obj._endCol) {
        const val = getCellValue(sheet, obj._startRow, obj._startCol);
        return val === undefined ? "" : String(val);
      }
      throw new VbaRuntimeError("Text property not supported for ranges", "typeMismatch");

    case "formula":
    case "formular1c1":
      if (obj._startRow === obj._endRow && obj._startCol === obj._endCol) {
        const cell = findCell(sheet, obj._startRow, obj._startCol);
        return cell?.formula?.expression ?? "";
      }
      throw new VbaRuntimeError("Formula property not supported for ranges", "typeMismatch");

    case "row":
      return obj._startRow;
    case "column":
      return obj._startCol;
    case "rows":
      return createRangeObject({
        workbookId: obj._workbookId,
        sheetIndex: obj._sheetIndex,
        startRow: obj._startRow,
        startCol: obj._startCol,
        endRow: obj._endRow,
        endCol: obj._endCol,
      });
    case "columns":
      return createRangeObject({
        workbookId: obj._workbookId,
        sheetIndex: obj._sheetIndex,
        startRow: obj._startRow,
        startCol: obj._startCol,
        endRow: obj._endRow,
        endCol: obj._endCol,
      });
    case "count":
      return (obj._endRow - obj._startRow + 1) * (obj._endCol - obj._startCol + 1);
    case "address":
      return rangeToAddress(obj);
    case "worksheet":
      return createWorksheetObject(obj._workbookId, obj._sheetIndex);
    default:
      throw new VbaRuntimeError(`Unknown Range property: ${name}`, "invalidProcedureCall");
  }
}

function getWorksheetsProperty(state: ExcelAdapterState, name: string): VbaRuntimeValue {
  switch (name) {
    case "count":
      return state.workbook.sheets.length;
    default:
      throw new VbaRuntimeError(`Unknown Worksheets property: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Property Setters
// =============================================================================

type SetRangePropertyParams = {
  readonly state: ExcelAdapterState;
  readonly obj: ExcelRangeObject;
  readonly name: string;
  readonly value: VbaRuntimeValue;
};

function setRangeProperty(params: SetRangePropertyParams): void {
  const { state, obj, name, value } = params;
  switch (name) {
    case "value":
    case "value2":
      // Set value for single cell
      if (obj._startRow === obj._endRow && obj._startCol === obj._endCol) {
        setCellValue({ state, sheetIndex: obj._sheetIndex, row: obj._startRow, col: obj._startCol, value });
        return;
      }
      // For range, set all cells to the same value
      for (const row of rangeRows(obj._startRow, obj._endRow)) {
        for (const col of rangeCols(obj._startCol, obj._endCol)) {
          setCellValue({ state, sheetIndex: obj._sheetIndex, row, col, value });
        }
      }
      return;

    default:
      throw new VbaRuntimeError(`Cannot set Range property: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Method Callers
// =============================================================================

type CallWorksheetMethodParams = {
  readonly state: ExcelAdapterState;
  readonly obj: ExcelWorksheetObject;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callWorksheetMethod(params: CallWorksheetMethodParams): VbaRuntimeValue {
  const { state, obj, name, args } = params;
  switch (name) {
    case "range":
      return resolveRange(state, obj._sheetIndex, args);
    case "cells":
      return resolveCells(state, obj._sheetIndex, args);
    case "activate":
      state.activeSheetIndex = obj._sheetIndex;
      return undefined;
    case "select":
      state.activeSheetIndex = obj._sheetIndex;
      return undefined;
    default:
      throw new VbaRuntimeError(`Unknown Worksheet method: ${name}`, "invalidProcedureCall");
  }
}

type CallRangeMethodParams = {
  readonly obj: ExcelRangeObject;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callRangeMethod(params: CallRangeMethodParams): VbaRuntimeValue {
  const { obj, name, args } = params;
  switch (name) {
    case "offset":
      return offsetRange(obj, args);
    case "resize":
      return resizeRange(obj, args);
    case "select":
      // Selection is not implemented
      return undefined;
    case "copy":
    case "cut":
    case "paste":
    case "clear":
    case "clearcontents":
      // These methods modify state - not implemented yet
      throw new VbaRuntimeError(`Range.${name} not implemented`, "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Range method: ${name}`, "invalidProcedureCall");
  }
}

function callWorksheetsMethod(
  state: ExcelAdapterState,
  name: string,
  args: readonly VbaRuntimeValue[]
): VbaRuntimeValue {
  switch (name) {
    case "item":
      return getWorksheetsItem(state, args[0]);
    case "add":
      throw new VbaRuntimeError("Worksheets.Add not implemented", "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Worksheets method: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Argument Extraction Helpers
// =============================================================================

/**
 * Extract a numeric argument from a VbaRuntimeValue array.
 * Returns the floor of the value at the given index, or the fallback if not numeric.
 */
function extractNumericArg(args: readonly VbaRuntimeValue[], index: number, fallback: number): number {
  const arg = args[index];
  return typeof arg === "number" ? Math.floor(arg) : fallback;
}

// =============================================================================
// Indexed Access
// =============================================================================

function getWorksheetsItem(state: ExcelAdapterState, index: VbaRuntimeValue): ExcelWorksheetObject {
  const { workbook, workbookId } = state;

  // Index by number (1-based)
  if (typeof index === "number") {
    const sheetIndex = Math.floor(index) - 1;
    if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
      throw new VbaRuntimeError("Subscript out of range", "subscriptOutOfRange");
    }
    return createWorksheetObject(workbookId, sheetIndex);
  }

  // Index by name
  if (typeof index === "string") {
    const sheetIndex = workbook.sheets.findIndex(
      (s) => s.name.toLowerCase() === index.toLowerCase()
    );
    if (sheetIndex === -1) {
      throw new VbaRuntimeError(`Sheet not found: ${index}`, "subscriptOutOfRange");
    }
    return createWorksheetObject(workbookId, sheetIndex);
  }

  throw new VbaRuntimeError("Invalid worksheet index", "typeMismatch");
}

function getRangeItem(
  _state: ExcelAdapterState,
  obj: ExcelRangeObject,
  indices: readonly VbaRuntimeValue[]
): VbaRuntimeValue {
  // Cells(row) or Cells(row, col)
  if (indices.length >= 1) {
    const rowOffset = extractNumericArg(indices, 0, 1) - 1;
    const colOffset = extractNumericArg(indices, 1, 1) - 1;
    const row = obj._startRow + rowOffset;
    const col = obj._startCol + colOffset;

    // Return single cell range
    return createRangeObject({
      workbookId: obj._workbookId,
      sheetIndex: obj._sheetIndex,
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    });
  }

  throw new VbaRuntimeError("Invalid range index", "typeMismatch");
}

// =============================================================================
// Range Resolution Helpers
// =============================================================================

function resolveRange(
  state: ExcelAdapterState,
  sheetIndex: number,
  args: readonly VbaRuntimeValue[]
): ExcelRangeObject {
  if (args.length === 0) {
    throw new VbaRuntimeError("Range requires at least one argument", "invalidProcedureCall");
  }

  const ref = String(args[0]);

  // Parse range reference (e.g., "A1", "A1:B2")
  const range = parseRange(ref);
  return createRangeObject({
    workbookId: state.workbookId,
    sheetIndex,
    startRow: range.start.row,
    startCol: range.start.col,
    endRow: range.end.row,
    endCol: range.end.col,
  });
}

function resolveCells(
  state: ExcelAdapterState,
  sheetIndex: number,
  args: readonly VbaRuntimeValue[]
): ExcelRangeObject {
  if (args.length === 0) {
    throw new VbaRuntimeError("Cells requires at least one argument", "invalidProcedureCall");
  }

  const row = typeof args[0] === "number" ? Math.floor(args[0]) : 1;
  const col = args.length >= 2 && typeof args[1] === "number" ? Math.floor(args[1]) : 1;

  return createRangeObject({
    workbookId: state.workbookId,
    sheetIndex,
    startRow: row,
    startCol: col,
    endRow: row,
    endCol: col,
  });
}

function offsetRange(
  obj: ExcelRangeObject,
  args: readonly VbaRuntimeValue[]
): ExcelRangeObject {
  const rowOffset = args.length >= 1 && typeof args[0] === "number" ? Math.floor(args[0]) : 0;
  const colOffset = args.length >= 2 && typeof args[1] === "number" ? Math.floor(args[1]) : 0;

  return createRangeObject({
    workbookId: obj._workbookId,
    sheetIndex: obj._sheetIndex,
    startRow: obj._startRow + rowOffset,
    startCol: obj._startCol + colOffset,
    endRow: obj._endRow + rowOffset,
    endCol: obj._endCol + colOffset,
  });
}

function resizeRange(
  obj: ExcelRangeObject,
  args: readonly VbaRuntimeValue[]
): ExcelRangeObject {
  const currentRowSize = obj._endRow - obj._startRow + 1;
  const currentColSize = obj._endCol - obj._startCol + 1;
  const rowSize = extractNumericArg(args, 0, currentRowSize);
  const colSize = extractNumericArg(args, 1, currentColSize);

  return createRangeObject({
    workbookId: obj._workbookId,
    sheetIndex: obj._sheetIndex,
    startRow: obj._startRow,
    startCol: obj._startCol,
    endRow: obj._startRow + rowSize - 1,
    endCol: obj._startCol + colSize - 1,
  });
}

// =============================================================================
// Value Helpers
// =============================================================================

function getRangeValues(sheet: XlsxWorksheet, obj: ExcelRangeObject): VbaRuntimeValue[][] {
  const result: VbaRuntimeValue[][] = [];
  for (const row of rangeRows(obj._startRow, obj._endRow)) {
    const rowValues: VbaRuntimeValue[] = [];
    for (const col of rangeCols(obj._startCol, obj._endCol)) {
      rowValues.push(getCellValue(sheet, row, col));
    }
    result.push(rowValues);
  }
  return result;
}

type SetCellValueParams = {
  readonly state: ExcelAdapterState;
  readonly sheetIndex: number;
  readonly row: number;
  readonly col: number;
  readonly value: VbaRuntimeValue;
};

function setCellValue(params: SetCellValueParams): void {
  const { state, sheetIndex, row, col, value } = params;
  // Store mutation
  const sheetMutations = state.mutations.get(sheetIndex) ?? new Map();
  const rowMutations = sheetMutations.get(row) ?? new Map();
  rowMutations.set(col, vbaToCellValue(value));
  sheetMutations.set(row, rowMutations);
  state.mutations.set(sheetIndex, sheetMutations);
}

function rangeToAddress(obj: ExcelRangeObject): string {
  const startAddr = simpleCellAddress(obj._startRow, obj._startCol);
  const start = formatCellRef(startAddr);
  if (obj._startRow === obj._endRow && obj._startCol === obj._endCol) {
    return `$${start}`;
  }
  const endAddr = simpleCellAddress(obj._endRow, obj._endCol);
  const end = formatCellRef(endAddr);
  return `$${start}:$${end}`;
}

// =============================================================================
// Iteration Helpers
// =============================================================================

function* rangeRows(start: number, end: number): Generator<number> {
  for (const row of Array.from({ length: end - start + 1 }, (_, i) => start + i)) {
    yield row;
  }
}

function* rangeCols(start: number, end: number): Generator<number> {
  for (const col of Array.from({ length: end - start + 1 }, (_, i) => start + i)) {
    yield col;
  }
}
