/**
 * @file SVG render context for XLSX
 *
 * Creates and manages the render context used throughout SVG rendering.
 * The context contains all information needed to render a sheet.
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { sheetId as createSheetId } from "@aurochs-office/xlsx/domain/types";
import type { XlsxSvgRenderContext, XlsxRenderOptions, ImageResolver, ChartResolver } from "./types";
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
  /** Optional image resolver for drawing elements (overrides workbook.resourceStore) */
  readonly resolveImage?: ImageResolver;
  /** Optional chart resolver for chart frames */
  readonly resolveChart?: ChartResolver;
};

/**
 * Extract render option overrides from sheet-level formatting properties.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.82 (sheetFormatPr)
 */
function buildSheetDefaults(sheet: XlsxWorksheet): Partial<XlsxRenderOptions> {
  const fmt = sheet.sheetFormatPr;
  if (!fmt) {
    return {};
  }

  const defaults: Record<string, unknown> = {};
  if (fmt.defaultRowHeight !== undefined) {
    defaults.defaultRowHeight = fmt.defaultRowHeight;
  }
  if (fmt.defaultColWidth !== undefined) {
    defaults.defaultColumnWidth = fmt.defaultColWidth;
  }
  return defaults as Partial<XlsxRenderOptions>;
}

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

  // Merge options: sheet's sheetFormatPr values take precedence over global defaults,
  // but explicit user-provided options take highest precedence.
  const sheetDefaults = buildSheetDefaults(sheet);
  const options: XlsxRenderOptions = {
    ...DEFAULT_XLSX_RENDER_OPTIONS,
    ...sheetDefaults,
    ...partialOptions,
  };

  // Calculate layout
  const layout = calculateSheetLayout(sheet, options);

  // Create collectors
  const defs = createDefsCollector();
  const warnings = createWarningsCollector();

  const resolveImage = config.resolveImage ?? buildImageResolverFromWorkbook(workbook);
  const resolveChart = config.resolveChart ?? buildChartResolverFromWorkbook(workbook);

  return {
    workbook,
    sheet,
    layout,
    options,
    defs,
    warnings,
    ...(resolveImage && { resolveImage }),
    ...(resolveChart && { resolveChart }),
  };
}

/**
 * Create an empty render context for testing.
 */
export function createEmptyXlsxSvgRenderContext(): XlsxSvgRenderContext {
  const emptySheet: XlsxWorksheet = {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: createSheetId(1),
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

// =============================================================================
// Resolver Factories
// =============================================================================

/**
 * Build an image resolver from workbook.resourceStore if available.
 */
function buildImageResolverFromWorkbook(workbook: XlsxWorkbook): ImageResolver | undefined {
  if (!workbook.resourceStore) {
    return undefined;
  }
  const store = workbook.resourceStore;
  return (relId: string) => store.toDataUrl(relId);
}

/**
 * Build a chart resolver from workbook.charts if available.
 */
function buildChartResolverFromWorkbook(workbook: XlsxWorkbook): ChartResolver | undefined {
  if (!workbook.charts) {
    return undefined;
  }
  const charts = workbook.charts;
  return (relIdOrPath: string) => {
    const match = charts.find((c) => c.relId === relIdOrPath || c.chartPath === relIdOrPath);
    return match?.chart;
  };
}
