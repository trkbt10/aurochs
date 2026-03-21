/**
 * @file Theme extractor
 *
 * Extracts complete theme data from PPTX/POTX files using the standard
 * OPC relationship chain: presentation → slide → layout → master → theme.
 *
 * Uses existing infrastructure (loadPptxFromBuffer, loadRelationships,
 * parseTheme) instead of hand-rolling XML/rels parsing.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 * @see ECMA-376 Part 2, Section 9.3 - Relationships
 */

import type { ExtractedTheme } from "../domain";
import type { PptxBufferInput } from "./pptx-loader";
import { loadPptxFromBuffer } from "./pptx-loader";
import { extractThemeData } from "../parser/theme/theme-parser";

/**
 * Result of theme extraction.
 */
export type ThemeExtractionResult =
  | { readonly success: true; readonly data: ExtractedTheme }
  | { readonly success: false; readonly error: string };

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extract complete theme from a PPTX/POTX buffer.
 *
 * Follows the standard OPC relationship chain to locate the theme:
 * presentation.xml → slide → slideLayout → slideMaster → theme
 *
 * All path resolution is RFC 3986 compliant via the existing
 * relationship parser infrastructure.
 *
 * @param buffer - PPTX or POTX file contents
 * @returns Complete theme data or error
 */
export async function extractThemeFromBuffer(buffer: PptxBufferInput): Promise<ThemeExtractionResult> {
  try {
    const loaded = await loadPptxFromBuffer(buffer);
    const presentation = loaded.presentation;

    if (presentation.count === 0) {
      return { success: false, error: "Presentation has no slides" };
    }

    const slide = presentation.getSlide(1);
    const data = extractThemeData({
      theme: slide.theme,
      themeOverrides: slide.themeOverrides,
      master: slide.master,
    });

    if (!data) {
      return { success: false, error: "No theme found in presentation" };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to extract theme: ${message}` };
  }
}
