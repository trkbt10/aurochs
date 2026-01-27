/**
 * @file SpreadsheetML StyleSheet Type Definitions
 *
 * This module defines the integrated stylesheet types for SpreadsheetML (XLSX).
 * The stylesheet contains fonts, fills, borders, number formats, and cell styles.
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 * @see ECMA-376 Part 4, Section 18.8.45 (xf - Cell Format)
 * @see ECMA-376 Part 4, Section 18.8.1 (alignment)
 * @see ECMA-376 Part 4, Section 18.8.33 (protection)
 */

import type { XlsxFont } from "./font";
import type { XlsxFill } from "./fill";
import type { XlsxBorder } from "./border";
import type { XlsxNumberFormat } from "./number-format";
import type { XlsxDifferentialFormat } from "./dxf";
import type { XlsxTableStyle } from "./table-style";
import type { NumFmtId, FontId, FillId, BorderId } from "../types";

// =============================================================================
// XlsxAlignment Type
// =============================================================================

/**
 * Cell text alignment options
 *
 * @see ECMA-376 Part 4, Section 18.8.1 (alignment)
 * @see ECMA-376 Part 4, Section 18.18.40 (ST_HorizontalAlignment)
 * @see ECMA-376 Part 4, Section 18.18.88 (ST_VerticalAlignment)
 */
export type XlsxAlignment = {
  /** Horizontal text alignment */
  readonly horizontal?: "general" | "left" | "center" | "right" | "fill" | "justify" | "centerContinuous" | "distributed";

  /** Vertical text alignment */
  readonly vertical?: "top" | "center" | "bottom" | "justify" | "distributed";

  /** Whether text should wrap within the cell */
  readonly wrapText?: boolean;

  /** Whether text should shrink to fit within the cell */
  readonly shrinkToFit?: boolean;

  /**
   * Text rotation angle
   * - 0-90: Counterclockwise rotation (0=horizontal, 90=vertical up)
   * - 91-180: Clockwise rotation (91=1 degree, 180=90 degrees)
   * - 255: Vertical text (stacked characters)
   */
  readonly textRotation?: number;

  /** Indent level (number of spaces) */
  readonly indent?: number;

  /**
   * Reading order for text
   * - 0: Context dependent
   * - 1: Left-to-Right
   * - 2: Right-to-Left
   */
  readonly readingOrder?: number;
};

// =============================================================================
// XlsxProtection Type
// =============================================================================

/**
 * Cell protection settings
 *
 * @see ECMA-376 Part 4, Section 18.8.33 (protection)
 */
export type XlsxProtection = {
  /** Whether the cell is locked when sheet protection is enabled */
  readonly locked?: boolean;

  /** Whether the cell formula should be hidden when sheet protection is enabled */
  readonly hidden?: boolean;
};

// =============================================================================
// XlsxCellXf Type
// =============================================================================

/**
 * Cell format (xf) definition
 *
 * Represents a formatting combination applied to cells.
 * Each cell references a cellXf by index via its style attribute.
 *
 * @see ECMA-376 Part 4, Section 18.8.45 (xf)
 */
export type XlsxCellXf = {
  /** Index into numFmts collection for number formatting */
  readonly numFmtId: NumFmtId;

  /** Index into fonts collection */
  readonly fontId: FontId;

  /** Index into fills collection */
  readonly fillId: FillId;

  /** Index into borders collection */
  readonly borderId: BorderId;

  /** Index into cellStyleXfs for base cell style (optional) */
  readonly xfId?: number;

  /** Text alignment settings */
  readonly alignment?: XlsxAlignment;

  /** Cell protection settings */
  readonly protection?: XlsxProtection;

  /** Whether the numFmtId should be applied */
  readonly applyNumberFormat?: boolean;

  /** Whether the fontId should be applied */
  readonly applyFont?: boolean;

  /** Whether the fillId should be applied */
  readonly applyFill?: boolean;

  /** Whether the borderId should be applied */
  readonly applyBorder?: boolean;

  /** Whether the alignment should be applied */
  readonly applyAlignment?: boolean;

  /** Whether the protection should be applied */
  readonly applyProtection?: boolean;
};

// =============================================================================
// XlsxCellStyle Type
// =============================================================================

/**
 * Named cell style definition
 *
 * Represents a named style (e.g., "Normal", "Heading 1") that users can apply.
 * Each style references a cellStyleXf by xfId.
 *
 * @see ECMA-376 Part 4, Section 18.8.7 (cellStyle)
 */
export type XlsxCellStyle = {
  /** Display name of the style */
  readonly name: string;

  /** Index into cellStyleXfs collection */
  readonly xfId: number;

  /**
   * Built-in style ID
   * @see ECMA-376 Part 4, Section 18.18.6 (ST_BuiltInStyleId)
   */
  readonly builtinId?: number;
};

// =============================================================================
// XlsxStyleSheet Type
// =============================================================================

/**
 * Complete stylesheet definition
 *
 * Contains all style-related collections for an XLSX workbook.
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 */
export type XlsxStyleSheet = {
  /** Font definitions */
  readonly fonts: readonly XlsxFont[];

  /** Fill definitions */
  readonly fills: readonly XlsxFill[];

  /** Border definitions */
  readonly borders: readonly XlsxBorder[];

  /**
   * Optional legacy indexed color palette overrides.
   *
   * When present, this corresponds to `styles.xml`:
   * `styleSheet/colors/indexedColors/rgbColor/@rgb` (typically 64 entries).
   *
   * @see ECMA-376 Part 4, Section 18.8.3 (CT_Color)
   * @see ECMA-376 Part 4, Section 18.8.11 (colors)
   * @see ECMA-376 Part 4, Section 18.8.21 (indexedColors)
   */
  readonly indexedColors?: readonly string[];

  /** Custom number format definitions (built-in formats are implicit) */
  readonly numberFormats: readonly XlsxNumberFormat[];

  /** Cell formatting combinations (referenced by cells) */
  readonly cellXfs: readonly XlsxCellXf[];

  /** Base cell style formatting (referenced by cellStyles) */
  readonly cellStyleXfs: readonly XlsxCellXf[];

  /** Named cell styles */
  readonly cellStyles: readonly XlsxCellStyle[];

  /** Differential formats used by conditional formatting rules */
  readonly dxfs?: readonly XlsxDifferentialFormat[];

  /**
   * Table style definitions (`styles.xml` `<tableStyles>`).
   *
   * These map table style elements to DXF indices (`dxfId`) and are referenced by tables via
   * `tableStyleInfo/@name`.
   */
  readonly tableStyles?: readonly XlsxTableStyle[];
  /** Default table style name (`tableStyles/@defaultTableStyle`). */
  readonly defaultTableStyle?: string;
  /** Default pivot style name (`tableStyles/@defaultPivotStyle`). */
  readonly defaultPivotStyle?: string;
};

// =============================================================================
// Default StyleSheet Factory
// =============================================================================

// Import constructors for use in factory function
// Note: We import these dynamically to avoid circular dependency issues
// and re-export the type constructors from ../types for internal use
import { numFmtId as createNumFmtId, fontId as createFontId, fillId as createFillId, borderId as createBorderId } from "../types";

/**
 * Create a default stylesheet with minimal required elements
 *
 * According to ECMA-376, a valid styles.xml must contain at least:
 * - 1 font (Calibri, 11pt is conventional default)
 * - 2 fills (none and gray125 at indices 0 and 1)
 * - 1 border (all edges none)
 * - 1 cellXf (referencing the above defaults)
 *
 * @returns A minimal valid stylesheet
 *
 * @see ECMA-376 Part 4, Section 18.8.39
 */
export function createDefaultStyleSheet(): XlsxStyleSheet {
  // Default font: Calibri 11pt
  const defaultFont: XlsxFont = {
    name: "Calibri",
    size: 11,
    scheme: "minor",
  };

  // Default fills: none and gray125 (required by spec)
  const defaultFills: readonly XlsxFill[] = [
    { type: "none" },
    { type: "pattern", pattern: { patternType: "gray125" } },
  ];

  // Default border: all edges none
  const defaultBorder: XlsxBorder = {
    // All edges are undefined = none
  };

  // Default cellXf referencing the default font/fill/border
  const defaultCellXf: XlsxCellXf = {
    numFmtId: createNumFmtId(0), // General format
    fontId: createFontId(0),
    fillId: createFillId(0),
    borderId: createBorderId(0),
  };

  // Default cellStyleXf (same as cellXf for base "Normal" style)
  const defaultCellStyleXf: XlsxCellXf = {
    numFmtId: createNumFmtId(0),
    fontId: createFontId(0),
    fillId: createFillId(0),
    borderId: createBorderId(0),
  };

  // Default "Normal" cell style
  const defaultCellStyle: XlsxCellStyle = {
    name: "Normal",
    xfId: 0,
    builtinId: 0,
  };

  return {
    fonts: [defaultFont],
    fills: defaultFills,
    borders: [defaultBorder],
    numberFormats: [], // No custom formats, using built-in only
    cellXfs: [defaultCellXf],
    cellStyleXfs: [defaultCellStyleXf],
    cellStyles: [defaultCellStyle],
  };
}
