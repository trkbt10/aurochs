/**
 * @file Workbook and Worksheet Type Definitions
 *
 * Defines the core structural types for SpreadsheetML workbooks and worksheets.
 * These types represent the parsed/domain model of XLSX files.
 *
 * @see ECMA-376 Part 4, Section 18.2.28 (Workbook Element)
 * @see ECMA-376 Part 4, Section 18.3.1.99 (Worksheet Element)
 * @see ECMA-376 Part 4, Section 18.18.68 (Sheet States)
 */

import type { CellRange } from "./cell/address";
import type { Cell } from "./cell/types";
import type { XlsxStyleSheet } from "./style/types";
import { createDefaultStyleSheet } from "./style/types";
import type { XlsxTable } from "./table/types";
import type { RowIndex, ColIndex, StyleId, SheetId } from "./types";
import { sheetId as createSheetIdBrand } from "./types";
import type { XlsxConditionalFormatting } from "./conditional-formatting";
import type { XlsxComment } from "./comment";
import type { XlsxHyperlink } from "./hyperlink";
import type { XlsxDateSystem } from "./date-system";
import type { XlsxColor } from "./style/color";
import type { XlsxDataValidation } from "./data-validation";
import type { XlsxAutoFilter } from "./auto-filter";
import type { XlsxPageSetup, XlsxPageMargins, XlsxHeaderFooter, XlsxPrintOptions } from "./page-setup";
import type { XlsxWorkbookProtection, XlsxSheetProtection } from "./protection";
import type { XlsxDrawing } from "./drawing/types";
import type { Chart } from "@aurochs-office/chart/domain/types";
import type { XlsxPivotTable } from "./pivot/types";
import type { XlsxPivotCacheDefinition } from "./pivot/cache-types";
import type { SharedStringItem } from "../parser/shared-strings";
import type { XlsxTheme } from "./theme";
import type { XlsxPageBreaks } from "./page-breaks";
import type { XlsxSparklineGroup } from "./sparkline";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

// =============================================================================
// Column Definition
// =============================================================================

/**
 * Column properties definition.
 *
 * Specifies properties for a range of columns (min to max).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 */
export type XlsxColumnDef = {
  /** Starting column index (1-based) */
  readonly min: ColIndex;
  /** Ending column index (1-based) */
  readonly max: ColIndex;
  /** Column width in character units */
  readonly width?: number;
  /** Whether the column is hidden */
  readonly hidden?: boolean;
  /** Whether the width is auto-fit to content */
  readonly bestFit?: boolean;
  /** Whether width is explicitly set (not default) */
  readonly customWidth?: boolean;
  /** Default style for cells in this column */
  readonly styleId?: StyleId;
  /**
   * Outline grouping level (0-7).
   *
   * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
   */
  readonly outlineLevel?: number;
  /**
   * Whether this column group is collapsed.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
   */
  readonly collapsed?: boolean;
};

// =============================================================================
// Row Definition
// =============================================================================

/**
 * Row with its cells and properties.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 */
export type XlsxRow = {
  /** Row number (1-based) */
  readonly rowNumber: RowIndex;
  /** Cells in this row */
  readonly cells: readonly Cell[];
  /** Row height in points */
  readonly height?: number;
  /** Whether the row is hidden */
  readonly hidden?: boolean;
  /** Whether height is explicitly set (not auto) */
  readonly customHeight?: boolean;
  /** Default style for cells in this row */
  readonly styleId?: StyleId;
  /**
   * Outline grouping level (0-7).
   *
   * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
   */
  readonly outlineLevel?: number;
  /**
   * Whether this row group is collapsed.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
   */
  readonly collapsed?: boolean;
};

// =============================================================================
// Sheet View Types
// =============================================================================

/**
 * Pane configuration for split or frozen views.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.66 (pane)
 */
export type XlsxPane = {
  /** Horizontal position of the split (columns) */
  readonly xSplit?: number;
  /** Vertical position of the split (rows) */
  readonly ySplit?: number;
  /** Top-left visible cell after the split */
  readonly topLeftCell?: string;
  /** Which pane is active */
  readonly activePane?: "bottomRight" | "topRight" | "bottomLeft" | "topLeft";
  /** The state of the pane (frozen, split, or frozenSplit) */
  readonly state?: "frozen" | "frozenSplit" | "split";
};

/**
 * Selection state within a pane.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.78 (selection)
 */
export type XlsxSelection = {
  /** Which pane this selection applies to */
  readonly pane?: "bottomRight" | "topRight" | "bottomLeft" | "topLeft";
  /** The active cell reference */
  readonly activeCell?: string;
  /** Selected range(s) as space-separated references */
  readonly sqref?: string;
};

/**
 * Sheet view configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.87 (sheetView)
 */
export type XlsxSheetView = {
  /** Whether this sheet tab is selected */
  readonly tabSelected?: boolean;
  /** Whether to show grid lines */
  readonly showGridLines?: boolean;
  /** Whether to show row and column headers */
  readonly showRowColHeaders?: boolean;
  /** Zoom scale percentage (10-400) */
  readonly zoomScale?: number;
  /** Pane configuration (freeze/split) */
  readonly pane?: XlsxPane;
  /** Current selection state */
  readonly selection?: XlsxSelection;
};

// =============================================================================
// Sheet Format Properties
// =============================================================================

/**
 * Worksheet default formatting properties.
 *
 * Corresponds to `worksheet/sheetFormatPr` in SpreadsheetML.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.82 (sheetFormatPr)
 */
export type XlsxSheetFormatPr = {
  /** Default row height in points */
  readonly defaultRowHeight?: number;
  /** Default column width in character units */
  readonly defaultColWidth?: number;
  /** Whether the default row height is zero */
  readonly zeroHeight?: boolean;
};

// =============================================================================
// Worksheet
// =============================================================================

/**
 * Worksheet definition.
 *
 * Represents a single sheet within a workbook.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 */
export type XlsxWorksheet = {
  /** Workbook date system (1900/1904) that affects date serial interpretation */
  readonly dateSystem: XlsxDateSystem;
  /** Sheet name (tab name) */
  readonly name: string;
  /** Unique sheet identifier */
  readonly sheetId: SheetId;
  /** Visibility state of the sheet */
  readonly state: "visible" | "hidden" | "veryHidden";
  /** The used range of the sheet */
  readonly dimension?: CellRange;
  /** Sheet view configuration */
  readonly sheetView?: XlsxSheetView;
  /** Default sheet formatting (sheetFormatPr) */
  readonly sheetFormatPr?: XlsxSheetFormatPr;
  /**
   * Sheet tab color (from `worksheet/sheetPr/tabColor`).
   *
   * @see ECMA-376 Part 4, Section 18.3.1.84 (sheetPr)
   * @see ECMA-376 Part 4, Section 18.3.1.92 (tabColor)
   */
  readonly tabColor?: XlsxColor;
  /** Column definitions */
  readonly columns?: readonly XlsxColumnDef[];
  /** Rows with cell data */
  readonly rows: readonly XlsxRow[];
  /** Merged cell ranges */
  readonly mergeCells?: readonly CellRange[];
  /** Conditional formatting rules for this sheet */
  readonly conditionalFormattings?: readonly XlsxConditionalFormatting[];
  /** Data validation rules for this sheet */
  readonly dataValidations?: readonly XlsxDataValidation[];
  /** Cell comments (legacy comments) */
  readonly comments?: readonly XlsxComment[];
  /** Hyperlinks declared for this sheet */
  readonly hyperlinks?: readonly XlsxHyperlink[];
  /** Auto filter configuration for this sheet */
  readonly autoFilter?: XlsxAutoFilter;
  /**
   * Page setup configuration for printing.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.64 (pageSetup)
   */
  readonly pageSetup?: XlsxPageSetup;
  /**
   * Page margins for printing.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.63 (pageMargins)
   */
  readonly pageMargins?: XlsxPageMargins;
  /**
   * Header and footer content for printing.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.46 (headerFooter)
   */
  readonly headerFooter?: XlsxHeaderFooter;
  /**
   * Print options.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.70 (printOptions)
   */
  readonly printOptions?: XlsxPrintOptions;
  /**
   * Page breaks for printing.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.72 (rowBreaks)
   * @see ECMA-376 Part 4, Section 18.3.1.14 (colBreaks)
   */
  readonly pageBreaks?: XlsxPageBreaks;
  /**
   * Sheet protection settings.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
   */
  readonly sheetProtection?: XlsxSheetProtection;
  /**
   * Sparkline groups in this worksheet.
   *
   * Sparklines are stored in extLst/ext elements using the x14 extension namespace.
   *
   * @see MS-XLSX Extension (x14:sparklineGroups)
   */
  readonly sparklineGroups?: readonly XlsxSparklineGroup[];
  /**
   * Drawing objects (images, shapes, charts) in this worksheet.
   *
   * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawings)
   */
  readonly drawing?: XlsxDrawing;
  /** Path to the worksheet XML within the package (e.g., "xl/worksheets/sheet1.xml") */
  readonly xmlPath: string;
};

// =============================================================================
// Defined Names
// =============================================================================

/**
 * Defined name (named range or formula).
 *
 * @see ECMA-376 Part 4, Section 18.2.5 (definedName)
 */
export type XlsxDefinedName = {
  /** The name identifier */
  readonly name: string;
  /** The formula or range reference */
  readonly formula: string;
  /** If scoped to a specific sheet, its index */
  readonly localSheetId?: number;
  /** Whether this name is hidden from the UI */
  readonly hidden?: boolean;
};

// =============================================================================
// Calculation Properties
// =============================================================================

/**
 * Workbook calculation properties.
 *
 * @see ECMA-376 Part 4, Section 18.2.2 (calcPr)
 */
export type XlsxCalcProperties = {
  /** Calculation engine version identifier */
  readonly calcId?: number;
  /** Whether to perform full recalculation on load */
  readonly fullCalcOnLoad?: boolean;
};

// =============================================================================
// Workbook
// =============================================================================

/**
 * Complete workbook definition.
 *
 * Represents the parsed contents of an XLSX file.
 *
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 */
export type XlsxWorkbook = {
  /** Workbook date system (1900/1904) that affects date serial interpretation */
  readonly dateSystem: XlsxDateSystem;
  /** All worksheets in the workbook */
  readonly sheets: readonly XlsxWorksheet[];
  /** Workbook styles */
  readonly styles: XlsxStyleSheet;
  /** Shared string table (plain text) */
  readonly sharedStrings: readonly string[];
  /**
   * Shared string table with rich text formatting.
   * Only populated when `includeRichText` option is enabled.
   */
  readonly sharedStringsRich?: readonly SharedStringItem[];
  /** Named ranges and formulas */
  readonly definedNames?: readonly XlsxDefinedName[];
  /** Workbook tables (ListObjects) */
  readonly tables?: readonly XlsxTable[];
  /** Calculation settings */
  readonly calcProperties?: XlsxCalcProperties;
  /**
   * Workbook protection settings.
   *
   * @see ECMA-376 Part 4, Section 18.2.29 (workbookProtection)
   */
  readonly workbookProtection?: XlsxWorkbookProtection;
  /**
   * Charts embedded in this workbook.
   * Each chart is indexed by its sheet index and relationship ID.
   *
   * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
   */
  readonly charts?: readonly XlsxWorkbookChart[];
  /**
   * Pivot tables in this workbook.
   *
   * @see ECMA-376 Part 4, Section 18.10 (Pivot Tables)
   */
  readonly pivotTables?: readonly XlsxPivotTable[];
  /**
   * Pivot cache definitions for this workbook.
   *
   * @see ECMA-376 Part 4, Section 18.10 (Pivot Tables)
   */
  readonly pivotCaches?: readonly XlsxPivotCacheDefinition[];
  /**
   * Theme definition for the workbook.
   *
   * Contains color scheme and font scheme for style resolution.
   *
   * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
   */
  readonly theme?: XlsxTheme;
  /**
   * Resource store for embedded resources (images).
   *
   * Populated when the parser is given a binary file reader via
   * `XlsxParseOptions.readBinary`. Contains image data resolved from
   * drawing relationship IDs, accessible via `toDataUrl(relId)`.
   */
  readonly resourceStore?: ResourceStore;
};

// =============================================================================
// Workbook Chart
// =============================================================================

/**
 * A chart embedded in a workbook.
 */
export type XlsxWorkbookChart = {
  /** Index of the sheet containing this chart */
  readonly sheetIndex: number;
  /** Relationship ID used to reference this chart */
  readonly relId: string;
  /** Path to the chart XML within the package */
  readonly chartPath: string;
  /** Parsed chart data */
  readonly chart: Chart;
};

// =============================================================================
// OPC Path Convention
// =============================================================================

/**
 * Derive the OPC package path for a worksheet from its 1-based sheet number.
 *
 * SpreadsheetML uses the convention `xl/worksheets/sheet{N}.xml` where N is
 * the ordinal position (1-based) of the sheet in the workbook. This is distinct
 * from `sheetId` — it reflects the physical part path in the ZIP package.
 *
 * @param sheetNumber - 1-based ordinal position of the sheet
 * @returns OPC part path, e.g. "xl/worksheets/sheet1.xml"
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function worksheetXmlPath(sheetNumber: number): string {
  return `xl/worksheets/sheet${sheetNumber}.xml`;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Input for creating a new worksheet.
 *
 * Only the fields that vary between worksheets are required.
 * Fields with spec-defined defaults (`state`, `dateSystem`) and
 * derivable fields (`xmlPath`) are optional.
 */
export type CreateWorksheetParams = {
  /** Sheet name (tab name) */
  readonly name: string;
  /**
   * Unique sheet identifier.
   * When omitted, defaults to `sheetNumber`.
   */
  readonly sheetId?: SheetId;
  /**
   * 1-based ordinal position of the sheet in the workbook.
   * Used to derive `xmlPath` and the default `sheetId`.
   * Defaults to 1.
   */
  readonly sheetNumber?: number;
  /** Rows with cell data */
  readonly rows: readonly XlsxRow[];
  /** Visibility state. Defaults to "visible". */
  readonly state?: "visible" | "hidden" | "veryHidden";
  /**
   * Workbook date system. Defaults to "1900".
   *
   * This is a workbook-level setting that the worksheet carries for convenience
   * (e.g., date serial interpretation). When creating worksheets for a workbook,
   * the workbook factory propagates its dateSystem to all sheets automatically.
   */
  readonly dateSystem?: XlsxDateSystem;
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

/**
 * Create an XlsxWorksheet with sensible defaults.
 *
 * Eliminates the need to repeatedly specify boilerplate fields like
 * `dateSystem`, `state`, and `xmlPath` at every construction site.
 *
 * @example
 * ```typescript
 * const sheet = createWorksheet({
 *   name: "Data",
 *   rows: myRows,
 * });
 * // dateSystem: "1900", state: "visible", xmlPath: "xl/worksheets/sheet1.xml"
 * ```
 */
export function createWorksheet(params: CreateWorksheetParams): XlsxWorksheet {
  const sheetNumber = params.sheetNumber ?? 1;

  return {
    dateSystem: params.dateSystem ?? "1900",
    name: params.name,
    sheetId: params.sheetId ?? createSheetIdBrand(sheetNumber),
    state: params.state ?? "visible",
    rows: params.rows,
    xmlPath: worksheetXmlPath(sheetNumber),
    ...(params.columns ? { columns: params.columns } : {}),
    ...(params.mergeCells ? { mergeCells: params.mergeCells } : {}),
    ...(params.sheetView ? { sheetView: params.sheetView } : {}),
    ...(params.sheetFormatPr ? { sheetFormatPr: params.sheetFormatPr } : {}),
    ...(params.tabColor ? { tabColor: params.tabColor } : {}),
    ...(params.conditionalFormattings ? { conditionalFormattings: params.conditionalFormattings } : {}),
    ...(params.dataValidations ? { dataValidations: params.dataValidations } : {}),
    ...(params.hyperlinks ? { hyperlinks: params.hyperlinks } : {}),
    ...(params.autoFilter ? { autoFilter: params.autoFilter } : {}),
    ...(params.pageSetup ? { pageSetup: params.pageSetup } : {}),
    ...(params.pageMargins ? { pageMargins: params.pageMargins } : {}),
    ...(params.headerFooter ? { headerFooter: params.headerFooter } : {}),
    ...(params.printOptions ? { printOptions: params.printOptions } : {}),
    ...(params.pageBreaks ? { pageBreaks: params.pageBreaks } : {}),
    ...(params.sheetProtection ? { sheetProtection: params.sheetProtection } : {}),
    ...(params.drawing ? { drawing: params.drawing } : {}),
  };
}

/**
 * Input for creating a new workbook.
 *
 * Only `sheets` is required. All other fields have sensible defaults.
 */
export type CreateWorkbookParams = {
  /** Worksheets. */
  readonly sheets: readonly XlsxWorksheet[];
  /**
   * Date system. Defaults to "1900".
   * When provided, this value is also propagated to sheets that were
   * created without an explicit dateSystem.
   */
  readonly dateSystem?: XlsxDateSystem;
  /** Workbook styles. Defaults to `createDefaultStyleSheet()`. */
  readonly styles?: XlsxStyleSheet;
  /** Shared string table. Defaults to `[]`. */
  readonly sharedStrings?: readonly string[];
  /** Named ranges and formulas */
  readonly definedNames?: readonly XlsxDefinedName[];
};

/**
 * Create an XlsxWorkbook with sensible defaults.
 *
 * @example
 * ```typescript
 * const wb = createWorkbook({
 *   sheets: [
 *     createWorksheet({ name: "Sheet1", rows: myRows }),
 *   ],
 * });
 * // dateSystem: "1900", styles: default, sharedStrings: []
 * ```
 */
export function createWorkbook(params: CreateWorkbookParams): XlsxWorkbook {
  const dateSystem = params.dateSystem ?? "1900";

  return {
    dateSystem,
    sheets: params.sheets,
    styles: params.styles ?? createDefaultStyleSheet(),
    sharedStrings: params.sharedStrings ?? [],
    ...(params.definedNames ? { definedNames: params.definedNames } : {}),
  };
}
