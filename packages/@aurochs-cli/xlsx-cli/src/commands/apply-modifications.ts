/**
 * @file Apply Modifications Engine
 *
 * Applies comprehensive modifications to an XlsxWorkbook domain object.
 * All operations are immutable — returns new objects.
 */

import { parseRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { CellRange, CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";
import type {
  XlsxConditionalFormatting,
  XlsxConditionalFormattingRule,
  XlsxCfvo,
  XlsxCfvoType,
  XlsxStandardRule,
  XlsxColorScaleRule,
  XlsxDataBarRule,
  XlsxIconSetRule,
  XlsxIconSetName,
} from "@aurochs-office/xlsx/domain/conditional-formatting";
import type { XlsxDataValidation, XlsxDataValidationType, XlsxDataValidationOperator, XlsxDataValidationErrorStyle } from "@aurochs-office/xlsx/domain/data-validation";
import type { XlsxHyperlink } from "@aurochs-office/xlsx/domain/hyperlink";
import type { XlsxPageSetup, XlsxPageMargins, XlsxHeaderFooter, XlsxPrintOptions } from "@aurochs-office/xlsx/domain/page-setup";
import type { XlsxPageBreak } from "@aurochs-office/xlsx/domain/page-breaks";
import type { XlsxSheetProtection } from "@aurochs-office/xlsx/domain/protection";
import type {
  XlsxWorkbook,
  XlsxWorksheet,
  XlsxRow,
  XlsxColumnDef,
  XlsxDefinedName,
  XlsxSheetView,
  XlsxPane,
} from "@aurochs-office/xlsx/domain/workbook";
import { rowIdx, styleId, numFmtId } from "@aurochs-office/xlsx/domain/types";
import {
  resolveColor,
  resolveCell,
  resolveColumn,
  resolveSheet,
  resolveFont,
  resolveFill,
  resolveBorder,
  resolveCellXf,
  type ModificationSpec,
  type SheetModificationSpec,
  type ConditionalFormattingSpec,
  type ConditionalFormattingRuleSpec,
  type CfvoSpec,
  type DataValidationSpec,
  type HyperlinkSpec,
  type AutoFilterSpec,
  type PageSetupSpec,
  type PageMarginsSpec,
  type HeaderFooterSpec,
  type PrintOptionsSpec,
  type SheetProtectionSpec,
  type SheetViewSpec,
  type PageBreakSpec,
} from "./build-spec";

// =============================================================================
// Feature Resolvers: Spec → Domain
// =============================================================================

function resolveConditionalFormattingRule(spec: ConditionalFormattingRuleSpec): XlsxConditionalFormattingRule {
  const ruleType = spec.type;

  if (ruleType === "colorScale" && spec.cfvo && spec.colors) {
    const rule: XlsxColorScaleRule = {
      type: "colorScale",
      ...(spec.priority !== undefined ? { priority: spec.priority } : {}),
      ...(spec.stopIfTrue ? { stopIfTrue: spec.stopIfTrue } : {}),
      cfvo: spec.cfvo.map(resolveCfvo),
      colors: spec.colors.map(resolveColor),
    };
    return rule;
  }

  if (ruleType === "dataBar" && spec.cfvo) {
    const rule: XlsxDataBarRule = {
      type: "dataBar",
      ...(spec.priority !== undefined ? { priority: spec.priority } : {}),
      ...(spec.stopIfTrue ? { stopIfTrue: spec.stopIfTrue } : {}),
      cfvo: spec.cfvo.map(resolveCfvo),
      ...(spec.color ? { color: resolveColor(spec.color) } : {}),
      ...(spec.showValue !== undefined ? { showValue: spec.showValue } : {}),
      ...(spec.minLength !== undefined ? { minLength: spec.minLength } : {}),
      ...(spec.maxLength !== undefined ? { maxLength: spec.maxLength } : {}),
      ...(spec.gradient !== undefined ? { gradient: spec.gradient } : {}),
    };
    return rule;
  }

  if (ruleType === "iconSet" && spec.cfvo && spec.iconSet) {
    const rule: XlsxIconSetRule = {
      type: "iconSet",
      ...(spec.priority !== undefined ? { priority: spec.priority } : {}),
      ...(spec.stopIfTrue ? { stopIfTrue: spec.stopIfTrue } : {}),
      iconSet: spec.iconSet as XlsxIconSetName,
      cfvo: spec.cfvo.map(resolveCfvo),
      ...(spec.showValue !== undefined ? { showValue: spec.showValue } : {}),
      ...(spec.reverse !== undefined ? { reverse: spec.reverse } : {}),
      ...(spec.iconOnly !== undefined ? { iconOnly: spec.iconOnly } : {}),
    };
    return rule;
  }

  // Standard rule
  const rule: XlsxStandardRule = {
    type: ruleType as XlsxStandardRule["type"],
    ...(spec.dxfId !== undefined ? { dxfId: spec.dxfId } : {}),
    ...(spec.priority !== undefined ? { priority: spec.priority } : {}),
    ...(spec.operator ? { operator: spec.operator } : {}),
    ...(spec.stopIfTrue ? { stopIfTrue: spec.stopIfTrue } : {}),
    formulas: spec.formulas ?? [],
    ...(spec.text ? { text: spec.text } : {}),
    ...(spec.timePeriod ? { timePeriod: spec.timePeriod } : {}),
    ...(spec.rank !== undefined ? { rank: spec.rank } : {}),
    ...(spec.percent !== undefined ? { percent: spec.percent } : {}),
    ...(spec.bottom !== undefined ? { bottom: spec.bottom } : {}),
    ...(spec.stdDev !== undefined ? { stdDev: spec.stdDev } : {}),
    ...(spec.equalAverage !== undefined ? { equalAverage: spec.equalAverage } : {}),
    ...(spec.aboveAverage !== undefined ? { aboveAverage: spec.aboveAverage } : {}),
  };
  return rule;
}

function resolveCfvo(spec: CfvoSpec): XlsxCfvo {
  return {
    type: spec.type as XlsxCfvoType,
    ...(spec.val !== undefined ? { val: spec.val } : {}),
    ...(spec.gte !== undefined ? { gte: spec.gte } : {}),
  };
}

function resolveConditionalFormatting(spec: ConditionalFormattingSpec): XlsxConditionalFormatting {
  return {
    sqref: spec.sqref,
    ranges: parseSqrefRanges(spec.sqref),
    rules: spec.rules.map(resolveConditionalFormattingRule),
  };
}

function parseSqrefRanges(sqref: string): readonly CellRange[] {
  return sqref.split(/\s+/).map(parseRange);
}

function resolveDataValidation(spec: DataValidationSpec): XlsxDataValidation {
  return {
    sqref: spec.sqref,
    ranges: parseSqrefRanges(spec.sqref),
    ...(spec.type ? { type: spec.type as XlsxDataValidationType } : {}),
    ...(spec.operator ? { operator: spec.operator as XlsxDataValidationOperator } : {}),
    ...(spec.allowBlank !== undefined ? { allowBlank: spec.allowBlank } : {}),
    ...(spec.showInputMessage !== undefined ? { showInputMessage: spec.showInputMessage } : {}),
    ...(spec.showErrorMessage !== undefined ? { showErrorMessage: spec.showErrorMessage } : {}),
    ...(spec.showDropDown !== undefined ? { showDropDown: spec.showDropDown } : {}),
    ...(spec.errorStyle ? { errorStyle: spec.errorStyle as XlsxDataValidationErrorStyle } : {}),
    ...(spec.promptTitle ? { promptTitle: spec.promptTitle } : {}),
    ...(spec.prompt ? { prompt: spec.prompt } : {}),
    ...(spec.errorTitle ? { errorTitle: spec.errorTitle } : {}),
    ...(spec.error ? { error: spec.error } : {}),
    ...(spec.formula1 !== undefined ? { formula1: spec.formula1 } : {}),
    ...(spec.formula2 !== undefined ? { formula2: spec.formula2 } : {}),
  };
}

function resolveHyperlink(spec: HyperlinkSpec, nextRelId: () => string): XlsxHyperlink {
  const ref = parseRange(spec.ref);
  const isExternal = spec.target && (spec.target.startsWith("http://") || spec.target.startsWith("https://") || spec.target.startsWith("mailto:"));
  return {
    ref,
    ...(isExternal ? { relationshipId: nextRelId(), target: spec.target, targetMode: "External" as const } : {}),
    ...(spec.display ? { display: spec.display } : {}),
    ...(spec.location ? { location: spec.location } : {}),
    ...(spec.tooltip ? { tooltip: spec.tooltip } : {}),
  };
}

function resolveAutoFilter(spec: AutoFilterSpec): XlsxAutoFilter {
  return { ref: parseRange(spec.ref) };
}

function resolvePageSetup(spec: PageSetupSpec): XlsxPageSetup {
  return { ...spec };
}

function resolvePageMargins(spec: PageMarginsSpec): XlsxPageMargins {
  return { ...spec };
}

function resolveHeaderFooter(spec: HeaderFooterSpec): XlsxHeaderFooter {
  return { ...spec };
}

function resolvePrintOptions(spec: PrintOptionsSpec): XlsxPrintOptions {
  return { ...spec };
}

function resolveSheetProtection(spec: SheetProtectionSpec): XlsxSheetProtection {
  return { ...spec };
}

function buildFreezePane(freeze: { row?: number; col?: number }): XlsxPane | undefined {
  if (!freeze.row && !freeze.col) {
    return undefined;
  }
  return {
    ...(freeze.col ? { xSplit: freeze.col } : {}),
    ...(freeze.row ? { ySplit: freeze.row } : {}),
    topLeftCell: `${colLetter(freeze.col ?? 0)}${(freeze.row ?? 0) + 1}`,
    activePane: "bottomRight" as const,
    state: "frozen" as const,
  };
}

function resolveSheetView(spec: SheetViewSpec): XlsxSheetView {
  const pane = spec.freeze ? buildFreezePane(spec.freeze) : undefined;

  return {
    ...(spec.tabSelected !== undefined ? { tabSelected: spec.tabSelected } : {}),
    ...(spec.showGridLines !== undefined ? { showGridLines: spec.showGridLines } : {}),
    ...(spec.showRowColHeaders !== undefined ? { showRowColHeaders: spec.showRowColHeaders } : {}),
    ...(spec.zoomScale !== undefined ? { zoomScale: spec.zoomScale } : {}),
    ...(pane ? { pane } : {}),
  };
}

function colLetterRec(n: number): string {
  if (n <= 0) {return "";}
  const remainder = (n - 1) % 26;
  return colLetterRec(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + remainder);
}

function colLetter(colIndex: number): string {
  if (colIndex <= 0) {return "A";}
  return colLetterRec(colIndex) || "A";
}

function resolvePageBreak(spec: PageBreakSpec): XlsxPageBreak {
  return {
    id: spec.id,
    ...(spec.max !== undefined ? { max: spec.max } : {}),
    ...(spec.min !== undefined ? { min: spec.min } : {}),
    ...(spec.manual !== undefined ? { manual: spec.manual } : {}),
  };
}

// =============================================================================
// Cell Merging
// =============================================================================

function cellKey(addr: CellAddress): string {
  return `${addr.col}:${addr.row}`;
}

function mergeCellsIntoRows(existingRows: readonly XlsxRow[], newCells: readonly Cell[]): XlsxRow[] {
  // Build a map of existing rows by row number
  const rowMap = new Map<number, XlsxRow>();
  for (const row of existingRows) {
    rowMap.set(row.rowNumber as number, row);
  }

  // Group new cells by row
  const cellsByRow = new Map<number, Cell[]>();
  for (const cell of newCells) {
    const r = cell.address.row as number;
    if (!cellsByRow.has(r)) {cellsByRow.set(r, []);}
    cellsByRow.get(r)!.push(cell);
  }

  // Merge
  for (const [rowNum, cells] of cellsByRow) {
    const existingRow = rowMap.get(rowNum);
    if (existingRow) {
      // Merge cells into existing row
      const existingCells = new Map<string, Cell>();
      for (const c of existingRow.cells) {
        existingCells.set(cellKey(c.address), c);
      }
      for (const c of cells) {
        existingCells.set(cellKey(c.address), c);
      }
      rowMap.set(rowNum, { ...existingRow, cells: [...existingCells.values()] });
    } else {
      // Create new row
      rowMap.set(rowNum, { rowNumber: rowIdx(rowNum), cells });
    }
  }

  // Sort by row number
  return [...rowMap.values()].sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
}

// =============================================================================
// Shared Strings Rebuild
// =============================================================================

function rebuildSharedStrings(sheets: readonly XlsxWorksheet[]): string[] {
  const set = new Set<string>();
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        if (cell.value.type === "string") {
          set.add(cell.value.value);
        }
      }
    }
  }
  return [...set];
}

// =============================================================================
// Per-Sheet Modification
// =============================================================================

function applyCellsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.cells || mod.cells.length === 0) {return sheet;}
  return { ...sheet, rows: mergeCellsIntoRows(sheet.rows, mod.cells.map(resolveCell)) };
}

function applyRowPropsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.rows || mod.rows.length === 0) {return sheet;}
  return { ...sheet, rows: mergeRowProperties(sheet.rows, mod.rows) };
}

function applyRemoveRowsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.removeRows || mod.removeRows.length === 0) {return sheet;}
  const removeSet = new Set(mod.removeRows);
  return { ...sheet, rows: sheet.rows.filter((r) => !removeSet.has(r.rowNumber as number)) };
}

function applyRowMods(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  return applyRemoveRowsMod(applyRowPropsMod(applyCellsMod(sheet, mod), mod), mod);
}

function mergeRowProperties(existing: readonly XlsxRow[], mods: readonly { row: number; height?: number; hidden?: boolean; customHeight?: boolean; styleId?: number }[]): XlsxRow[] {
  const rowMap = new Map<number, XlsxRow>();
  for (const row of existing) {
    rowMap.set(row.rowNumber as number, row);
  }
  for (const rowMod of mods) {
    const rowProps = {
      ...(rowMod.height !== undefined ? { height: rowMod.height } : {}),
      ...(rowMod.hidden !== undefined ? { hidden: rowMod.hidden } : {}),
      ...(rowMod.customHeight !== undefined ? { customHeight: rowMod.customHeight } : {}),
      ...(rowMod.styleId !== undefined ? { styleId: styleId(rowMod.styleId) } : {}),
    };
    const base = rowMap.get(rowMod.row);
    rowMap.set(rowMod.row, base ? { ...base, ...rowProps } : { rowNumber: rowIdx(rowMod.row), cells: [], ...rowProps });
  }
  return [...rowMap.values()].sort((a, b) => (a.rowNumber as number) - (b.rowNumber as number));
}

function applyColumnsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.columns || mod.columns.length === 0) {return sheet;}
  return { ...sheet, columns: mergeColumns(sheet.columns ?? [], mod.columns) };
}

function applyRemoveColumnsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.removeColumns || mod.removeColumns.length === 0 || !sheet.columns) {return sheet;}
  const removeSet = new Set(mod.removeColumns);
  return { ...sheet, columns: sheet.columns.filter((c) => !removeSet.has(c.min as number)) };
}

function applyColumnMods(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  return applyRemoveColumnsMod(applyColumnsMod(sheet, mod), mod);
}

function mergeColumns(existing: readonly XlsxColumnDef[], specs: readonly { min: number; max: number; width?: number; hidden?: boolean; bestFit?: boolean; styleId?: number }[]): XlsxColumnDef[] {
  const colMap = new Map<number, XlsxColumnDef>();
  for (const col of existing) {
    colMap.set(col.min as number, col);
  }
  for (const colSpec of specs) {
    colMap.set(colSpec.min, resolveColumn(colSpec));
  }
  return [...colMap.values()].sort((a, b) => (a.min as number) - (b.min as number));
}

function applyAddMergeMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.addMergeCells || mod.addMergeCells.length === 0) {return sheet;}
  const existing = sheet.mergeCells ?? [];
  return { ...sheet, mergeCells: [...existing, ...mod.addMergeCells.map(parseRange)] };
}

function applyRemoveMergeMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (!mod.removeMergeCells || mod.removeMergeCells.length === 0 || !sheet.mergeCells) {return sheet;}
  const removeSet = new Set(mod.removeMergeCells);
  return { ...sheet, mergeCells: sheet.mergeCells.filter((mc) => !removeSet.has(rangeToString(mc))) };
}

function applyMergeMods(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  return applyRemoveMergeMod(applyAddMergeMod(sheet, mod), mod);
}

function resolveHyperlinks(specs: readonly HyperlinkSpec[]): XlsxHyperlink[] {
  const counter = { value: 0 };
  const nextRelId = () => `rId${++counter.value}`;
  return specs.map((h) => resolveHyperlink(h, nextRelId));
}

function clearAutoFilter(sheet: XlsxWorksheet): XlsxWorksheet {
  const { autoFilter: _, ...rest } = sheet;
  return rest as XlsxWorksheet;
}

function clearSheetProtection(sheet: XlsxWorksheet): XlsxWorksheet {
  const { sheetProtection: _, ...rest } = sheet;
  return rest as XlsxWorksheet;
}

function applyConditionalFormattingsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.conditionalFormattings === undefined) {return sheet;}
  return { ...sheet, conditionalFormattings: mod.conditionalFormattings.map(resolveConditionalFormatting) };
}

function applyDataValidationsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.dataValidations === undefined) {return sheet;}
  return { ...sheet, dataValidations: mod.dataValidations.map(resolveDataValidation) };
}

function applyHyperlinksMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.hyperlinks === undefined) {return sheet;}
  return { ...sheet, hyperlinks: resolveHyperlinks(mod.hyperlinks) };
}

function applyPageSetupMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.pageSetup === undefined) {return sheet;}
  return { ...sheet, pageSetup: resolvePageSetup(mod.pageSetup) };
}

function applyPageMarginsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.pageMargins === undefined) {return sheet;}
  return { ...sheet, pageMargins: resolvePageMargins(mod.pageMargins) };
}

function applyHeaderFooterMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.headerFooter === undefined) {return sheet;}
  return { ...sheet, headerFooter: resolveHeaderFooter(mod.headerFooter) };
}

function applyPrintOptionsMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.printOptions === undefined) {return sheet;}
  return { ...sheet, printOptions: resolvePrintOptions(mod.printOptions) };
}

function applySheetViewMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.sheetView === undefined) {return sheet;}
  return { ...sheet, sheetView: resolveSheetView(mod.sheetView) };
}

function applyFeatureMods(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  const s1 = applyConditionalFormattingsMod(sheet, mod);
  const s2 = applyDataValidationsMod(s1, mod);
  const s3 = applyHyperlinksMod(s2, mod);
  const s4 = applyAutoFilterMod(s3, mod);
  const s5 = applyPageSetupMod(s4, mod);
  const s6 = applyPageMarginsMod(s5, mod);
  const s7 = applyHeaderFooterMod(s6, mod);
  const s8 = applyPrintOptionsMod(s7, mod);
  const s9 = applySheetProtectionMod(s8, mod);
  const s10 = applySheetFormatPrMod(s9, mod);
  const s11 = applySheetViewMod(s10, mod);
  return applyPageBreaksMod(s11, mod);
}

function applyAutoFilterMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.autoFilter === undefined) {return sheet;}
  if (mod.autoFilter === null) {return clearAutoFilter(sheet);}
  return { ...sheet, autoFilter: resolveAutoFilter(mod.autoFilter) };
}

function applySheetProtectionMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.sheetProtection === undefined) {return sheet;}
  if (mod.sheetProtection === null) {return clearSheetProtection(sheet);}
  return { ...sheet, sheetProtection: resolveSheetProtection(mod.sheetProtection) };
}

function applySheetFormatPrMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.sheetFormatPr === undefined) {return sheet;}
  const existing = sheet.sheetFormatPr ?? {};
  return {
    ...sheet,
    sheetFormatPr: {
      ...existing,
      ...(mod.sheetFormatPr.defaultRowHeight !== undefined ? { defaultRowHeight: mod.sheetFormatPr.defaultRowHeight } : {}),
      ...(mod.sheetFormatPr.defaultColWidth !== undefined ? { defaultColWidth: mod.sheetFormatPr.defaultColWidth } : {}),
    },
  };
}

function applyPageBreaksMod(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  if (mod.rowBreaks === undefined && mod.colBreaks === undefined) {return sheet;}
  return {
    ...sheet,
    pageBreaks: {
      rowBreaks: mod.rowBreaks ? mod.rowBreaks.map(resolvePageBreak) : sheet.pageBreaks?.rowBreaks ?? [],
      colBreaks: mod.colBreaks ? mod.colBreaks.map(resolvePageBreak) : sheet.pageBreaks?.colBreaks ?? [],
    },
  };
}

function applySheetModification(sheet: XlsxWorksheet, mod: SheetModificationSpec): XlsxWorksheet {
  const withScalars = {
    ...sheet,
    ...(mod.rename ? { name: mod.rename } : {}),
    ...(mod.state ? { state: mod.state } : {}),
    ...(mod.tabColor !== undefined ? { tabColor: resolveColor(mod.tabColor) } : {}),
  };
  const withRows = applyRowMods(withScalars, mod);
  const withColumns = applyColumnMods(withRows, mod);
  const withMerge = applyMergeMods(withColumns, mod);
  return applyFeatureMods(withMerge, mod);
}

function rangeToString(range: CellRange): string {
  const startCol = colLetter(range.start.col as number);
  const endCol = colLetter(range.end.col as number);
  return `${startCol}${range.start.row}:${endCol}${range.end.row}`;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Apply comprehensive modifications to an XlsxWorkbook.
 *
 * All operations are immutable — returns a new XlsxWorkbook.
 *
 * @param workbook - The original workbook
 * @param spec - The modification specification
 * @returns Modified workbook
 */
function applyStyleMods(workbook: XlsxWorkbook, spec: ModificationSpec): XlsxWorkbook {
  if (!spec.styles) {return workbook;}
  const styles = { ...workbook.styles };
  if (spec.styles.fonts) {
    styles.fonts = [...styles.fonts, ...spec.styles.fonts.map(resolveFont)];
  }
  if (spec.styles.fills) {
    styles.fills = [...styles.fills, ...spec.styles.fills.map(resolveFill)];
  }
  if (spec.styles.borders) {
    styles.borders = [...styles.borders, ...spec.styles.borders.map(resolveBorder)];
  }
  if (spec.styles.numberFormats) {
    styles.numberFormats = [
      ...styles.numberFormats,
      ...spec.styles.numberFormats.map((nf) => ({ numFmtId: numFmtId(nf.id), formatCode: nf.formatCode })),
    ];
  }
  if (spec.styles.cellXfs) {
    styles.cellXfs = [...styles.cellXfs, ...spec.styles.cellXfs.map(resolveCellXf)];
  }
  return { ...workbook, styles };
}

function applySheetRemoval(workbook: XlsxWorkbook, spec: ModificationSpec): XlsxWorkbook {
  if (!spec.removeSheets || spec.removeSheets.length === 0) {return workbook;}
  const removeSet = new Set(spec.removeSheets);
  return { ...workbook, sheets: workbook.sheets.filter((s) => !removeSet.has(s.name)) };
}

function applyPerSheetMods(workbook: XlsxWorkbook, spec: ModificationSpec): XlsxWorkbook {
  if (!spec.sheets || spec.sheets.length === 0) {return workbook;}
  const sheetMap = new Map<string, XlsxWorksheet>();
  for (const sheet of workbook.sheets) {
    sheetMap.set(sheet.name, sheet);
  }
  for (const sheetMod of spec.sheets) {
    const sheet = sheetMap.get(sheetMod.name);
    if (!sheet) {continue;}
    const modified = applySheetModification(sheet, sheetMod);
    sheetMap.delete(sheetMod.name);
    sheetMap.set(modified.name, modified);
  }
  return { ...workbook, sheets: [...sheetMap.values()] };
}

function applySheetAdditions(workbook: XlsxWorkbook, spec: ModificationSpec): XlsxWorkbook {
  if (!spec.addSheets || spec.addSheets.length === 0) {return workbook;}
  const existingCount = workbook.sheets.length;
  const newSheets = spec.addSheets.map((s, i) => resolveSheet(s, existingCount + i, workbook.dateSystem));
  return { ...workbook, sheets: [...workbook.sheets, ...newSheets] };
}

function applyDefinedNameMods(workbook: XlsxWorkbook, spec: ModificationSpec): XlsxWorkbook {
  if (!spec.definedNames || spec.definedNames.length === 0) {return workbook;}
  const existingNames = new Map<string, XlsxDefinedName>();
  if (workbook.definedNames) {
    for (const dn of workbook.definedNames) {
      existingNames.set(dn.name, dn);
    }
  }
  for (const dnSpec of spec.definedNames) {
    existingNames.set(dnSpec.name, {
      name: dnSpec.name,
      formula: dnSpec.formula,
      ...(dnSpec.localSheetId !== undefined ? { localSheetId: dnSpec.localSheetId } : {}),
      ...(dnSpec.hidden !== undefined ? { hidden: dnSpec.hidden } : {}),
    });
  }
  return { ...workbook, definedNames: [...existingNames.values()] };
}

/** Apply comprehensive modifications to an XlsxWorkbook. Returns a new immutable workbook. */
export function applyModifications(workbook: XlsxWorkbook, spec: ModificationSpec): XlsxWorkbook {
  const withStyles = applyStyleMods(workbook, spec);
  const withRemoved = applySheetRemoval(withStyles, spec);
  const withSheetMods = applyPerSheetMods(withRemoved, spec);
  const withAdded = applySheetAdditions(withSheetMods, spec);
  const withNames = applyDefinedNameMods(withAdded, spec);
  return { ...withNames, sharedStrings: rebuildSharedStrings(withNames.sheets) };
}
