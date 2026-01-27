/**
 * @file Parse Context Type Definitions
 *
 * Defines the shared context used during XLSX parsing operations.
 * The context holds references to shared resources (strings, styles, etc.)
 * that are needed when parsing individual worksheet elements.
 *
 * Context construction order:
 * 1. xl/_rels/workbook.xml.rels -> relationships
 * 2. xl/sharedStrings.xml -> sharedStrings
 * 3. xl/styles.xml -> styleSheet
 * 4. xl/workbook.xml -> workbookInfo
 */

import type { XlsxStyleSheet } from "../domain/style/types";
import { createDefaultStyleSheet } from "../domain/style/types";
import type { XlsxDefinedName } from "../domain/workbook";
import type { XlsxDateSystem } from "../domain/date-system";

// =============================================================================
// Sheet Info
// =============================================================================

/**
 * Basic sheet information from workbook.xml
 *
 * Contains the essential sheet metadata needed to locate and identify sheets.
 */
export type XlsxSheetInfo = {
  readonly name: string;
  readonly sheetId: number;
  readonly rId: string;
  readonly state: "visible" | "hidden" | "veryHidden";
};

// =============================================================================
// Workbook Info
// =============================================================================

/**
 * Workbook-level information extracted from workbook.xml
 *
 * Contains sheet list and defined names before full sheet parsing.
 */
export type XlsxWorkbookInfo = {
  readonly sheets: readonly XlsxSheetInfo[];
  readonly definedNames?: readonly XlsxDefinedName[];
  readonly dateSystem: XlsxDateSystem;
};

// =============================================================================
// Parse Context
// =============================================================================

/**
 * Shared context for XLSX parsing operations
 *
 * This context is populated incrementally during parsing and provides
 * access to shared resources needed when parsing worksheet cells.
 */
export type XlsxParseContext = {
  readonly sharedStrings: readonly string[];
  readonly styleSheet: XlsxStyleSheet;
  readonly workbookInfo: XlsxWorkbookInfo;
  readonly relationships: ReadonlyMap<string, string>;
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a parse context with the given resources
 *
 * @param sharedStrings - The shared string table
 * @param styleSheet - The workbook stylesheet
 * @param workbookInfo - Workbook metadata (sheets, defined names)
 * @param relationships - Map from relationship ID to target path
 * @returns A fully populated parse context
 */
export function createParseContext(
  sharedStrings: readonly string[],
  styleSheet: XlsxStyleSheet,
  workbookInfo: XlsxWorkbookInfo,
  relationships: ReadonlyMap<string, string>,
): XlsxParseContext {
  return {
    sharedStrings,
    styleSheet,
    workbookInfo,
    relationships,
  };
}

/**
 * Create a default parse context with empty/default values
 *
 * Useful for testing or when parsing a minimal XLSX file.
 *
 * @returns A parse context with default values
 */
export function createDefaultParseContext(): XlsxParseContext {
  return {
    sharedStrings: [],
    styleSheet: createDefaultStyleSheet(),
    workbookInfo: { sheets: [], dateSystem: "1900" },
    relationships: new Map(),
  };
}
