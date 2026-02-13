/**
 * @file Excel VBA Host Object Types
 *
 * Type definitions for Excel object model used by the VBA host adapter.
 * These types bridge the VBA runtime with the XLSX domain model.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

import type { HostObject } from "@aurochs-office/vba";

// =============================================================================
// Excel Host Object Types
// =============================================================================

/**
 * Base type for all Excel host objects.
 */
type ExcelHostObjectBase<T extends string> = HostObject & {
  readonly hostType: T;
};

/**
 * Application object - top-level Excel application.
 */
export type ExcelApplicationObject = ExcelHostObjectBase<"Application"> & {
  readonly _app: true;
};

/**
 * Workbook object - represents an Excel workbook.
 */
export type ExcelWorkbookObject = ExcelHostObjectBase<"Workbook"> & {
  readonly _workbookId: string;
};

/**
 * Worksheet object - represents a worksheet in a workbook.
 */
export type ExcelWorksheetObject = ExcelHostObjectBase<"Worksheet"> & {
  readonly _workbookId: string;
  readonly _sheetIndex: number;
};

/**
 * Range object - represents a cell or range of cells.
 */
export type ExcelRangeObject = ExcelHostObjectBase<"Range"> & {
  readonly _workbookId: string;
  readonly _sheetIndex: number;
  readonly _startRow: number;
  readonly _startCol: number;
  readonly _endRow: number;
  readonly _endCol: number;
};

/**
 * Worksheets collection object.
 */
export type ExcelWorksheetsObject = ExcelHostObjectBase<"Worksheets"> & {
  readonly _workbookId: string;
};

/**
 * Union of all Excel host object types.
 */
export type ExcelHostObject =
  | ExcelApplicationObject
  | ExcelWorkbookObject
  | ExcelWorksheetObject
  | ExcelRangeObject
  | ExcelWorksheetsObject;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a host object is an Application object.
 */
export function isApplicationObject(obj: HostObject): obj is ExcelApplicationObject {
  return obj.hostType === "Application";
}

/**
 * Check if a host object is a Workbook object.
 */
export function isWorkbookObject(obj: HostObject): obj is ExcelWorkbookObject {
  return obj.hostType === "Workbook";
}

/**
 * Check if a host object is a Worksheet object.
 */
export function isWorksheetObject(obj: HostObject): obj is ExcelWorksheetObject {
  return obj.hostType === "Worksheet";
}

/**
 * Check if a host object is a Range object.
 */
export function isRangeObject(obj: HostObject): obj is ExcelRangeObject {
  return obj.hostType === "Range";
}

/**
 * Check if a host object is a Worksheets collection.
 */
export function isWorksheetsObject(obj: HostObject): obj is ExcelWorksheetsObject {
  return obj.hostType === "Worksheets";
}
