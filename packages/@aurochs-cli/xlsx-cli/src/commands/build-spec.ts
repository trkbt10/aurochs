/**
 * @file Build specification types and domain converter for XLSX construction.
 *
 * Defines a human-writable JSON schema (BuildSpec) and converts it to
 * the XlsxWorkbook domain model used by @aurochs-builder/xlsx.
 */

import { parseCellRef, parseRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { Formula, FormulaType } from "@aurochs-office/xlsx/domain/cell/formula";
import type { Cell, CellValue, ErrorValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxDateSystem } from "@aurochs-office/xlsx/domain/date-system";
import type { XlsxBorder, XlsxBorderEdge, XlsxBorderStyle } from "@aurochs-office/xlsx/domain/style/border";
import type { XlsxFill, XlsxGradientFill, XlsxGradientStop, XlsxPatternType } from "@aurochs-office/xlsx/domain/style/fill";
import type { XlsxColor, XlsxFont, UnderlineStyle } from "@aurochs-office/xlsx/domain/style/font";
import type { XlsxNumberFormat } from "@aurochs-office/xlsx/domain/style/number-format";
import type { XlsxAlignment, XlsxCellXf, XlsxProtection } from "@aurochs-office/xlsx/domain/style/types";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { rowIdx, colIdx, styleId, numFmtId, fontId, fillId, borderId } from "@aurochs-office/xlsx/domain/types";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow, XlsxColumnDef, XlsxDefinedName, XlsxSheetFormatPr } from "@aurochs-office/xlsx/domain/workbook";

// =============================================================================
// Build Spec Types (human-writable JSON schema)
// =============================================================================

export type XlsxBuildSpec = XlsxCreateSpec | XlsxModifySpec;

export type XlsxCreateSpec = {
  readonly mode: "create";
  readonly output: string;
  readonly workbook: WorkbookSpec;
};

export type XlsxModifySpec = {
  readonly mode: "modify";
  readonly template: string;
  readonly output: string;
  readonly modifications?: unknown;
};

export type WorkbookSpec = {
  readonly sheets: readonly SheetSpec[];
  readonly styles?: StyleSheetSpec;
  readonly definedNames?: readonly DefinedNameSpec[];
  readonly dateSystem?: "1900" | "1904";
};

export type SheetSpec = {
  readonly name: string;
  readonly state?: "visible" | "hidden" | "veryHidden";
  readonly columns?: readonly ColumnSpec[];
  readonly rows: readonly RowSpec[];
  readonly mergeCells?: readonly string[];
  readonly sheetFormatPr?: SheetFormatPrSpec;
};

export type SheetFormatPrSpec = {
  readonly defaultRowHeight?: number;
  readonly defaultColWidth?: number;
};

export type ColumnSpec = {
  readonly min: number;
  readonly max: number;
  readonly width?: number;
  readonly hidden?: boolean;
  readonly bestFit?: boolean;
  readonly styleId?: number;
};

export type RowSpec = {
  readonly row: number;
  readonly height?: number;
  readonly hidden?: boolean;
  readonly customHeight?: boolean;
  readonly styleId?: number;
  readonly cells: readonly CellSpec[];
};

export type CellSpec = {
  readonly ref: string;
  readonly value?: CellValueSpec;
  readonly formula?: FormulaSpec;
  readonly styleId?: number;
};

export type CellValueSpec =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "date"; readonly value: string }
  | { readonly type: "error"; readonly value: string }
  | { readonly type: "empty" }
  | string
  | number
  | boolean;

export type FormulaSpec = {
  readonly expression: string;
  readonly type?: FormulaType;
};

export type StyleSheetSpec = {
  readonly fonts?: readonly FontSpec[];
  readonly fills?: readonly FillSpec[];
  readonly borders?: readonly BorderSpec[];
  readonly numberFormats?: readonly NumberFormatSpec[];
  readonly cellXfs?: readonly CellXfSpec[];
};

export type FontSpec = {
  readonly name: string;
  readonly size: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly strikethrough?: boolean;
  readonly color?: ColorSpec;
  readonly family?: number;
  readonly scheme?: "major" | "minor" | "none";
};

export type ColorSpec =
  | { readonly type: "rgb"; readonly value: string }
  | { readonly type: "theme"; readonly theme: number; readonly tint?: number }
  | string;

export type FillSpec =
  | { readonly type: "none" }
  | { readonly type: "solid"; readonly color: ColorSpec }
  | { readonly type: "pattern"; readonly patternType: string; readonly fgColor?: ColorSpec; readonly bgColor?: ColorSpec }
  | { readonly type: "gradient"; readonly gradientType: "linear" | "path"; readonly degree?: number; readonly stops: readonly GradientStopSpec[] };

export type GradientStopSpec = {
  readonly position: number;
  readonly color: ColorSpec;
};

export type BorderSpec = {
  readonly left?: BorderEdgeSpec;
  readonly right?: BorderEdgeSpec;
  readonly top?: BorderEdgeSpec;
  readonly bottom?: BorderEdgeSpec;
  readonly diagonal?: BorderEdgeSpec;
  readonly diagonalUp?: boolean;
  readonly diagonalDown?: boolean;
};

export type BorderEdgeSpec = {
  readonly style: string;
  readonly color?: ColorSpec;
};

export type NumberFormatSpec = {
  readonly id: number;
  readonly formatCode: string;
};

export type CellXfSpec = {
  readonly numFmtId?: number;
  readonly fontId?: number;
  readonly fillId?: number;
  readonly borderId?: number;
  readonly alignment?: AlignmentSpec;
  readonly protection?: ProtectionSpec;
};

export type AlignmentSpec = {
  readonly horizontal?: XlsxAlignment["horizontal"];
  readonly vertical?: XlsxAlignment["vertical"];
  readonly wrapText?: boolean;
  readonly textRotation?: number;
  readonly indent?: number;
  readonly shrinkToFit?: boolean;
  readonly readingOrder?: number;
};

export type ProtectionSpec = {
  readonly locked?: boolean;
  readonly hidden?: boolean;
};

export type DefinedNameSpec = {
  readonly name: string;
  readonly formula: string;
  readonly localSheetId?: number;
  readonly hidden?: boolean;
};

// =============================================================================
// Converter: Spec → Domain
// =============================================================================

const VALID_ERROR_VALUES = new Set<string>([
  "#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#GETTING_DATA",
]);

function resolveColor(spec: ColorSpec): XlsxColor {
  if (typeof spec === "string") {
    const hex = spec.startsWith("#") ? spec.slice(1) : spec;
    const value = hex.length === 6 ? `FF${hex.toUpperCase()}` : hex.toUpperCase();
    return { type: "rgb", value };
  }
  if (spec.type === "theme") {
    return { type: "theme", theme: spec.theme, ...(spec.tint !== undefined ? { tint: spec.tint } : {}) };
  }
  return { type: "rgb", value: spec.value.toUpperCase() };
}

function resolveCellValue(spec: CellValueSpec): CellValue {
  if (typeof spec === "string") return { type: "string", value: spec };
  if (typeof spec === "number") return { type: "number", value: spec };
  if (typeof spec === "boolean") return { type: "boolean", value: spec };

  switch (spec.type) {
    case "string": return { type: "string", value: spec.value };
    case "number": return { type: "number", value: spec.value };
    case "boolean": return { type: "boolean", value: spec.value };
    case "date": return { type: "date", value: new Date(spec.value) };
    case "error": {
      if (!VALID_ERROR_VALUES.has(spec.value)) {
        throw new Error(`Invalid error value: ${spec.value}`);
      }
      return { type: "error", value: spec.value as ErrorValue };
    }
    case "empty": return { type: "empty" };
  }
}

function resolveFormula(spec: FormulaSpec): Formula {
  return {
    expression: spec.expression,
    type: spec.type ?? "normal",
  };
}

function resolveCell(spec: CellSpec): Cell {
  const address: CellAddress = parseCellRef(spec.ref);
  const value: CellValue = spec.value !== undefined ? resolveCellValue(spec.value) : { type: "empty" };
  const cell: Cell = {
    address,
    value,
    ...(spec.formula ? { formula: resolveFormula(spec.formula) } : {}),
    ...(spec.styleId !== undefined ? { styleId: styleId(spec.styleId) } : {}),
  };
  return cell;
}

function resolveRow(spec: RowSpec): XlsxRow {
  return {
    rowNumber: rowIdx(spec.row),
    cells: spec.cells.map(resolveCell),
    ...(spec.height !== undefined ? { height: spec.height } : {}),
    ...(spec.hidden !== undefined ? { hidden: spec.hidden } : {}),
    ...(spec.customHeight !== undefined ? { customHeight: spec.customHeight } : {}),
    ...(spec.styleId !== undefined ? { styleId: styleId(spec.styleId) } : {}),
  };
}

function resolveColumn(spec: ColumnSpec): XlsxColumnDef {
  return {
    min: colIdx(spec.min),
    max: colIdx(spec.max),
    ...(spec.width !== undefined ? { width: spec.width } : {}),
    ...(spec.hidden !== undefined ? { hidden: spec.hidden } : {}),
    ...(spec.bestFit !== undefined ? { bestFit: spec.bestFit } : {}),
    ...(spec.styleId !== undefined ? { styleId: styleId(spec.styleId) } : {}),
  };
}

function resolveFont(spec: FontSpec): XlsxFont {
  return {
    name: spec.name,
    size: spec.size,
    ...(spec.bold !== undefined ? { bold: spec.bold } : {}),
    ...(spec.italic !== undefined ? { italic: spec.italic } : {}),
    ...(spec.underline !== undefined ? { underline: spec.underline } : {}),
    ...(spec.strikethrough !== undefined ? { strikethrough: spec.strikethrough } : {}),
    ...(spec.color !== undefined ? { color: resolveColor(spec.color) } : {}),
    ...(spec.family !== undefined ? { family: spec.family } : {}),
    ...(spec.scheme !== undefined ? { scheme: spec.scheme } : {}),
  };
}

function resolveFill(spec: FillSpec): XlsxFill {
  switch (spec.type) {
    case "none":
      return { type: "none" };
    case "solid":
      return {
        type: "pattern",
        pattern: { patternType: "solid" as XlsxPatternType, fgColor: resolveColor(spec.color) },
      };
    case "pattern":
      return {
        type: "pattern",
        pattern: {
          patternType: spec.patternType as XlsxPatternType,
          ...(spec.fgColor !== undefined ? { fgColor: resolveColor(spec.fgColor) } : {}),
          ...(spec.bgColor !== undefined ? { bgColor: resolveColor(spec.bgColor) } : {}),
        },
      };
    case "gradient": {
      const gradient: XlsxGradientFill = {
        gradientType: spec.gradientType,
        ...(spec.degree !== undefined ? { degree: spec.degree } : {}),
        stops: spec.stops.map((s): XlsxGradientStop => ({
          position: s.position,
          color: resolveColor(s.color),
        })),
      };
      return { type: "gradient", gradient };
    }
  }
}

function resolveBorderEdge(spec: BorderEdgeSpec): XlsxBorderEdge {
  return {
    style: spec.style as XlsxBorderStyle,
    ...(spec.color !== undefined ? { color: resolveColor(spec.color) } : {}),
  };
}

function resolveBorder(spec: BorderSpec): XlsxBorder {
  return {
    ...(spec.left ? { left: resolveBorderEdge(spec.left) } : {}),
    ...(spec.right ? { right: resolveBorderEdge(spec.right) } : {}),
    ...(spec.top ? { top: resolveBorderEdge(spec.top) } : {}),
    ...(spec.bottom ? { bottom: resolveBorderEdge(spec.bottom) } : {}),
    ...(spec.diagonal ? { diagonal: resolveBorderEdge(spec.diagonal) } : {}),
    ...(spec.diagonalUp !== undefined ? { diagonalUp: spec.diagonalUp } : {}),
    ...(spec.diagonalDown !== undefined ? { diagonalDown: spec.diagonalDown } : {}),
  };
}

function resolveCellXf(spec: CellXfSpec): XlsxCellXf {
  const alignment: XlsxAlignment | undefined = spec.alignment ? {
    ...(spec.alignment.horizontal !== undefined ? { horizontal: spec.alignment.horizontal } : {}),
    ...(spec.alignment.vertical !== undefined ? { vertical: spec.alignment.vertical } : {}),
    ...(spec.alignment.wrapText !== undefined ? { wrapText: spec.alignment.wrapText } : {}),
    ...(spec.alignment.textRotation !== undefined ? { textRotation: spec.alignment.textRotation } : {}),
    ...(spec.alignment.indent !== undefined ? { indent: spec.alignment.indent } : {}),
    ...(spec.alignment.shrinkToFit !== undefined ? { shrinkToFit: spec.alignment.shrinkToFit } : {}),
    ...(spec.alignment.readingOrder !== undefined ? { readingOrder: spec.alignment.readingOrder } : {}),
  } : undefined;

  const protection: XlsxProtection | undefined = spec.protection ? {
    ...(spec.protection.locked !== undefined ? { locked: spec.protection.locked } : {}),
    ...(spec.protection.hidden !== undefined ? { hidden: spec.protection.hidden } : {}),
  } : undefined;

  return {
    numFmtId: numFmtId(spec.numFmtId ?? 0),
    fontId: fontId(spec.fontId ?? 0),
    fillId: fillId(spec.fillId ?? 0),
    borderId: borderId(spec.borderId ?? 0),
    ...(alignment ? { alignment, applyAlignment: true } : {}),
    ...(protection ? { protection, applyProtection: true } : {}),
    ...(spec.numFmtId !== undefined && spec.numFmtId !== 0 ? { applyNumberFormat: true } : {}),
    ...(spec.fontId !== undefined && spec.fontId !== 0 ? { applyFont: true } : {}),
    ...(spec.fillId !== undefined && spec.fillId !== 0 ? { applyFill: true } : {}),
    ...(spec.borderId !== undefined && spec.borderId !== 0 ? { applyBorder: true } : {}),
  };
}

function resolveSheet(spec: SheetSpec, index: number, dateSystem: XlsxDateSystem): XlsxWorksheet {
  const sheetFormatPr: XlsxSheetFormatPr | undefined = spec.sheetFormatPr ? {
    ...(spec.sheetFormatPr.defaultRowHeight !== undefined ? { defaultRowHeight: spec.sheetFormatPr.defaultRowHeight } : {}),
    ...(spec.sheetFormatPr.defaultColWidth !== undefined ? { defaultColWidth: spec.sheetFormatPr.defaultColWidth } : {}),
  } : undefined;

  return {
    dateSystem,
    name: spec.name,
    sheetId: index + 1,
    state: spec.state ?? "visible",
    rows: spec.rows.map(resolveRow),
    ...(spec.columns ? { columns: spec.columns.map(resolveColumn) } : {}),
    ...(spec.mergeCells ? { mergeCells: spec.mergeCells.map(parseRange) } : {}),
    ...(sheetFormatPr ? { sheetFormatPr } : {}),
    xmlPath: `xl/worksheets/sheet${index + 1}.xml`,
  };
}

/**
 * Convert a human-writable WorkbookSpec into an XlsxWorkbook domain object.
 */
export function convertSpecToWorkbook(spec: WorkbookSpec): XlsxWorkbook {
  const dateSystem: XlsxDateSystem = spec.dateSystem ?? "1900";

  // Build stylesheet
  const defaults = createDefaultStyleSheet();
  const customStyles = spec.styles;

  const fonts: XlsxFont[] = [...defaults.fonts];
  const fills: XlsxFill[] = [...defaults.fills];
  const borders: XlsxBorder[] = [...defaults.borders];
  const numberFormats: XlsxNumberFormat[] = [];
  const cellXfs: XlsxCellXf[] = [...defaults.cellXfs];

  if (customStyles) {
    if (customStyles.fonts) {
      for (const f of customStyles.fonts) {
        fonts.push(resolveFont(f));
      }
    }
    if (customStyles.fills) {
      for (const f of customStyles.fills) {
        fills.push(resolveFill(f));
      }
    }
    if (customStyles.borders) {
      for (const b of customStyles.borders) {
        borders.push(resolveBorder(b));
      }
    }
    if (customStyles.numberFormats) {
      for (const nf of customStyles.numberFormats) {
        numberFormats.push({ numFmtId: numFmtId(nf.id), formatCode: nf.formatCode });
      }
    }
    if (customStyles.cellXfs) {
      for (const xf of customStyles.cellXfs) {
        cellXfs.push(resolveCellXf(xf));
      }
    }
  }

  const styles = {
    ...defaults,
    fonts,
    fills,
    borders,
    numberFormats,
    cellXfs,
  };

  // Collect all shared strings for the sharedStrings field
  const sharedStringSet = new Set<string>();
  for (const sheetSpec of spec.sheets) {
    for (const rowSpec of sheetSpec.rows) {
      for (const cellSpec of rowSpec.cells) {
        if (cellSpec.value !== undefined) {
          if (typeof cellSpec.value === "string") {
            sharedStringSet.add(cellSpec.value);
          } else if (typeof cellSpec.value === "object" && cellSpec.value.type === "string") {
            sharedStringSet.add(cellSpec.value.value);
          }
        }
      }
    }
  }

  const sheets = spec.sheets.map((s, i) => resolveSheet(s, i, dateSystem));

  const definedNames: XlsxDefinedName[] | undefined = spec.definedNames?.map((dn) => ({
    name: dn.name,
    formula: dn.formula,
    ...(dn.localSheetId !== undefined ? { localSheetId: dn.localSheetId } : {}),
    ...(dn.hidden !== undefined ? { hidden: dn.hidden } : {}),
  }));

  return {
    dateSystem,
    sheets,
    styles,
    sharedStrings: [...sharedStringSet],
    ...(definedNames ? { definedNames } : {}),
  };
}

/**
 * Type guard: check if a spec is a create-mode spec.
 */
export function isCreateSpec(spec: XlsxBuildSpec): spec is XlsxCreateSpec {
  return (spec as XlsxCreateSpec).mode === "create";
}
