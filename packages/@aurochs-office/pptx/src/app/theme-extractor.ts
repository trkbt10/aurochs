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

import type { Theme, RawMasterTextStyles } from "../domain";
import type { ColorMap } from "@aurochs-office/drawing-ml/domain/color-context";
import type { XmlElement } from "@aurochs/xml";
import type { PptxBufferInput } from "./pptx-loader";
import { loadPptxFromBuffer } from "./pptx-loader";
import { parseTheme, parseColorMap } from "../parser/theme/theme-parser";
import { parseSlideMaster } from "../parser/slide/slide-parser";
import { getByPath, getAttr, getChild } from "@aurochs/xml";

// =============================================================================
// Types
// =============================================================================

/**
 * Complete extracted theme data from a PPTX/POTX file.
 *
 * Contains all ECMA-376 theme components without information loss.
 */
export type ExtractedTheme = {
  /** Theme name from a:theme@name attribute */
  readonly themeName: string;
  /** Complete parsed theme (colors, fonts, format scheme, custom colors, etc.) */
  readonly theme: Theme;
  /** Color mapping from the first slide master (p:clrMap) §19.3.1.6 */
  readonly colorMap: ColorMap;
  /** Master text styles (p:txStyles) §19.3.1.51 */
  readonly masterTextStyles: RawMasterTextStyles;
  /** Master background element (p:bg) §19.3.1.2 — raw XmlElement for lossless round-trip */
  readonly masterBackground?: XmlElement;
};

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

    // Get the first slide — includes the full layout→master→theme chain
    const slide = presentation.getSlide(1);

    if (slide.theme === null) {
      return { success: false, error: "No theme found in presentation" };
    }

    // Parse complete theme using the authoritative parser
    const theme = parseTheme(slide.theme, slide.themeOverrides);

    // Extract theme name from the a:theme element
    const themeRoot = getByPath(slide.theme, ["a:theme"]);
    const themeName = themeRoot ? (getAttr(themeRoot, "name") ?? "") : "";

    // Extract color map from the slide master §19.3.1.6
    const clrMapElement = slide.master ? getByPath(slide.master, ["p:sldMaster", "p:clrMap"]) : undefined;
    const colorMap = parseColorMap(clrMapElement);

    // Extract master text styles §19.3.1.51 (SoT: parseSlideMaster)
    const parsedMaster = slide.master ? parseSlideMaster(slide.master) : undefined;
    const masterTextStyles = parsedMaster?.textStyles ?? { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined };

    // Extract master background §19.3.1.2 — preserve raw XmlElement for lossless round-trip
    const cSld = slide.master ? getByPath(slide.master, ["p:sldMaster", "p:cSld"]) : undefined;
    const masterBackground = cSld ? getChild(cSld, "p:bg") : undefined;

    return {
      success: true,
      data: { themeName, theme, colorMap, masterTextStyles, masterBackground },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to extract theme: ${message}` };
  }
}
