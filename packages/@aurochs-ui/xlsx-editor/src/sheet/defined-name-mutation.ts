/**
 * @file Defined Name mutation operations
 *
 * Operations for managing defined names (named ranges/formulas).
 */

import type { XlsxWorkbook, XlsxDefinedName } from "@aurochs-office/xlsx/domain/workbook";

/**
 * Add a defined name
 */
export function addDefinedName(
  workbook: XlsxWorkbook,
  definedName: XlsxDefinedName,
): XlsxWorkbook {
  const existingNames = workbook.definedNames ?? [];

  // Check for duplicate names (at same scope)
  const hasDuplicate = existingNames.some(
    (n) => n.name === definedName.name && n.localSheetId === definedName.localSheetId,
  );
  if (hasDuplicate) {
    throw new Error(`Defined name "${definedName.name}" already exists`);
  }

  return {
    ...workbook,
    definedNames: [...existingNames, definedName],
  };
}

/**
 * Update a defined name
 */
export function updateDefinedName(
  workbook: XlsxWorkbook,
  oldName: string,
  oldLocalSheetId: number | undefined,
  updatedName: XlsxDefinedName,
): XlsxWorkbook {
  const existingNames = workbook.definedNames ?? [];

  // If renaming, check for duplicates
  if (oldName !== updatedName.name || oldLocalSheetId !== updatedName.localSheetId) {
    const hasDuplicate = existingNames.some(
      (n) =>
        n.name === updatedName.name &&
        n.localSheetId === updatedName.localSheetId &&
        !(n.name === oldName && n.localSheetId === oldLocalSheetId),
    );
    if (hasDuplicate) {
      throw new Error(`Defined name "${updatedName.name}" already exists`);
    }
  }

  const newNames = existingNames.map((n) =>
    n.name === oldName && n.localSheetId === oldLocalSheetId ? updatedName : n,
  );

  return {
    ...workbook,
    definedNames: newNames,
  };
}

/**
 * Delete a defined name
 */
export function deleteDefinedName(
  workbook: XlsxWorkbook,
  name: string,
  localSheetId?: number,
): XlsxWorkbook {
  const existingNames = workbook.definedNames ?? [];
  const newNames = existingNames.filter(
    (n) => !(n.name === name && n.localSheetId === localSheetId),
  );

  if (newNames.length === existingNames.length) {
    return workbook; // No name found
  }

  if (newNames.length === 0) {
    return { ...workbook, definedNames: undefined };
  }

  return { ...workbook, definedNames: newNames };
}
