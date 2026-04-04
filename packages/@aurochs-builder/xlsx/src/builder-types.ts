/**
 * @file Builder Input Types
 *
 * Types for constructing XLSX workbooks programmatically via `exportXlsx`.
 *
 * These types define what the builder **requires** from consumers,
 * as opposed to the full domain types (`XlsxWorkbook`, `XlsxWorksheet`)
 * which represent the complete parsed state of an XLSX file.
 *
 * Design rationale:
 *
 * The domain type `XlsxWorksheet` carries fields that are meaningful only
 * in a parser context (`dateSystem`, `xmlPath`, `comments`, `sparklineGroups`).
 * When building a new workbook from scratch, requiring these fields would
 * force consumers to fabricate values that the builder never reads,
 * creating a gap where invalid or missing values (like `sheetId: undefined`)
 * silently produce corrupt files.
 *
 * By defining `XlsxWorksheetInput`, the builder accepts exactly what it needs:
 *   - `name` and `sheetId` are required (they appear in workbook.xml)
 *   - `rows` is required (the sheet content)
 *   - `state` defaults to "visible" when omitted
 *   - All serializable optional fields (columns, mergeCells, drawing, etc.)
 *     are accepted when present
 *   - Parser-only fields (`dateSystem`, `xmlPath`) are excluded
 *
 * The full domain type `XlsxWorksheet` extends `XlsxWorksheetInput`,
 * so parsed workbooks can be passed directly to `exportXlsx` without conversion.
 *
 * @see ECMA-376 Part 4, Section 18.2.19 (sheet element — requires name, sheetId)
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet element)
 */

import type { SheetId } from "@aurochs-office/xlsx/domain/types";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxSheetView, XlsxRow, XlsxColumnDef, XlsxDefinedName } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxSheetFormatPr } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxColor } from "@aurochs-office/xlsx/domain/style/color";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxConditionalFormatting } from "@aurochs-office/xlsx/domain/conditional-formatting";
import type { XlsxDataValidation } from "@aurochs-office/xlsx/domain/data-validation";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";
import type { XlsxPageSetup, XlsxPageMargins, XlsxHeaderFooter, XlsxPrintOptions } from "@aurochs-office/xlsx/domain/page-setup";
import type { XlsxSheetProtection } from "@aurochs-office/xlsx/domain/protection";
import type { XlsxPageBreaks } from "@aurochs-office/xlsx/domain/page-breaks";
import type { XlsxDrawing } from "@aurochs-office/xlsx/domain/drawing/types";

// =============================================================================
// Worksheet Input Type
// =============================================================================

/**
 * Worksheet definition for building a new XLSX file.
 *
 * Contains exactly the fields that `exportXlsx` reads when generating
 * worksheet XML, workbook XML, and OPC relationships.
 *
 * The full domain type `XlsxWorksheet` is a structural supertype of this,
 * so parsed workbooks are accepted without conversion.
 */
export type XlsxWorksheetInput = {
  /** Sheet name (tab name). Appears in workbook.xml `<sheet name="...">`. */
  readonly name: string;
  /** Unique sheet identifier. Appears in workbook.xml `<sheet sheetId="...">`. */
  readonly sheetId: SheetId;
  /** Visibility state. Defaults to "visible" when omitted during export. */
  readonly state?: "visible" | "hidden" | "veryHidden";
  /** Rows with cell data */
  readonly rows: readonly XlsxRow[];
  /** Column definitions */
  readonly columns?: readonly XlsxColumnDef[];
  /** Merged cell ranges */
  readonly mergeCells?: readonly CellRange[];
  /** Sheet view configuration */
  readonly sheetView?: XlsxSheetView;
  /** Default sheet formatting (sheetFormatPr) */
  readonly sheetFormatPr?: XlsxSheetFormatPr;
  /** Sheet tab color */
  readonly tabColor?: XlsxColor;
  /** Conditional formatting rules */
  readonly conditionalFormattings?: readonly XlsxConditionalFormatting[];
  /** Data validation rules */
  readonly dataValidations?: readonly XlsxDataValidation[];
  /** Hyperlinks */
  readonly hyperlinks?: readonly XlsxHyperlink[];
  /** Auto filter configuration */
  readonly autoFilter?: XlsxAutoFilter;
  /** Page setup for printing */
  readonly pageSetup?: XlsxPageSetup;
  /** Page margins for printing */
  readonly pageMargins?: XlsxPageMargins;
  /** Header and footer for printing */
  readonly headerFooter?: XlsxHeaderFooter;
  /** Print options */
  readonly printOptions?: XlsxPrintOptions;
  /** Page breaks for printing */
  readonly pageBreaks?: XlsxPageBreaks;
  /** Sheet protection settings */
  readonly sheetProtection?: XlsxSheetProtection;
  /** Drawing objects (images, shapes, charts) */
  readonly drawing?: XlsxDrawing;
};

// =============================================================================
// Workbook Input Type
// =============================================================================

/**
 * Workbook definition for building a new XLSX file.
 *
 * Contains exactly the fields that `exportXlsx` reads when generating
 * the complete OPC package. Parser-only fields (`dateSystem`, `sharedStrings`,
 * `tables`, etc.) are excluded.
 *
 * The full domain type `XlsxWorkbook` is a structural supertype of this,
 * so parsed workbooks are accepted without conversion.
 */
export type XlsxWorkbookInput = {
  /** All worksheets in the workbook */
  readonly sheets: readonly XlsxWorksheetInput[];
  /** Workbook styles */
  readonly styles: XlsxStyleSheet;
  /** Named ranges and formulas */
  readonly definedNames?: readonly XlsxDefinedName[];
};
