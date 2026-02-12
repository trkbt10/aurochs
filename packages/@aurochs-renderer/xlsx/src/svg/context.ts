/**
 * @file SVG render context for XLSX
 *
 * Creates and manages the render context used throughout SVG rendering.
 * The context contains all information needed to render a sheet.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxSvgRenderContext, XlsxRenderOptions } from "./types";
import { DEFAULT_XLSX_RENDER_OPTIONS, createDefsCollector, createWarningsCollector } from "./types";
import { calculateSheetLayout } from "./layout";

// =============================================================================
// Context Configuration
// =============================================================================

/**
 * Configuration for creating an SVG render context.
 */
export type XlsxSvgRenderContextConfig = {
  /** The workbook being rendered */
  readonly workbook: XlsxWorkbook;
  /** Index of the sheet to render */
  readonly sheetIndex: number;
  /** Optional render options (merged with defaults) */
  readonly options?: Partial<XlsxRenderOptions>;
};

// =============================================================================
// Context Factory
// =============================================================================

/**
 * Create an SVG render context for a sheet.
 *
 * @param config - Context configuration
 * @returns The render context
 * @throws Error if sheet index is out of bounds
 */
export function createXlsxSvgRenderContext(config: XlsxSvgRenderContextConfig): XlsxSvgRenderContext {
  const { workbook, sheetIndex, options: partialOptions } = config;

  // Validate sheet index
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    throw new Error(
      `Sheet index ${sheetIndex} out of bounds. Workbook has ${workbook.sheets.length} sheets.`,
    );
  }

  const sheet = workbook.sheets[sheetIndex]!;

  // Merge options with defaults
  const options: XlsxRenderOptions = {
    ...DEFAULT_XLSX_RENDER_OPTIONS,
    ...partialOptions,
  };

  // Calculate layout
  const layout = calculateSheetLayout(sheet, options);

  // Create collectors
  const defs = createDefsCollector();
  const warnings = createWarningsCollector();

  return {
    workbook,
    sheet,
    layout,
    options,
    defs,
    warnings,
  };
}

/**
 * Create an empty render context for testing.
 */
export function createEmptyXlsxSvgRenderContext(): XlsxSvgRenderContext {
  const emptySheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows: [],
    xmlPath: "xl/worksheets/sheet1.xml",
  };

  const emptyWorkbook: XlsxWorkbook = {
    dateSystem: "1900",
    sheets: [emptySheet],
    styles: {
      fonts: [],
      fills: [],
      borders: [],
      numberFormats: [],
      cellXfs: [],
      cellStyleXfs: [],
      cellStyles: [],
    },
    sharedStrings: [],
  };

  return createXlsxSvgRenderContext({
    workbook: emptyWorkbook,
    sheetIndex: 0,
  });
}

// =============================================================================
// Context Utilities
// =============================================================================

/**
 * Get the color scheme from the workbook's theme.
 */
export function getColorScheme(ctx: XlsxSvgRenderContext): Record<string, string> | undefined {
  return ctx.workbook.theme?.colorScheme;
}

/**
 * Get the indexed colors from the workbook's styles.
 */
export function getIndexedColors(ctx: XlsxSvgRenderContext): readonly string[] | undefined {
  return ctx.workbook.styles.indexedColors;
}
