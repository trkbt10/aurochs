/**
 * @file Sheet mutation operations
 *
 * Operations for adding, deleting, renaming, and reordering sheets.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";

function assertNonEmptyString(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer: ${value}`);
  }
}

function assertValidSheetIndex(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  label = "sheetIndex"
): void {
  if (!Number.isInteger(sheetIndex)) {
    throw new Error(`${label} must be an integer`);
  }
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    throw new Error(`${label} out of range: ${sheetIndex}`);
  }
}

function isNameUnique(
  workbook: XlsxWorkbook,
  name: string,
  excludeIndex?: number
): boolean {
  return workbook.sheets.every((sheet, idx) => idx === excludeIndex || sheet.name !== name);
}

function insertAt<T>(array: readonly T[], index: number, value: T): T[] {
  return [...array.slice(0, index), value, ...array.slice(index)];
}

function removeAt<T>(array: readonly T[], index: number): T[] {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

function moveElementInArray<T>(array: readonly T[], fromIndex: number, toIndex: number): T[] {
  const element = array[fromIndex];
  const withoutElement = removeAt(array, fromIndex);
  return insertAt(withoutElement, toIndex, element);
}

function cloneWorksheetForDuplicate(
  worksheet: XlsxWorksheet,
  name: string,
  sheetId: number
): XlsxWorksheet {
  const cloned = structuredClone(worksheet);
  return {
    ...cloned,
    name,
    sheetId,
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

function computeInsertIndex(workbook: XlsxWorkbook, afterIndex: number | undefined): number {
  if (afterIndex === undefined) {
    return workbook.sheets.length;
  }
  if (!Number.isInteger(afterIndex)) {
    throw new Error("afterIndex must be an integer");
  }
  if (afterIndex < -1 || afterIndex >= workbook.sheets.length) {
    throw new Error(`afterIndex out of range: ${afterIndex}`);
  }
  return afterIndex + 1;
}

/**
 * Add a new empty sheet to the workbook
 */
export function addSheet(
  workbook: XlsxWorkbook,
  name: string,
  afterIndex?: number
): XlsxWorkbook {
  assertNonEmptyString(name, "name");
  if (!isNameUnique(workbook, name)) {
    throw new Error(`Sheet name already exists: ${name}`);
  }

  const insertIndex = computeInsertIndex(workbook, afterIndex);
  const sheetId = getNextSheetId(workbook);
  const sheet = createEmptyWorksheet(workbook.dateSystem, name, sheetId);
  const sheets = insertAt(workbook.sheets, insertIndex, sheet);
  return { ...workbook, sheets };
}

/**
 * Delete a sheet from the workbook
 */
export function deleteSheet(workbook: XlsxWorkbook, sheetIndex: number): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);

  if (workbook.sheets.length <= 1) {
    throw new Error("Cannot delete the last remaining sheet");
  }

  const sheets = removeAt(workbook.sheets, sheetIndex);
  return { ...workbook, sheets };
}

/**
 * Rename a sheet
 */
export function renameSheet(
  workbook: XlsxWorkbook,
  sheetIndex: number,
  newName: string
): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);
  assertNonEmptyString(newName, "newName");

  if (!isNameUnique(workbook, newName, sheetIndex)) {
    throw new Error(`Sheet name already exists: ${newName}`);
  }

  const sheets = workbook.sheets.map((sheet, idx) =>
    idx === sheetIndex ? { ...sheet, name: newName } : sheet
  );
  return { ...workbook, sheets };
}

/**
 * Move a sheet to a new position
 */
export function moveSheet(
  workbook: XlsxWorkbook,
  fromIndex: number,
  toIndex: number
): XlsxWorkbook {
  assertValidSheetIndex(workbook, fromIndex, "fromIndex");
  assertValidSheetIndex(workbook, toIndex, "toIndex");

  if (fromIndex === toIndex) {
    return workbook;
  }

  const sheets = moveElementInArray(workbook.sheets, fromIndex, toIndex);
  return { ...workbook, sheets };
}

/**
 * Duplicate a sheet
 */
export function duplicateSheet(workbook: XlsxWorkbook, sheetIndex: number): XlsxWorkbook {
  assertValidSheetIndex(workbook, sheetIndex);

  const source = workbook.sheets[sheetIndex];
  const sheetId = getNextSheetId(workbook);
  const name = generateUniqueName(workbook, source.name);
  const duplicated = cloneWorksheetForDuplicate(source, name, sheetId);

  const sheets = insertAt(workbook.sheets, sheetIndex + 1, duplicated);
  return { ...workbook, sheets };
}

/**
 * Create an empty worksheet
 */
export function createEmptyWorksheet(name: string, sheetId: number): XlsxWorksheet;
export function createEmptyWorksheet(dateSystem: XlsxWorkbook["dateSystem"], name: string, sheetId: number): XlsxWorksheet;
export function createEmptyWorksheet(
  nameOrDateSystem: string,
  sheetIdOrName: number | string,
  sheetIdMaybe?: number,
): XlsxWorksheet {
  const usesExplicitDateSystem = typeof sheetIdOrName === "string";
  const dateSystem = usesExplicitDateSystem ? (nameOrDateSystem as XlsxWorkbook["dateSystem"]) : "1900";
  const name = usesExplicitDateSystem ? sheetIdOrName : nameOrDateSystem;
  const sheetId = usesExplicitDateSystem ? sheetIdMaybe : sheetIdOrName;

  if (sheetId === undefined) {
    throw new Error("sheetId is required");
  }

  assertNonEmptyString(name, "name");
  assertPositiveInteger(sheetId, "sheetId");

  return {
    dateSystem,
    name,
    sheetId,
    state: "visible",
    rows: [],
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

/**
 * Get the next available sheet ID
 */
export function getNextSheetId(workbook: XlsxWorkbook): number {
  const maxSheetId = workbook.sheets.reduce((max, sheet) => (sheet.sheetId > max ? sheet.sheetId : max), 0);
  return maxSheetId + 1;
}

/**
 * Generate a unique sheet name (e.g., "Sheet1", "Sheet2")
 */
export function generateUniqueName(workbook: XlsxWorkbook, baseName?: string): string {
  const base = (baseName ?? "Sheet").trim();
  assertNonEmptyString(base, "baseName");

  const match = /^(.*?)(\d+)$/.exec(base);
  const prefix = match && match[1].length > 0 ? match[1] : base;
  const start = match && match[1].length > 0 ? Number(match[2]) + 1 : 1;

  for (let i = start; ; i += 1) {
    const candidate = `${prefix}${i}`;
    if (isNameUnique(workbook, candidate)) {
      return candidate;
    }
  }
}
