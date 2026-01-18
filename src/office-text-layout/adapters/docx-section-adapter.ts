/**
 * @file DOCX Section Properties to Page Configuration Adapter
 *
 * Converts DOCX section properties (sectPr) to page flow configuration.
 * Uses ECMA-376 specification defaults when values are not explicitly set.
 *
 * @see ECMA-376-1:2016 Section 17.6 (Sections)
 */

import type { DocxSectionProperties, DocxColumns } from "../../docx/domain/section";
import type { PageFlowConfig, ColumnConfig } from "../page-flow";
import type { WritingMode } from "../types";
import type { Pixels } from "../../ooxml/domain/units";
import { px } from "../../ooxml/domain/units";
import {
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  SPEC_DEFAULT_TEXT_DIRECTION,
  SPEC_DEFAULT_HEADER_FOOTER_DISTANCE_TWIPS,
  twipsToPx,
} from "../../docx/domain/ecma376-defaults";
import { textDirectionToWritingMode } from "../writing-mode";
import type { EcmaTextDirection } from "../../docx/domain/ecma376-defaults";

// =============================================================================
// Column Configuration Conversion
// =============================================================================

/**
 * Default space between columns in twips (0.5 inch = 720 twips).
 * @see ECMA-376-1:2016 Section 17.6.4 (cols - default space)
 */
const DEFAULT_COLUMN_SPACE_TWIPS = 720;

/**
 * Convert DOCX columns to ColumnConfig.
 *
 * @see ECMA-376-1:2016 Section 17.6.4 (cols)
 */
function columnsToColumnConfig(
  cols: DocxColumns | undefined,
): ColumnConfig | undefined {
  if (cols === undefined || cols.num === undefined || cols.num <= 1) {
    return undefined;
  }

  const space = twipsToPx(cols.space ?? DEFAULT_COLUMN_SPACE_TWIPS);
  const equalWidth = cols.equalWidth !== false; // Default is true

  // If individual column widths are specified
  if (!equalWidth && cols.col !== undefined && cols.col.length > 0) {
    const columnWidths: Pixels[] = cols.col.map((c) =>
      c.w !== undefined ? twipsToPx(c.w) : px(0)
    );
    return {
      num: cols.num,
      space,
      equalWidth: false,
      columnWidths,
    };
  }

  return {
    num: cols.num,
    space,
    equalWidth: true,
  };
}

// =============================================================================
// Section Properties to Page Configuration
// =============================================================================

/**
 * Convert DOCX section properties to page flow configuration.
 *
 * This function derives page dimensions and margins from sectPr,
 * falling back to ECMA-376 specification defaults when not specified.
 *
 * Gutter margin handling:
 * - The gutter is added to the left margin by default (for LTR documents)
 * - If rtlGutter is set, it's added to the right margin instead
 *
 * @param sectPr - DOCX section properties (may be undefined)
 * @returns Page flow configuration for the layout engine
 *
 * @example
 * ```typescript
 * const sectPr = document.sectPr;
 * const pageConfig = sectionPropertiesToPageConfig(sectPr);
 * const pagedLayout = flowIntoPages({ paragraphs, config: pageConfig });
 * ```
 */
export function sectionPropertiesToPageConfig(
  sectPr: DocxSectionProperties | undefined,
): PageFlowConfig {
  const pgSz = sectPr?.pgSz;
  const pgMar = sectPr?.pgMar;

  // Determine writing mode from section textDirection property
  // Falls back to spec default (lrTb - horizontal left-to-right)
  // @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
  const textDirection: EcmaTextDirection = sectPr?.textDirection ?? SPEC_DEFAULT_TEXT_DIRECTION;
  const writingMode: WritingMode = textDirectionToWritingMode(textDirection);

  // Calculate margins with gutter support
  // @see ECMA-376-1:2016 Section 17.6.11 (pgMar - gutter)
  const baseLeftMargin = twipsToPx(pgMar?.left ?? SPEC_DEFAULT_MARGIN_TWIPS);
  const baseRightMargin = twipsToPx(pgMar?.right ?? SPEC_DEFAULT_MARGIN_TWIPS);
  const gutter = pgMar?.gutter !== undefined ? twipsToPx(pgMar.gutter) : px(0);

  // Add gutter to left margin by default, right if rtlGutter is set
  const marginLeft = sectPr?.rtlGutter === true
    ? baseLeftMargin
    : px((baseLeftMargin as number) + (gutter as number));
  const marginRight = sectPr?.rtlGutter === true
    ? px((baseRightMargin as number) + (gutter as number))
    : baseRightMargin;

  // Convert columns configuration
  const columns = columnsToColumnConfig(sectPr?.cols);

  // Header and footer distance from page edge
  // @see ECMA-376-1:2016 Section 17.6.11 (pgMar - header/footer)
  const headerDistance = twipsToPx(pgMar?.header ?? SPEC_DEFAULT_HEADER_FOOTER_DISTANCE_TWIPS);
  const footerDistance = twipsToPx(pgMar?.footer ?? SPEC_DEFAULT_HEADER_FOOTER_DISTANCE_TWIPS);

  return {
    pageWidth: twipsToPx(pgSz?.w ?? SPEC_DEFAULT_PAGE_WIDTH_TWIPS),
    pageHeight: twipsToPx(pgSz?.h ?? SPEC_DEFAULT_PAGE_HEIGHT_TWIPS),
    marginTop: twipsToPx(pgMar?.top ?? SPEC_DEFAULT_MARGIN_TWIPS),
    marginBottom: twipsToPx(pgMar?.bottom ?? SPEC_DEFAULT_MARGIN_TWIPS),
    marginLeft,
    marginRight,
    headerDistance,
    footerDistance,
    writingMode,
    widowLines: 2,
    orphanLines: 2,
    columns,
  };
}

/**
 * Get content width from section properties.
 * Content width = page width - left margin - right margin
 *
 * @param sectPr - DOCX section properties
 * @returns Content width in pixels
 */
export function getSectionContentWidth(sectPr: DocxSectionProperties | undefined): number {
  const config = sectionPropertiesToPageConfig(sectPr);
  return (config.pageWidth as number) - (config.marginLeft as number) - (config.marginRight as number);
}

/**
 * Get content height from section properties.
 * Content height = page height - top margin - bottom margin
 *
 * @param sectPr - DOCX section properties
 * @returns Content height in pixels
 */
export function getSectionContentHeight(sectPr: DocxSectionProperties | undefined): number {
  const config = sectionPropertiesToPageConfig(sectPr);
  return (config.pageHeight as number) - (config.marginTop as number) - (config.marginBottom as number);
}

// =============================================================================
// Multiple Sections Support
// =============================================================================

/**
 * Extract all section properties from a document.
 * DOCX documents can have multiple sections with different page settings.
 *
 * @param documentSectPr - Document-level sectPr (last section)
 * @param paragraphSectPrs - Section properties from paragraph pPr (section breaks)
 * @returns Array of section configurations
 */
export function getAllSectionConfigs(
  documentSectPr: DocxSectionProperties | undefined,
  paragraphSectPrs: readonly (DocxSectionProperties | undefined)[],
): readonly PageFlowConfig[] {
  const configs: PageFlowConfig[] = [];

  // Each paragraph-level sectPr defines the end of a section
  for (const sectPr of paragraphSectPrs) {
    if (sectPr !== undefined) {
      configs.push(sectionPropertiesToPageConfig(sectPr));
    }
  }

  // The document-level sectPr is always the last section
  configs.push(sectionPropertiesToPageConfig(documentSectPr));

  return configs;
}
