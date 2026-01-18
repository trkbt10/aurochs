/**
 * @file DOCX Section Properties to Page Configuration Adapter
 *
 * Converts DOCX section properties (sectPr) to page flow configuration.
 * Uses ECMA-376 specification defaults when values are not explicitly set.
 *
 * @see ECMA-376-1:2016 Section 17.6 (Sections)
 */

import type { DocxSectionProperties } from "../../docx/domain/section";
import type { PageFlowConfig } from "../page-flow";
import type { WritingMode } from "../types";
import {
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  SPEC_DEFAULT_TEXT_DIRECTION,
  twipsToPx,
} from "../../docx/domain/ecma376-defaults";
import { textDirectionToWritingMode } from "../writing-mode";
import type { EcmaTextDirection } from "../../docx/domain/ecma376-defaults";

// =============================================================================
// Section Properties to Page Configuration
// =============================================================================

/**
 * Convert DOCX section properties to page flow configuration.
 *
 * This function derives page dimensions and margins from sectPr,
 * falling back to ECMA-376 specification defaults when not specified.
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

  // Determine writing mode from section bidi property
  // Note: The exact text direction should come from textDirection element
  // but it's often derived from the bidi flag for sections
  const textDirection: EcmaTextDirection = sectPr?.bidi === true ? "tbRl" : SPEC_DEFAULT_TEXT_DIRECTION;
  const writingMode: WritingMode = textDirectionToWritingMode(textDirection);

  return {
    pageWidth: twipsToPx(pgSz?.w ?? SPEC_DEFAULT_PAGE_WIDTH_TWIPS),
    pageHeight: twipsToPx(pgSz?.h ?? SPEC_DEFAULT_PAGE_HEIGHT_TWIPS),
    marginTop: twipsToPx(pgMar?.top ?? SPEC_DEFAULT_MARGIN_TWIPS),
    marginBottom: twipsToPx(pgMar?.bottom ?? SPEC_DEFAULT_MARGIN_TWIPS),
    marginLeft: twipsToPx(pgMar?.left ?? SPEC_DEFAULT_MARGIN_TWIPS),
    marginRight: twipsToPx(pgMar?.right ?? SPEC_DEFAULT_MARGIN_TWIPS),
    writingMode,
    widowLines: 2,
    orphanLines: 2,
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
