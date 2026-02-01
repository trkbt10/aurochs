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
import type { XlsxTable } from "./table/types";
import type { RowIndex, ColIndex, StyleId } from "./types";
import type { XlsxConditionalFormatting } from "./conditional-formatting";
import type { XlsxComment } from "./comment";
import type { XlsxHyperlink } from "./hyperlink";
import type { XlsxDateSystem } from "./date-system";
import type { XlsxColor } from "./style/font";
import type { XlsxDataValidation } from "./data-validation";
import type { XlsxAutoFilter } from "./auto-filter";
import type {
  XlsxPageSetup,
  XlsxPageMargins,
  XlsxHeaderFooter,
  XlsxPrintOptions,
} from "./page-setup";
import type { XlsxWorkbookProtection, XlsxSheetProtection } from "./protection";
import type { XlsxDrawing } from "./drawing/types";
import type { Chart } from "@oxen-office/chart/domain/types";
import type { XlsxPivotTable } from "./pivot/types";
import type { XlsxPivotCacheDefinition } from "./pivot/cache-types";
import type { SharedStringItem } from "../parser/shared-strings";

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
  /** Default style for cells in this column */
  readonly styleId?: StyleId;
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
  readonly sheetId: number;
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
   * Sheet protection settings.
   *
   * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
   */
  readonly sheetProtection?: XlsxSheetProtection;
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
