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

// Legacy modify types (backward compat)
export type CellModification = {
  readonly col: string;
  readonly row: number;
  readonly value: string | number;
};

export type SheetModification = {
  readonly sheetName: string;
  readonly cells: readonly CellModification[];
  readonly dimension?: string;
};

// New comprehensive modification spec types

export type ConditionalFormattingSpec = {
  readonly sqref: string;
  readonly rules: readonly ConditionalFormattingRuleSpec[];
};

export type ConditionalFormattingRuleSpec = {
  readonly type: string;
  readonly priority?: number;
  readonly operator?: string;
  readonly dxfId?: number;
  readonly stopIfTrue?: boolean;
  readonly formulas?: readonly string[];
  readonly text?: string;
  readonly timePeriod?: string;
  readonly rank?: number;
  readonly percent?: boolean;
  readonly bottom?: boolean;
  readonly stdDev?: number;
  readonly equalAverage?: boolean;
  readonly aboveAverage?: boolean;
  // Color scale
  readonly cfvo?: readonly CfvoSpec[];
  readonly colors?: readonly ColorSpec[];
  // Data bar
  readonly color?: ColorSpec;
  readonly showValue?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly gradient?: boolean;
  // Icon set
  readonly iconSet?: string;
  readonly reverse?: boolean;
  readonly iconOnly?: boolean;
};

export type CfvoSpec = {
  readonly type: string;
  readonly val?: string;
  readonly gte?: boolean;
};

export type DataValidationSpec = {
  readonly sqref: string;
  readonly type?: string;
  readonly operator?: string;
  readonly allowBlank?: boolean;
  readonly showInputMessage?: boolean;
  readonly showErrorMessage?: boolean;
  readonly showDropDown?: boolean;
  readonly errorStyle?: string;
  readonly promptTitle?: string;
  readonly prompt?: string;
  readonly errorTitle?: string;
  readonly error?: string;
  readonly formula1?: string;
  readonly formula2?: string;
};

export type HyperlinkSpec = {
  readonly ref: string;
  readonly target?: string;
  readonly display?: string;
  readonly location?: string;
  readonly tooltip?: string;
};

export type AutoFilterSpec = {
  readonly ref: string;
};

export type PageSetupSpec = {
  readonly paperSize?: number;
  readonly orientation?: "default" | "portrait" | "landscape";
  readonly scale?: number;
  readonly fitToWidth?: number;
  readonly fitToHeight?: number;
  readonly firstPageNumber?: number;
  readonly useFirstPageNumber?: boolean;
  readonly blackAndWhite?: boolean;
  readonly draft?: boolean;
  readonly cellComments?: "none" | "asDisplayed" | "atEnd";
  readonly pageOrder?: "downThenOver" | "overThenDown";
  readonly horizontalDpi?: number;
  readonly verticalDpi?: number;
  readonly copies?: number;
};

export type PageMarginsSpec = {
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
  readonly header?: number;
  readonly footer?: number;
};

export type HeaderFooterSpec = {
  readonly oddHeader?: string;
  readonly oddFooter?: string;
  readonly evenHeader?: string;
  readonly evenFooter?: string;
  readonly firstHeader?: string;
  readonly firstFooter?: string;
  readonly differentOddEven?: boolean;
  readonly differentFirst?: boolean;
  readonly scaleWithDoc?: boolean;
  readonly alignWithMargins?: boolean;
};

export type PrintOptionsSpec = {
  readonly gridLines?: boolean;
  readonly headings?: boolean;
  readonly gridLinesSet?: boolean;
  readonly horizontalCentered?: boolean;
  readonly verticalCentered?: boolean;
};

export type SheetProtectionSpec = {
  readonly sheet?: boolean;
  readonly objects?: boolean;
  readonly scenarios?: boolean;
  readonly formatCells?: boolean;
  readonly formatColumns?: boolean;
  readonly formatRows?: boolean;
  readonly insertColumns?: boolean;
  readonly insertRows?: boolean;
  readonly insertHyperlinks?: boolean;
  readonly deleteColumns?: boolean;
  readonly deleteRows?: boolean;
  readonly selectLockedCells?: boolean;
  readonly sort?: boolean;
  readonly autoFilter?: boolean;
  readonly pivotTables?: boolean;
  readonly selectUnlockedCells?: boolean;
  readonly password?: string;
  readonly algorithmName?: string;
  readonly hashValue?: string;
  readonly saltValue?: string;
  readonly spinCount?: number;
};

export type SheetViewSpec = {
  readonly tabSelected?: boolean;
  readonly showGridLines?: boolean;
  readonly showRowColHeaders?: boolean;
  readonly zoomScale?: number;
  readonly freeze?: { readonly row?: number; readonly col?: number };
};

export type RowModificationSpec = {
  readonly row: number;
  readonly height?: number;
  readonly hidden?: boolean;
  readonly customHeight?: boolean;
  readonly styleId?: number;
};

export type PageBreakSpec = {
  readonly id: number;
  readonly max?: number;
  readonly min?: number;
  readonly manual?: boolean;
};

export type SheetModificationSpec = {
  readonly name: string;
  readonly rename?: string;
  readonly state?: "visible" | "hidden" | "veryHidden";
  readonly tabColor?: ColorSpec;
  readonly cells?: readonly CellSpec[];
  readonly rows?: readonly RowModificationSpec[];
  readonly removeRows?: readonly number[];
  readonly columns?: readonly ColumnSpec[];
  readonly removeColumns?: readonly number[];
  readonly addMergeCells?: readonly string[];
  readonly removeMergeCells?: readonly string[];
  readonly conditionalFormattings?: readonly ConditionalFormattingSpec[];
  readonly dataValidations?: readonly DataValidationSpec[];
  readonly hyperlinks?: readonly HyperlinkSpec[];
  readonly autoFilter?: AutoFilterSpec | null;
  readonly pageSetup?: PageSetupSpec;
  readonly pageMargins?: PageMarginsSpec;
  readonly headerFooter?: HeaderFooterSpec;
  readonly printOptions?: PrintOptionsSpec;
  readonly sheetProtection?: SheetProtectionSpec | null;
  readonly sheetFormatPr?: SheetFormatPrSpec;
  readonly sheetView?: SheetViewSpec;
  readonly rowBreaks?: readonly PageBreakSpec[];
  readonly colBreaks?: readonly PageBreakSpec[];
};

export type ModificationSpec = {
  readonly sheets?: readonly SheetModificationSpec[];
  readonly styles?: StyleSheetSpec;
  readonly definedNames?: readonly DefinedNameSpec[];
  readonly addSheets?: readonly SheetSpec[];
  readonly removeSheets?: readonly string[];
};

export type XlsxModifySpec = {
  readonly mode: "modify";
  readonly template: string;
  readonly output: string;
  readonly modifications?: readonly SheetModification[];
  readonly modify?: ModificationSpec;
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






/** Resolve a color spec to a domain XlsxColor. */
export function resolveColor(spec: ColorSpec): XlsxColor {
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
  if (typeof spec === "string") {return { type: "string", value: spec };}
  if (typeof spec === "number") {return { type: "number", value: spec };}
  if (typeof spec === "boolean") {return { type: "boolean", value: spec };}

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






/** Resolve a cell spec to a domain Cell. */
export function resolveCell(spec: CellSpec): Cell {
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






/** Resolve a row spec to a domain XlsxRow. */
export function resolveRow(spec: RowSpec): XlsxRow {
  return {
    rowNumber: rowIdx(spec.row),
    cells: spec.cells.map(resolveCell),
    ...(spec.height !== undefined ? { height: spec.height } : {}),
    ...(spec.hidden !== undefined ? { hidden: spec.hidden } : {}),
    ...(spec.customHeight !== undefined ? { customHeight: spec.customHeight } : {}),
    ...(spec.styleId !== undefined ? { styleId: styleId(spec.styleId) } : {}),
  };
}






/** Resolve a column spec to a domain XlsxColumnDef. */
export function resolveColumn(spec: ColumnSpec): XlsxColumnDef {
  return {
    min: colIdx(spec.min),
    max: colIdx(spec.max),
    ...(spec.width !== undefined ? { width: spec.width } : {}),
    ...(spec.hidden !== undefined ? { hidden: spec.hidden } : {}),
    ...(spec.bestFit !== undefined ? { bestFit: spec.bestFit } : {}),
    ...(spec.styleId !== undefined ? { styleId: styleId(spec.styleId) } : {}),
  };
}






/** Resolve a font spec to a domain XlsxFont. */
export function resolveFont(spec: FontSpec): XlsxFont {
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






/** Resolve a fill spec to a domain XlsxFill. */
export function resolveFill(spec: FillSpec): XlsxFill {
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






/** Resolve a border spec to a domain XlsxBorder. */
export function resolveBorder(spec: BorderSpec): XlsxBorder {
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






function resolveAlignmentSpec(spec: NonNullable<CellXfSpec["alignment"]>): XlsxAlignment {
  return {
    ...(spec.horizontal !== undefined ? { horizontal: spec.horizontal } : {}),
    ...(spec.vertical !== undefined ? { vertical: spec.vertical } : {}),
    ...(spec.wrapText !== undefined ? { wrapText: spec.wrapText } : {}),
    ...(spec.textRotation !== undefined ? { textRotation: spec.textRotation } : {}),
    ...(spec.indent !== undefined ? { indent: spec.indent } : {}),
    ...(spec.shrinkToFit !== undefined ? { shrinkToFit: spec.shrinkToFit } : {}),
    ...(spec.readingOrder !== undefined ? { readingOrder: spec.readingOrder } : {}),
  };
}

function resolveProtectionSpec(spec: NonNullable<CellXfSpec["protection"]>): XlsxProtection {
  return {
    ...(spec.locked !== undefined ? { locked: spec.locked } : {}),
    ...(spec.hidden !== undefined ? { hidden: spec.hidden } : {}),
  };
}

/** Resolve a cell style format spec to a domain XlsxCellXf. */
export function resolveCellXf(spec: CellXfSpec): XlsxCellXf {
  const alignment = spec.alignment ? resolveAlignmentSpec(spec.alignment) : undefined;
  const protection = spec.protection ? resolveProtectionSpec(spec.protection) : undefined;

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






function resolveSheetFormatPrSpec(spec: NonNullable<SheetSpec["sheetFormatPr"]>): XlsxSheetFormatPr {
  return {
    ...(spec.defaultRowHeight !== undefined ? { defaultRowHeight: spec.defaultRowHeight } : {}),
    ...(spec.defaultColWidth !== undefined ? { defaultColWidth: spec.defaultColWidth } : {}),
  };
}

/** Resolve a sheet spec to a domain XlsxWorksheet. */
export function resolveSheet(spec: SheetSpec, index: number, dateSystem: XlsxDateSystem): XlsxWorksheet {
  const sheetFormatPr = spec.sheetFormatPr ? resolveSheetFormatPrSpec(spec.sheetFormatPr) : undefined;

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
