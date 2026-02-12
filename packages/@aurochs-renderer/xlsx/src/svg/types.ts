/**
 * @file SVG rendering types for XLSX
 *
 * Type definitions for SVG-based rendering of spreadsheet data.
 * These types represent resolved styles, layouts, and render options.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxBorderStyle } from "@aurochs-office/xlsx/domain/style/border";
import type { Chart } from "@aurochs-office/chart/domain";

// =============================================================================
// Resolved Style Types
// =============================================================================

/**
 * Resolved font properties with computed color.
 */
export type ResolvedFont = {
  readonly name: string;
  readonly size: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly color?: string;
  readonly vertAlign?: "superscript" | "subscript" | "baseline";
};

/**
 * Resolved fill (background) with computed color.
 */
export type ResolvedFill =
  | { readonly type: "none" }
  | { readonly type: "solid"; readonly color: string }
  | {
      readonly type: "gradient";
      readonly gradientType: "linear" | "path";
      readonly degree?: number;
      readonly stops: readonly { position: number; color: string }[];
    };

/**
 * Resolved border edge with computed color.
 */
export type ResolvedBorderEdge = {
  readonly style: XlsxBorderStyle;
  readonly color: string;
};

/**
 * Resolved border with computed colors.
 */
export type ResolvedBorder = {
  readonly left?: ResolvedBorderEdge;
  readonly right?: ResolvedBorderEdge;
  readonly top?: ResolvedBorderEdge;
  readonly bottom?: ResolvedBorderEdge;
  readonly diagonal?: ResolvedBorderEdge;
  readonly diagonalUp?: boolean;
  readonly diagonalDown?: boolean;
};

/**
 * Complete resolved cell style.
 */
export type ResolvedCellStyle = {
  readonly font: ResolvedFont;
  readonly fill: ResolvedFill;
  readonly border: ResolvedBorder;
  readonly alignment?: XlsxAlignment;
  readonly numberFormat: string;
};

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Layout information for a single cell.
 */
export type CellLayout = {
  /** X position in pixels */
  readonly x: number;
  /** Y position in pixels */
  readonly y: number;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Number of columns this cell spans (for merged cells) */
  readonly colspan: number;
  /** Number of rows this cell spans (for merged cells) */
  readonly rowspan: number;
  /** Whether this cell is the primary cell of a merge region */
  readonly isMergeOrigin: boolean;
  /** Whether this cell is hidden by a merge */
  readonly isHiddenByMerge: boolean;
};

/**
 * Complete layout for a sheet.
 */
export type SheetLayout = {
  /** Map from cell reference (e.g., "A1") to layout */
  readonly cells: ReadonlyMap<string, CellLayout>;
  /** Total width of the rendered sheet */
  readonly totalWidth: number;
  /** Total height of the rendered sheet */
  readonly totalHeight: number;
  /** X positions of column boundaries */
  readonly columnPositions: readonly number[];
  /** Y positions of row boundaries */
  readonly rowPositions: readonly number[];
  /** Column widths in pixels */
  readonly columnWidths: readonly number[];
  /** Row heights in pixels */
  readonly rowHeights: readonly number[];
  /** Number of columns */
  readonly columnCount: number;
  /** Number of rows */
  readonly rowCount: number;
};

// =============================================================================
// Render Options
// =============================================================================

/**
 * Options for SVG rendering.
 */
export type XlsxRenderOptions = {
  /**
   * Scale factor for converting Excel units to pixels.
   * Excel column width unit = 1/256th of character width.
   * Default: 7 (approximately 7 pixels per Excel unit)
   */
  readonly scale: number;

  /**
   * Default row height in points.
   * Default: 15
   */
  readonly defaultRowHeight: number;

  /**
   * Default column width in Excel units.
   * Default: 8.43 (standard Excel default)
   */
  readonly defaultColumnWidth: number;

  /**
   * Whether to show grid lines.
   * Default: true
   */
  readonly showGridLines: boolean;

  /**
   * Whether to show row headers (1, 2, 3...).
   * Default: false
   */
  readonly showRowHeaders: boolean;

  /**
   * Whether to show column headers (A, B, C...).
   * Default: false
   */
  readonly showColumnHeaders: boolean;

  /**
   * Header size in pixels (for row/column headers).
   * Default: 20
   */
  readonly headerSize: number;

  /**
   * Display mode for formulas.
   * - "value": Show computed values (default)
   * - "formula": Show formula expressions
   */
  readonly formulaMode: "value" | "formula";

  /**
   * Default font family when not specified in style.
   * Default: "Calibri"
   */
  readonly defaultFontFamily: string;

  /**
   * Default font size in points when not specified in style.
   * Default: 11
   */
  readonly defaultFontSize: number;

  /**
   * Grid line color.
   * Default: "#E0E0E0"
   */
  readonly gridLineColor: string;

  /**
   * Background color for the sheet.
   * Default: "#FFFFFF"
   */
  readonly backgroundColor: string;

  /**
   * Whether to show drawing elements (images, shapes, charts).
   * Default: true
   */
  readonly showDrawings: boolean;
};

/**
 * Default render options.
 */
export const DEFAULT_XLSX_RENDER_OPTIONS: XlsxRenderOptions = {
  scale: 7,
  defaultRowHeight: 15,
  defaultColumnWidth: 8.43,
  showGridLines: true,
  showRowHeaders: false,
  showColumnHeaders: false,
  headerSize: 20,
  formulaMode: "value",
  defaultFontFamily: "Calibri",
  defaultFontSize: 11,
  gridLineColor: "#E0E0E0",
  backgroundColor: "#FFFFFF",
  showDrawings: true,
};

// =============================================================================
// Render Result
// =============================================================================

/**
 * Result of rendering a sheet to SVG.
 */
export type SheetSvgResult = {
  /** The SVG string */
  readonly svg: string;
  /** Width of the SVG in pixels */
  readonly width: number;
  /** Height of the SVG in pixels */
  readonly height: number;
  /** Warnings generated during rendering */
  readonly warnings: readonly string[];
};

// =============================================================================
// Defs Collector (from PPTX pattern)
// =============================================================================

/**
 * SVG defs collector for gradients, patterns, etc.
 */
export type DefsCollector = {
  /** Add a def element (raw SVG string) */
  readonly add: (def: string) => void;
  /** Generate unique ID for a def */
  readonly generateId: (prefix: string) => string;
  /** Get all collected defs */
  readonly getAll: () => readonly string[];
  /** Check if any defs were collected */
  readonly hasAny: () => boolean;
};

/**
 * Create a defs collector.
 */
export function createDefsCollector(): DefsCollector {
  const defs: string[] = [];
  const idCounter = { value: 0 };

  return {
    add: (def) => defs.push(def),
    generateId: (prefix) => `${prefix}-${idCounter.value++}`,
    getAll: () => defs,
    hasAny: () => defs.length > 0,
  };
}

// =============================================================================
// Render Context
// =============================================================================

/**
 * Warnings collector for tracking issues during rendering.
 */
export type WarningsCollector = {
  /** Add a warning message */
  readonly add: (message: string) => void;
  /** Get all collected warnings */
  readonly getAll: () => readonly string[];
};

/**
 * Create a warnings collector.
 */
export function createWarningsCollector(): WarningsCollector {
  const warnings: string[] = [];

  return {
    add: (message) => {
      // Deduplicate warnings
      if (!warnings.includes(message)) {
        warnings.push(message);
      }
    },
    getAll: () => warnings,
  };
}

/**
 * Image resolver function type.
 * Returns a data URI or path for the given relationship ID.
 */
export type ImageResolver = (relId: string) => string | undefined;

/**
 * Chart resolver function type.
 * Returns a Chart object for the given relationship ID or path.
 */
export type ChartResolver = (relIdOrPath: string) => Chart | undefined;

/**
 * Context for SVG rendering.
 */
export type XlsxSvgRenderContext = {
  /** The workbook being rendered */
  readonly workbook: XlsxWorkbook;
  /** The current sheet being rendered */
  readonly sheet: XlsxWorksheet;
  /** Computed layout for the sheet */
  readonly layout: SheetLayout;
  /** Render options */
  readonly options: XlsxRenderOptions;
  /** SVG defs collector */
  readonly defs: DefsCollector;
  /** Warnings collector */
  readonly warnings: WarningsCollector;
  /** Optional image resolver for drawing elements */
  readonly resolveImage?: ImageResolver;
  /** Optional chart resolver for chart frames */
  readonly resolveChart?: ChartResolver;
};
