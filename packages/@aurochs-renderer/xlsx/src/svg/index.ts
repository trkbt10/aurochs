/**
 * @file SVG rendering exports for @aurochs-renderer/xlsx
 *
 * Provides SVG-based rendering of XLSX spreadsheets with full style support.
 */

// Types
export type {
  ResolvedFont,
  ResolvedFill,
  ResolvedBorderEdge,
  ResolvedBorder,
  ResolvedCellStyle,
  CellLayout,
  SheetLayout,
  XlsxRenderOptions,
  SheetSvgResult,
  DefsCollector,
  XlsxSvgRenderContext,
} from "./types";

export { DEFAULT_XLSX_RENDER_OPTIONS, createDefsCollector } from "./types";

// Context
export type { XlsxSvgRenderContextConfig } from "./context";
export { createXlsxSvgRenderContext, createEmptyXlsxSvgRenderContext, getColorScheme, getIndexedColors } from "./context";

// Layout
export { calculateSheetLayout, columnIndexToLetter, cellRefFromIndices } from "./layout";

// Color resolution
export { resolveXlsxColor, getDefaultFontColor, getDefaultBackgroundColor, getDefaultBorderColor } from "./color-resolver";

// Style resolution
export { resolveCellStyle, createStyleCache, createDefaultFont, createDefaultFill, createDefaultBorder, createDefaultStyle } from "./style-resolver";

// Cell rendering
export { formatCellValue, renderCellFill, renderCellText, renderCell } from "./cell-renderer";

// Border rendering
export { renderCellBorders, renderGridLines, renderColumnHeaders, renderRowHeaders } from "./border-renderer";

// Sheet rendering (main entry points)
export { renderSheetToSvg, renderSheetWithContext, renderFirstSheetToSvg, renderSheetByNameToSvg } from "./sheet-renderer";
