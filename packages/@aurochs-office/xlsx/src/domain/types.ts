/**
 * @file XLSX-specific branded types
 *
 * These types represent ECMA-376 SpreadsheetML concepts with type safety.
 * Uses branded types to prevent mixing semantically different values.
 *
 * @see ECMA-376 Part 4, Section 18.18 (Simple Types)
 */

import type { Brand } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Row/Column Index Types (1-based)
// =============================================================================

/**
 * Row index (1-based)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 */
export type RowIndex = Brand<number, "RowIndex">;

/**
 * Column index (1-based)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 */
export type ColIndex = Brand<number, "ColIndex">;

// =============================================================================
// Cell Reference Types
// =============================================================================

/**
 * Cell reference in A1 notation (e.g., "A1", "B2", "AA100")
 *
 * @see ECMA-376 Part 4, Section 18.18.62 (ST_Ref)
 * @see ECMA-376 Part 4, Section 18.18.7 (ST_CellRef)
 */
export type CellRef = Brand<string, "CellRef">;

// =============================================================================
// Style Index Types
// =============================================================================

/**
 * Style index referencing cellXfs in styles.xml
 *
 * @see ECMA-376 Part 4, Section 18.8.10 (cellXfs)
 */
export type StyleId = Brand<number, "StyleId">;

/**
 * Font index referencing fonts in styles.xml
 *
 * @see ECMA-376 Part 4, Section 18.8.23 (fonts)
 */
export type FontId = Brand<number, "FontId">;

/**
 * Fill index referencing fills in styles.xml
 *
 * @see ECMA-376 Part 4, Section 18.8.21 (fills)
 */
export type FillId = Brand<number, "FillId">;

/**
 * Border index referencing borders in styles.xml
 *
 * @see ECMA-376 Part 4, Section 18.8.5 (borders)
 */
export type BorderId = Brand<number, "BorderId">;

/**
 * Number format index referencing numFmts in styles.xml
 *
 * @see ECMA-376 Part 4, Section 18.8.31 (numFmts)
 */
export type NumFmtId = Brand<number, "NumFmtId">;

// =============================================================================
// SharedString Types
// =============================================================================

/**
 * Index into the shared strings table (sharedStrings.xml)
 *
 * @see ECMA-376 Part 4, Section 18.4 (Shared String Table)
 */
export type SharedStringIndex = Brand<number, "SharedStringIndex">;

// =============================================================================
// Branded Type Constructors
// =============================================================================

/**
 * Create a RowIndex from a number.
 */
export const rowIdx = (v: number): RowIndex => v as RowIndex;

/**
 * Create a ColIndex from a number.
 */
export const colIdx = (v: number): ColIndex => v as ColIndex;

/**
 * Create a CellRef from a string.
 */
export const cellRef = (v: string): CellRef => v as CellRef;

/**
 * Create a StyleId from a number.
 */
export const styleId = (v: number): StyleId => v as StyleId;

/**
 * Create a FontId from a number.
 */
export const fontId = (v: number): FontId => v as FontId;

/**
 * Create a FillId from a number.
 */
export const fillId = (v: number): FillId => v as FillId;

/**
 * Create a BorderId from a number.
 */
export const borderId = (v: number): BorderId => v as BorderId;

/**
 * Create a NumFmtId from a number.
 */
export const numFmtId = (v: number): NumFmtId => v as NumFmtId;

/**
 * Create a SharedStringIndex from a number.
 */
export const sharedStringIdx = (v: number): SharedStringIndex => v as SharedStringIndex;
