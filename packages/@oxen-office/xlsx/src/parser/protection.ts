/**
 * @file Protection Parser
 *
 * Parses workbook and sheet protection elements from XLSX XML.
 *
 * @see ECMA-376 Part 4, Section 18.2.29 (workbookProtection)
 * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
 */

import type { XmlElement } from "@oxen/xml";
import { getAttr } from "@oxen/xml";
import { parseBooleanAttr, parseIntAttr } from "./primitive";
import type { XlsxWorkbookProtection, XlsxSheetProtection } from "../domain/protection";

// =============================================================================
// Workbook Protection Parsing
// =============================================================================

/**
 * Parse workbook protection element.
 *
 * @param workbookProtectionElement - The <workbookProtection> element
 * @returns Parsed workbook protection or undefined
 *
 * @see ECMA-376 Part 4, Section 18.2.29 (workbookProtection)
 */
export function parseWorkbookProtection(
  workbookProtectionElement: XmlElement | undefined,
): XlsxWorkbookProtection | undefined {
  if (!workbookProtectionElement) {
    return undefined;
  }

  const lockStructure = parseBooleanAttr(getAttr(workbookProtectionElement, "lockStructure"));
  const lockWindows = parseBooleanAttr(getAttr(workbookProtectionElement, "lockWindows"));
  const lockRevision = parseBooleanAttr(getAttr(workbookProtectionElement, "lockRevision"));
  const workbookPassword = getAttr(workbookProtectionElement, "workbookPassword") ?? undefined;
  const revisionsPassword = getAttr(workbookProtectionElement, "revisionsPassword") ?? undefined;
  const workbookAlgorithmName = getAttr(workbookProtectionElement, "workbookAlgorithmName") ?? undefined;
  const workbookHashValue = getAttr(workbookProtectionElement, "workbookHashValue") ?? undefined;
  const workbookSaltValue = getAttr(workbookProtectionElement, "workbookSaltValue") ?? undefined;
  const workbookSpinCount = parseIntAttr(getAttr(workbookProtectionElement, "workbookSpinCount"));

  return {
    ...(lockStructure !== undefined && { lockStructure }),
    ...(lockWindows !== undefined && { lockWindows }),
    ...(lockRevision !== undefined && { lockRevision }),
    ...(workbookPassword && { workbookPassword }),
    ...(revisionsPassword && { revisionsPassword }),
    ...(workbookAlgorithmName && { workbookAlgorithmName }),
    ...(workbookHashValue && { workbookHashValue }),
    ...(workbookSaltValue && { workbookSaltValue }),
    ...(workbookSpinCount !== undefined && { workbookSpinCount }),
  };
}

// =============================================================================
// Sheet Protection Parsing
// =============================================================================

/**
 * Parse sheet protection element.
 *
 * @param sheetProtectionElement - The <sheetProtection> element
 * @returns Parsed sheet protection or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
 */
export function parseSheetProtection(
  sheetProtectionElement: XmlElement | undefined,
): XlsxSheetProtection | undefined {
  if (!sheetProtectionElement) {
    return undefined;
  }

  const sheet = parseBooleanAttr(getAttr(sheetProtectionElement, "sheet"));
  const objects = parseBooleanAttr(getAttr(sheetProtectionElement, "objects"));
  const scenarios = parseBooleanAttr(getAttr(sheetProtectionElement, "scenarios"));
  const formatCells = parseBooleanAttr(getAttr(sheetProtectionElement, "formatCells"));
  const formatColumns = parseBooleanAttr(getAttr(sheetProtectionElement, "formatColumns"));
  const formatRows = parseBooleanAttr(getAttr(sheetProtectionElement, "formatRows"));
  const insertColumns = parseBooleanAttr(getAttr(sheetProtectionElement, "insertColumns"));
  const insertRows = parseBooleanAttr(getAttr(sheetProtectionElement, "insertRows"));
  const insertHyperlinks = parseBooleanAttr(getAttr(sheetProtectionElement, "insertHyperlinks"));
  const deleteColumns = parseBooleanAttr(getAttr(sheetProtectionElement, "deleteColumns"));
  const deleteRows = parseBooleanAttr(getAttr(sheetProtectionElement, "deleteRows"));
  const selectLockedCells = parseBooleanAttr(getAttr(sheetProtectionElement, "selectLockedCells"));
  const sort = parseBooleanAttr(getAttr(sheetProtectionElement, "sort"));
  const autoFilter = parseBooleanAttr(getAttr(sheetProtectionElement, "autoFilter"));
  const pivotTables = parseBooleanAttr(getAttr(sheetProtectionElement, "pivotTables"));
  const selectUnlockedCells = parseBooleanAttr(getAttr(sheetProtectionElement, "selectUnlockedCells"));
  const password = getAttr(sheetProtectionElement, "password") ?? undefined;
  const algorithmName = getAttr(sheetProtectionElement, "algorithmName") ?? undefined;
  const hashValue = getAttr(sheetProtectionElement, "hashValue") ?? undefined;
  const saltValue = getAttr(sheetProtectionElement, "saltValue") ?? undefined;
  const spinCount = parseIntAttr(getAttr(sheetProtectionElement, "spinCount"));

  return {
    ...(sheet !== undefined && { sheet }),
    ...(objects !== undefined && { objects }),
    ...(scenarios !== undefined && { scenarios }),
    ...(formatCells !== undefined && { formatCells }),
    ...(formatColumns !== undefined && { formatColumns }),
    ...(formatRows !== undefined && { formatRows }),
    ...(insertColumns !== undefined && { insertColumns }),
    ...(insertRows !== undefined && { insertRows }),
    ...(insertHyperlinks !== undefined && { insertHyperlinks }),
    ...(deleteColumns !== undefined && { deleteColumns }),
    ...(deleteRows !== undefined && { deleteRows }),
    ...(selectLockedCells !== undefined && { selectLockedCells }),
    ...(sort !== undefined && { sort }),
    ...(autoFilter !== undefined && { autoFilter }),
    ...(pivotTables !== undefined && { pivotTables }),
    ...(selectUnlockedCells !== undefined && { selectUnlockedCells }),
    ...(password && { password }),
    ...(algorithmName && { algorithmName }),
    ...(hashValue && { hashValue }),
    ...(saltValue && { saltValue }),
    ...(spinCount !== undefined && { spinCount }),
  };
}
