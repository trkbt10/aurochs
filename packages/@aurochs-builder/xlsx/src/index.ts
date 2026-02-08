/**
 * @file XLSX builder package
 *
 * Provides builders for creating Excel spreadsheet XML elements.
 * This is the single source of truth for XLSX serialization.
 *
 * @example
 * ```typescript
 * import { serializeWorkbook, serializeWorksheet, serializeCell } from "@aurochs-builder/xlsx";
 * ```
 */

// Units and serialization helpers
export {
  serializeCellRef,
  serializeRef,
  serializeRowIndex,
  serializeColIndex,
  serializeFloat,
  serializeBoolean,
  serializeInt,
  serializeStyleId,
  serializeRgbHex,
  colIndexToLetter,
  letterToColIndex,
} from "./units";

// Cell serialization
export {
  serializeCell,
  serializeCellValue,
  serializeFormula,
  type SharedStringTable,
  type CellValueSerializeResult,
} from "./cell";

// Worksheet serialization
export {
  serializeWorksheet,
  serializeSheetData,
  serializeRow,
  serializeCols,
  serializeDimension,
  serializeMergeCells,
} from "./worksheet";

// Workbook serialization
export {
  serializeWorkbook,
  serializeSheets,
  serializeDefinedNames,
  serializeRelationships,
  type XlsxRelationship,
} from "./workbook";

// Styles serialization
export {
  serializeStyleSheet,
  serializeAlignment,
  serializeProtection,
  serializeCellXf,
  serializeCellXfs,
  serializeCellStyleXfs,
  serializeCellStyle,
  serializeCellStyles,
} from "./styles";

// Font serialization
export { serializeFont, serializeColor } from "./font";

// Fill serialization
export { serializeFill, serializePatternFill, serializeGradientFill } from "./fill";

// Border serialization
export { serializeBorder, serializeBorderEdge } from "./border";

// Number format serialization
export { serializeNumFmt, serializeNumFmts } from "./number-format";

// Exporter
export {
  exportXlsx,
  createSharedStringTableBuilder,
  collectSharedStrings,
  generateContentTypes,
  generateRootRels,
  generateWorkbookRels,
  generateSharedStrings,
} from "./exporter";
