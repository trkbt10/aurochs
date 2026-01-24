/**
 * @file XLS domain model (intermediate)
 */

import type { XlsxDateSystem } from "../../xlsx/domain/date-system";
import type { ErrorValue } from "../../xlsx/domain/cell/types";

export type XlsFont = {
  /** Height in 1/20th point (twips) */
  readonly heightTwips: number;
  readonly isItalic: boolean;
  readonly isStrikeout: boolean;
  readonly isOutline: boolean;
  readonly isShadow: boolean;
  readonly colorIndex: number;
  /** Character weight (e.g. 0x190 normal, 0x2BC bold) */
  readonly weight: number;
  /** 0=none, 1=superscript, 2=subscript */
  readonly script: number;
  /** Underline style code */
  readonly underline: number;
  readonly family: number;
  readonly charset: number;
  readonly name: string;
};

export type XlsNumberFormat = {
  readonly formatIndex: number;
  readonly formatCode: string;
};

export type XlsXfAlignment = {
  readonly horizontal: number;
  readonly vertical: number;
  readonly wrapText: boolean;
  /** Rotation code 0-180, 255=vertical */
  readonly rotation: number;
  readonly indent: number;
  readonly shrinkToFit: boolean;
};

export type XlsXfAttributes = {
  readonly hasNumberFormat: boolean;
  readonly hasFont: boolean;
  readonly hasAlignment: boolean;
  readonly hasBorder: boolean;
  readonly hasPattern: boolean;
  readonly hasProtection: boolean;
};

export type XlsXfBorderStyles = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type XlsXf = {
  readonly fontIndex: number;
  readonly formatIndex: number;
  readonly isStyle: boolean;
  readonly isLocked: boolean;
  readonly isHidden: boolean;
  /** Parent style XF index (0xFFF if style XF) */
  readonly parentXfIndex: number;
  readonly alignment: XlsXfAlignment;
  readonly attributes: XlsXfAttributes;
  readonly border: XlsXfBorderStyles;
  readonly raw: {
    readonly borderColorsAndDiag: number;
    readonly fillPatternAndColors: number;
  };
};

export type XlsCellValue =
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "error"; readonly value: ErrorValue }
  | { readonly type: "empty" };

export type XlsFormula = {
  readonly tokens: Uint8Array;
  readonly alwaysCalc: boolean;
  readonly calcOnLoad: boolean;
  readonly isSharedFormula: boolean;
};

export type XlsCell = {
  /** Row index (0-based) */
  readonly row: number;
  /** Column index (0-based) */
  readonly col: number;
  /** BIFF XF index */
  readonly xfIndex: number;
  readonly value: XlsCellValue;
  /** Parsed expression tokens (BIFF RPN), not yet converted to XLSX formula text */
  readonly formula?: XlsFormula;
};

export type XlsRow = {
  /** Row index (0-based) */
  readonly row: number;
  /** Row height in 1/20th of a point (twips) */
  readonly heightTwips?: number;
  readonly hidden?: boolean;
  /** BIFF row default XF index */
  readonly xfIndex?: number;
};

export type XlsColumn = {
  /** First column index (0-based, inclusive) */
  readonly colFirst: number;
  /** Last column index (0-based, inclusive) */
  readonly colLast: number;
  /** Column width in 1/256 character units */
  readonly width256: number;
  readonly hidden?: boolean;
  /** BIFF column default XF index */
  readonly xfIndex?: number;
};

export type XlsDimensions = {
  readonly firstRow: number;
  readonly lastRowExclusive: number;
  readonly firstCol: number;
  readonly lastColExclusive: number;
};

export type XlsCellRange = {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstCol: number;
  readonly lastCol: number;
};

export type XlsWorksheet = {
  readonly name: string;
  readonly state: "visible" | "hidden" | "veryHidden";
  readonly dimensions?: XlsDimensions;
  /** Default column width in character units (DEFCOLWIDTH), if present */
  readonly defaultColumnWidthChars?: number;
  /** Default row height in 1/20th of a point (DEFAULTROWHEIGHT), if present */
  readonly defaultRowHeightTwips?: number;
  /** Default row zero-height flag (DEFAULTROWHEIGHT), if present */
  readonly defaultRowZeroHeight?: boolean;
  readonly rows: readonly XlsRow[];
  readonly columns: readonly XlsColumn[];
  readonly mergeCells: readonly XlsCellRange[];
  readonly cells: readonly XlsCell[];
};

export type XlsWorkbook = {
  readonly dateSystem: XlsxDateSystem;
  readonly sharedStrings: readonly string[];
  /**
   * Optional custom indexed color palette override (PALETTE record).
   *
   * Values are stored as 8-hex strings (AARRGGBB), typically 56 entries mapping to slots 8..63.
   */
  readonly palette?: readonly string[];
  readonly fonts: readonly XlsFont[];
  readonly numberFormats: readonly XlsNumberFormat[];
  readonly xfs: readonly XlsXf[];
  readonly styles: readonly {
    readonly kind: "builtIn" | "userDefined";
    readonly styleXfIndex: number;
    readonly builtInStyleId?: number;
    readonly outlineLevel?: number;
    readonly name?: string;
  }[];
  readonly sheets: readonly XlsWorksheet[];
};
