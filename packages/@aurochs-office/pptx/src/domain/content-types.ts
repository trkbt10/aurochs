/**
 * @file Content types parsing utilities
 *
 * PPTX-specific content type constants and parsing for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1 (PresentationML)
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */

import type { XmlDocument } from "@aurochs/xml";
import { getBasename } from "@aurochs/xml";
import {
  PRESENTATIONML_CONTENT_TYPES,
  DRAWINGML_CONTENT_TYPES,
  OPC_PROPERTY_CONTENT_TYPES,
  parseContentTypes as opcParseContentTypes,
} from "@aurochs-office/opc";

// =============================================================================
// Types
// =============================================================================

/**
 * Content types from [Content_Types].xml
 *
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */
export type ContentTypes = {
  slides: string[];
  slideLayouts: string[];
  slideMasters: string[];
};

/**
 * Slide file info extracted from content types
 *
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */
export type SlideFileInfo = {
  /** Full path to slide XML (e.g., "ppt/slides/slide1.xml") */
  path: string;
  /** Slide number (1-based) */
  number: number;
  /** Filename without extension (e.g., "slide1") */
  filename: string;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Content type constants for PPTX files
 *
 * @see ECMA-376 Part 1, Section 13.3 (PresentationML Content Types)
 */
export const CONTENT_TYPES = {
  SLIDE: PRESENTATIONML_CONTENT_TYPES.slide,
  SLIDE_LAYOUT: PRESENTATIONML_CONTENT_TYPES.slideLayout,
  SLIDE_MASTER: PRESENTATIONML_CONTENT_TYPES.slideMaster,
  THEME: DRAWINGML_CONTENT_TYPES.theme,
  NOTES: PRESENTATIONML_CONTENT_TYPES.notesSlide,
  /** Notes master (§19.3.1.27 CT_NotesMaster) */
  NOTES_MASTER: PRESENTATIONML_CONTENT_TYPES.notesMaster,
  /** Handout master (§19.3.1.24 CT_HandoutMaster) */
  HANDOUT_MASTER: PRESENTATIONML_CONTENT_TYPES.handoutMaster,
  PRESENTATION: PRESENTATIONML_CONTENT_TYPES.presentation,
  /** Presentation properties part (§19.2.1.45 CT_PresentationPr) */
  PRES_PROPS: PRESENTATIONML_CONTENT_TYPES.presProps,
  /** View properties part (§19.2.1.50 CT_ViewPr) */
  VIEW_PROPS: PRESENTATIONML_CONTENT_TYPES.viewProps,
  /** Table styles part (§14.2.9) */
  TABLE_STYLES: PRESENTATIONML_CONTENT_TYPES.tableStyles,
  /** OPC core properties (§11.3) */
  CORE_PROPERTIES: OPC_PROPERTY_CONTENT_TYPES.coreProperties,
  /** Office extended properties (docProps/app.xml) */
  EXTENDED_PROPERTIES: OPC_PROPERTY_CONTENT_TYPES.extendedProperties,
  /** Office custom properties */
  CUSTOM_PROPERTIES: OPC_PROPERTY_CONTENT_TYPES.customProperties,
} as const;

// =============================================================================
// Functions
// =============================================================================

/**
 * Parse content types from [Content_Types].xml
 *
 * Uses OPC's parseContentTypes for core parsing, then extracts PPTX-specific paths.
 *
 * @param contentTypesXml - Parsed content types XML
 * @returns Content types object with slide and layout arrays
 */
export function parseContentTypes(contentTypesXml: XmlDocument): ContentTypes {
  const parsed = opcParseContentTypes(contentTypesXml);

  const slides: string[] = [];
  const slideLayouts: string[] = [];
  const slideMasters: string[] = [];

  for (const [partName, contentType] of parsed.overrides) {
    // Remove leading slash from part name
    const normalizedPath = partName.startsWith("/") ? partName.substring(1) : partName;

    switch (contentType) {
      case CONTENT_TYPES.SLIDE:
        slides.push(normalizedPath);
        break;
      case CONTENT_TYPES.SLIDE_LAYOUT:
        slideLayouts.push(normalizedPath);
        break;
      case CONTENT_TYPES.SLIDE_MASTER:
        slideMasters.push(normalizedPath);
        break;
    }
  }

  // Sort slides by number
  slides.sort((a, b) => extractSlideNumber(a) - extractSlideNumber(b));

  return { slides, slideLayouts, slideMasters };
}

/**
 * Extract slide number from filename
 * @param filename - Slide filename (e.g., "ppt/slides/slide3.xml")
 * @returns Slide number
 */
export function extractSlideNumber(filename: string): number {
  const match = filename.match(/slide(\d+)\.xml$/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Build SlideFileInfo array from content type slide paths
 * @param slidePaths - Array of slide paths from content types
 * @returns Array of SlideFileInfo with path, number, and filename
 */
export function buildSlideFileInfoList(slidePaths: readonly string[]): SlideFileInfo[] {
  return slidePaths.map((path) => {
    const number = extractSlideNumber(path);
    const basename = getBasename(path);
    const filename = basename !== "" ? basename : `slide${number}`;
    return { path, number, filename };
  });
}
