/**
 * @file Exhaustive field registry for XLSX reference documentation verification.
 *
 * Each exported constant maps every field of a spec type to the documentation
 * section name in xlsx.md where it must appear. The `satisfies Record<keyof T, string>`
 * pattern ensures that adding a field to any type causes a compile error here,
 * forcing the developer to update both the registry and the documentation.
 */

import type {
  CellSpec,
  ColorSpec,
  FillSpec,
  FormulaSpec,
  RowSpec,
  ColumnSpec,
  SheetSpec,
  SheetFormatPrSpec,
  WorkbookSpec,
  StyleSheetSpec,
  DefinedNameSpec,
  FontSpec,
  GradientStopSpec,
  BorderSpec,
  BorderEdgeSpec,
  NumberFormatSpec,
  CellXfSpec,
  AlignmentSpec,
  ProtectionSpec,
  SheetModificationSpec,
  RowModificationSpec,
  ModificationSpec,
  HyperlinkSpec,
  DataValidationSpec,
  ConditionalFormattingSpec,
  ConditionalFormattingRuleSpec,
  CfvoSpec,
  AutoFilterSpec,
  PageSetupSpec,
  PageMarginsSpec,
  HeaderFooterSpec,
  PrintOptionsSpec,
  SheetProtectionSpec,
  SheetViewSpec,
  PageBreakSpec,
} from "./build-spec";

import type {
  ExpectedCell,
  ExpectedColumn,
  ExpectedSheet,
  ExpectedStyles,
  ExpectedWorkbook,
  ExpectedDefinedName,
} from "./verify";

// Pre-computed union variant types for exhaustive field checks
type ColorRgb = Extract<ColorSpec, { type: "rgb" }>;
type ColorTheme = Extract<ColorSpec, { type: "theme" }>;
type FillSolid = Extract<FillSpec, { type: "solid" }>;
type FillPattern = Extract<FillSpec, { type: "pattern" }>;
type FillGradient = Extract<FillSpec, { type: "gradient" }>;

// ---------------------------------------------------------------------------
// Build spec types
// ---------------------------------------------------------------------------

export const CELL_SPEC_FIELDS = {
  ref: "Cell spec",
  value: "Cell spec",
  formula: "Cell spec",
  styleId: "Cell spec",
} satisfies Record<keyof CellSpec, string>;

export const FORMULA_SPEC_FIELDS = {
  expression: "Cell spec",
  type: "Cell spec",
} satisfies Record<keyof FormulaSpec, string>;

export const ROW_SPEC_FIELDS = {
  row: "Row spec",
  cells: "Row spec",
  height: "Row spec",
  hidden: "Row spec",
  customHeight: "Row spec",
  styleId: "Row spec",
} satisfies Record<keyof RowSpec, string>;

export const COLUMN_SPEC_FIELDS = {
  min: "Column spec",
  max: "Column spec",
  width: "Column spec",
  hidden: "Column spec",
  bestFit: "Column spec",
  styleId: "Column spec",
} satisfies Record<keyof ColumnSpec, string>;

export const SHEET_SPEC_FIELDS = {
  name: "Sheet spec",
  state: "Sheet spec",
  columns: "Sheet spec",
  rows: "Sheet spec",
  mergeCells: "Sheet spec",
  sheetFormatPr: "Sheet spec",
} satisfies Record<keyof SheetSpec, string>;

export const SHEET_FORMAT_PR_SPEC_FIELDS = {
  defaultRowHeight: "Sheet spec",
  defaultColWidth: "Sheet spec",
} satisfies Record<keyof SheetFormatPrSpec, string>;

export const WORKBOOK_SPEC_FIELDS = {
  sheets: "Create mode",
  styles: "Create mode",
  definedNames: "Create mode",
  dateSystem: "Create mode",
} satisfies Record<keyof WorkbookSpec, string>;

export const STYLESHEET_SPEC_FIELDS = {
  fonts: "StyleSheet spec",
  fills: "StyleSheet spec",
  borders: "StyleSheet spec",
  numberFormats: "StyleSheet spec",
  cellXfs: "StyleSheet spec",
} satisfies Record<keyof StyleSheetSpec, string>;

export const DEFINED_NAME_SPEC_FIELDS = {
  name: "Defined names",
  formula: "Defined names",
  localSheetId: "Defined names",
  hidden: "Defined names",
} satisfies Record<keyof DefinedNameSpec, string>;

// ---------------------------------------------------------------------------
// Style specs
// ---------------------------------------------------------------------------

export const FONT_SPEC_FIELDS = {
  name: "Font spec",
  size: "Font spec",
  bold: "Font spec",
  italic: "Font spec",
  underline: "Font spec",
  strikethrough: "Font spec",
  color: "Font spec",
  family: "Font spec",
  scheme: "Font spec",
} satisfies Record<keyof FontSpec, string>;

// ColorSpec is a union: string | { type: "rgb", value } | { type: "theme", theme, tint }
// We check the object variant fields
export const COLOR_SPEC_RGB_FIELDS = {
  type: "Color spec",
  value: "Color spec",
} satisfies Record<keyof ColorRgb, string>;

export const COLOR_SPEC_THEME_FIELDS = {
  type: "Color spec",
  theme: "Color spec",
  tint: "Color spec",
} satisfies Record<keyof ColorTheme, string>;

// FillSpec is a union with 4 variants. Check each variant's unique fields.
export const FILL_SPEC_SOLID_FIELDS = {
  type: "Fill spec",
  color: "Fill spec",
} satisfies Record<keyof FillSolid, string>;

export const FILL_SPEC_PATTERN_FIELDS = {
  type: "Fill spec",
  patternType: "Fill spec",
  fgColor: "Fill spec",
  bgColor: "Fill spec",
} satisfies Record<keyof FillPattern, string>;

export const FILL_SPEC_GRADIENT_FIELDS = {
  type: "Fill spec",
  gradientType: "Fill spec",
  degree: "Fill spec",
  stops: "Fill spec",
} satisfies Record<keyof FillGradient, string>;

export const GRADIENT_STOP_SPEC_FIELDS = {
  position: "Fill spec",
  color: "Fill spec",
} satisfies Record<keyof GradientStopSpec, string>;

export const BORDER_SPEC_FIELDS = {
  left: "Border spec",
  right: "Border spec",
  top: "Border spec",
  bottom: "Border spec",
  diagonal: "Border spec",
  diagonalUp: "Border spec",
  diagonalDown: "Border spec",
} satisfies Record<keyof BorderSpec, string>;

export const BORDER_EDGE_SPEC_FIELDS = {
  style: "Border spec",
  color: "Border spec",
} satisfies Record<keyof BorderEdgeSpec, string>;

export const NUMBER_FORMAT_SPEC_FIELDS = {
  id: "Number format spec",
  formatCode: "Number format spec",
} satisfies Record<keyof NumberFormatSpec, string>;

export const CELL_XF_SPEC_FIELDS = {
  numFmtId: "CellXf spec",
  fontId: "CellXf spec",
  fillId: "CellXf spec",
  borderId: "CellXf spec",
  alignment: "CellXf spec",
  protection: "CellXf spec",
} satisfies Record<keyof CellXfSpec, string>;

export const ALIGNMENT_SPEC_FIELDS = {
  horizontal: "CellXf spec",
  vertical: "CellXf spec",
  wrapText: "CellXf spec",
  textRotation: "CellXf spec",
  indent: "CellXf spec",
  shrinkToFit: "CellXf spec",
  readingOrder: "CellXf spec",
} satisfies Record<keyof AlignmentSpec, string>;

export const PROTECTION_SPEC_FIELDS = {
  locked: "CellXf spec",
  hidden: "CellXf spec",
} satisfies Record<keyof ProtectionSpec, string>;

// ---------------------------------------------------------------------------
// Modification spec types
// ---------------------------------------------------------------------------

export const MODIFICATION_SPEC_FIELDS = {
  sheets: "Modify mode",
  styles: "Modify mode",
  definedNames: "Modify mode",
  addSheets: "Modify mode",
  removeSheets: "Modify mode",
} satisfies Record<keyof ModificationSpec, string>;

export const SHEET_MODIFICATION_SPEC_FIELDS = {
  name: "Sheet modification spec",
  rename: "Sheet modification spec",
  state: "Sheet modification spec",
  tabColor: "Sheet modification spec",
  cells: "Sheet modification spec",
  rows: "Sheet modification spec",
  removeRows: "Sheet modification spec",
  columns: "Sheet modification spec",
  removeColumns: "Sheet modification spec",
  addMergeCells: "Sheet modification spec",
  removeMergeCells: "Sheet modification spec",
  conditionalFormattings: "Sheet modification spec",
  dataValidations: "Sheet modification spec",
  hyperlinks: "Sheet modification spec",
  autoFilter: "Sheet modification spec",
  pageSetup: "Sheet modification spec",
  pageMargins: "Sheet modification spec",
  headerFooter: "Sheet modification spec",
  printOptions: "Sheet modification spec",
  sheetProtection: "Sheet modification spec",
  sheetFormatPr: "Sheet modification spec",
  sheetView: "Sheet modification spec",
  rowBreaks: "Sheet modification spec",
  colBreaks: "Sheet modification spec",
} satisfies Record<keyof SheetModificationSpec, string>;

export const ROW_MODIFICATION_SPEC_FIELDS = {
  row: "Row modification spec",
  height: "Row modification spec",
  hidden: "Row modification spec",
  customHeight: "Row modification spec",
  styleId: "Row modification spec",
} satisfies Record<keyof RowModificationSpec, string>;

// ---------------------------------------------------------------------------
// Feature specs
// ---------------------------------------------------------------------------

export const HYPERLINK_SPEC_FIELDS = {
  ref: "Hyperlinks",
  target: "Hyperlinks",
  display: "Hyperlinks",
  location: "Hyperlinks",
  tooltip: "Hyperlinks",
} satisfies Record<keyof HyperlinkSpec, string>;

export const DATA_VALIDATION_SPEC_FIELDS = {
  sqref: "Data validation",
  type: "Data validation",
  operator: "Data validation",
  allowBlank: "Data validation",
  showInputMessage: "Data validation",
  showErrorMessage: "Data validation",
  showDropDown: "Data validation",
  errorStyle: "Data validation",
  promptTitle: "Data validation",
  prompt: "Data validation",
  errorTitle: "Data validation",
  error: "Data validation",
  formula1: "Data validation",
  formula2: "Data validation",
} satisfies Record<keyof DataValidationSpec, string>;

export const CONDITIONAL_FORMATTING_SPEC_FIELDS = {
  sqref: "Conditional formatting",
  rules: "Conditional formatting",
} satisfies Record<keyof ConditionalFormattingSpec, string>;

export const CONDITIONAL_FORMATTING_RULE_SPEC_FIELDS = {
  type: "Conditional formatting",
  priority: "Conditional formatting",
  operator: "Conditional formatting",
  dxfId: "Conditional formatting",
  stopIfTrue: "Conditional formatting",
  formulas: "Conditional formatting",
  text: "Conditional formatting",
  timePeriod: "Conditional formatting",
  rank: "Conditional formatting",
  percent: "Conditional formatting",
  bottom: "Conditional formatting",
  stdDev: "Conditional formatting",
  equalAverage: "Conditional formatting",
  aboveAverage: "Conditional formatting",
  cfvo: "Conditional formatting",
  colors: "Conditional formatting",
  color: "Conditional formatting",
  showValue: "Conditional formatting",
  minLength: "Conditional formatting",
  maxLength: "Conditional formatting",
  gradient: "Conditional formatting",
  iconSet: "Conditional formatting",
  reverse: "Conditional formatting",
  iconOnly: "Conditional formatting",
} satisfies Record<keyof ConditionalFormattingRuleSpec, string>;

export const CFVO_SPEC_FIELDS = {
  type: "Conditional formatting",
  val: "Conditional formatting",
  gte: "Conditional formatting",
} satisfies Record<keyof CfvoSpec, string>;

export const AUTO_FILTER_SPEC_FIELDS = {
  ref: "Auto filter",
} satisfies Record<keyof AutoFilterSpec, string>;

export const PAGE_SETUP_SPEC_FIELDS = {
  paperSize: "Page setup",
  orientation: "Page setup",
  scale: "Page setup",
  fitToWidth: "Page setup",
  fitToHeight: "Page setup",
  firstPageNumber: "Page setup",
  useFirstPageNumber: "Page setup",
  blackAndWhite: "Page setup",
  draft: "Page setup",
  cellComments: "Page setup",
  pageOrder: "Page setup",
  horizontalDpi: "Page setup",
  verticalDpi: "Page setup",
  copies: "Page setup",
} satisfies Record<keyof PageSetupSpec, string>;

export const PAGE_MARGINS_SPEC_FIELDS = {
  left: "Page margins",
  right: "Page margins",
  top: "Page margins",
  bottom: "Page margins",
  header: "Page margins",
  footer: "Page margins",
} satisfies Record<keyof PageMarginsSpec, string>;

export const HEADER_FOOTER_SPEC_FIELDS = {
  oddHeader: "Header / footer",
  oddFooter: "Header / footer",
  evenHeader: "Header / footer",
  evenFooter: "Header / footer",
  firstHeader: "Header / footer",
  firstFooter: "Header / footer",
  differentOddEven: "Header / footer",
  differentFirst: "Header / footer",
  scaleWithDoc: "Header / footer",
  alignWithMargins: "Header / footer",
} satisfies Record<keyof HeaderFooterSpec, string>;

export const PRINT_OPTIONS_SPEC_FIELDS = {
  gridLines: "Print options",
  gridLinesSet: "Print options",
  headings: "Print options",
  horizontalCentered: "Print options",
  verticalCentered: "Print options",
} satisfies Record<keyof PrintOptionsSpec, string>;

export const SHEET_PROTECTION_SPEC_FIELDS = {
  sheet: "Sheet protection",
  objects: "Sheet protection",
  scenarios: "Sheet protection",
  formatCells: "Sheet protection",
  formatColumns: "Sheet protection",
  formatRows: "Sheet protection",
  insertColumns: "Sheet protection",
  insertRows: "Sheet protection",
  insertHyperlinks: "Sheet protection",
  deleteColumns: "Sheet protection",
  deleteRows: "Sheet protection",
  selectLockedCells: "Sheet protection",
  sort: "Sheet protection",
  autoFilter: "Sheet protection",
  pivotTables: "Sheet protection",
  selectUnlockedCells: "Sheet protection",
  password: "Sheet protection",
  algorithmName: "Sheet protection",
  hashValue: "Sheet protection",
  saltValue: "Sheet protection",
  spinCount: "Sheet protection",
} satisfies Record<keyof SheetProtectionSpec, string>;

export const SHEET_VIEW_SPEC_FIELDS = {
  tabSelected: "Sheet view",
  showGridLines: "Sheet view",
  showRowColHeaders: "Sheet view",
  zoomScale: "Sheet view",
  freeze: "Sheet view",
} satisfies Record<keyof SheetViewSpec, string>;

export const PAGE_BREAK_SPEC_FIELDS = {
  id: "Page breaks",
  max: "Page breaks",
  min: "Page breaks",
  manual: "Page breaks",
} satisfies Record<keyof PageBreakSpec, string>;

// ---------------------------------------------------------------------------
// Verify types
// ---------------------------------------------------------------------------

export const EXPECTED_CELL_FIELDS = {
  ref: "Verify spec",
  type: "Verify spec",
  value: "Verify spec",
  formula: "Verify spec",
  styleId: "Verify spec",
} satisfies Record<keyof ExpectedCell, string>;

export const EXPECTED_COLUMN_FIELDS = {
  min: "Verify spec",
  max: "Verify spec",
  width: "Verify spec",
  hidden: "Verify spec",
} satisfies Record<keyof ExpectedColumn, string>;

export const EXPECTED_SHEET_FIELDS = {
  name: "Verify spec",
  rowCount: "Verify spec",
  cellCount: "Verify spec",
  mergedCells: "Verify spec",
  columns: "Verify spec",
  cells: "Verify spec",
} satisfies Record<keyof ExpectedSheet, string>;

export const EXPECTED_STYLES_FIELDS = {
  fontCount: "Verify spec",
  fillCount: "Verify spec",
  borderCount: "Verify spec",
  numberFormatCount: "Verify spec",
  cellXfCount: "Verify spec",
} satisfies Record<keyof ExpectedStyles, string>;

export const EXPECTED_WORKBOOK_FIELDS = {
  sheetCount: "Verify spec",
  sheetNames: "Verify spec",
  totalRows: "Verify spec",
  totalCells: "Verify spec",
  definedNames: "Verify spec",
  styles: "Verify spec",
  sheets: "Verify spec",
} satisfies Record<keyof ExpectedWorkbook, string>;

export const EXPECTED_DEFINED_NAME_FIELDS = {
  name: "Verify spec",
  formula: "Verify spec",
  localSheetId: "Verify spec",
  hidden: "Verify spec",
} satisfies Record<keyof ExpectedDefinedName, string>;

// ---------------------------------------------------------------------------
// CLI commands
// ---------------------------------------------------------------------------

export const CLI_COMMANDS = [
  "info",
  "list",
  "show",
  "extract",
  "build",
  "verify",
  "strings",
  "formulas",
  "names",
  "tables",
  "comments",
  "autofilter",
  "validation",
  "conditional",
  "hyperlinks",
  "styles",
  "preview",
] as const;

// ---------------------------------------------------------------------------
// All registries (for iteration in tests)
// ---------------------------------------------------------------------------

export const ALL_REGISTRIES = [
  ["CellSpec", CELL_SPEC_FIELDS],
  ["FormulaSpec", FORMULA_SPEC_FIELDS],
  ["RowSpec", ROW_SPEC_FIELDS],
  ["ColumnSpec", COLUMN_SPEC_FIELDS],
  ["SheetSpec", SHEET_SPEC_FIELDS],
  ["SheetFormatPrSpec", SHEET_FORMAT_PR_SPEC_FIELDS],
  ["WorkbookSpec", WORKBOOK_SPEC_FIELDS],
  ["StyleSheetSpec", STYLESHEET_SPEC_FIELDS],
  ["DefinedNameSpec", DEFINED_NAME_SPEC_FIELDS],
  ["FontSpec", FONT_SPEC_FIELDS],
  ["ColorSpec (rgb)", COLOR_SPEC_RGB_FIELDS],
  ["ColorSpec (theme)", COLOR_SPEC_THEME_FIELDS],
  ["FillSpec (solid)", FILL_SPEC_SOLID_FIELDS],
  ["FillSpec (pattern)", FILL_SPEC_PATTERN_FIELDS],
  ["FillSpec (gradient)", FILL_SPEC_GRADIENT_FIELDS],
  ["GradientStopSpec", GRADIENT_STOP_SPEC_FIELDS],
  ["BorderSpec", BORDER_SPEC_FIELDS],
  ["BorderEdgeSpec", BORDER_EDGE_SPEC_FIELDS],
  ["NumberFormatSpec", NUMBER_FORMAT_SPEC_FIELDS],
  ["CellXfSpec", CELL_XF_SPEC_FIELDS],
  ["AlignmentSpec", ALIGNMENT_SPEC_FIELDS],
  ["ProtectionSpec", PROTECTION_SPEC_FIELDS],
  ["ModificationSpec", MODIFICATION_SPEC_FIELDS],
  ["SheetModificationSpec", SHEET_MODIFICATION_SPEC_FIELDS],
  ["RowModificationSpec", ROW_MODIFICATION_SPEC_FIELDS],
  ["HyperlinkSpec", HYPERLINK_SPEC_FIELDS],
  ["DataValidationSpec", DATA_VALIDATION_SPEC_FIELDS],
  ["ConditionalFormattingSpec", CONDITIONAL_FORMATTING_SPEC_FIELDS],
  ["ConditionalFormattingRuleSpec", CONDITIONAL_FORMATTING_RULE_SPEC_FIELDS],
  ["CfvoSpec", CFVO_SPEC_FIELDS],
  ["AutoFilterSpec", AUTO_FILTER_SPEC_FIELDS],
  ["PageSetupSpec", PAGE_SETUP_SPEC_FIELDS],
  ["PageMarginsSpec", PAGE_MARGINS_SPEC_FIELDS],
  ["HeaderFooterSpec", HEADER_FOOTER_SPEC_FIELDS],
  ["PrintOptionsSpec", PRINT_OPTIONS_SPEC_FIELDS],
  ["SheetProtectionSpec", SHEET_PROTECTION_SPEC_FIELDS],
  ["SheetViewSpec", SHEET_VIEW_SPEC_FIELDS],
  ["PageBreakSpec", PAGE_BREAK_SPEC_FIELDS],
  ["ExpectedCell", EXPECTED_CELL_FIELDS],
  ["ExpectedColumn", EXPECTED_COLUMN_FIELDS],
  ["ExpectedSheet", EXPECTED_SHEET_FIELDS],
  ["ExpectedStyles", EXPECTED_STYLES_FIELDS],
  ["ExpectedWorkbook", EXPECTED_WORKBOOK_FIELDS],
  ["ExpectedDefinedName", EXPECTED_DEFINED_NAME_FIELDS],
] as const;
