/**
 * @file Content types parsing utilities
 *
 * Parsing and processing for [Content_Types].xml and related constants.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlDocument } from "@oxen/xml";
import { getBasename, getByPath, getChildren } from "@oxen/xml";

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
 */
export const CONTENT_TYPES = {
  SLIDE: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  SLIDE_LAYOUT: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  SLIDE_MASTER: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  THEME: "application/vnd.openxmlformats-officedocument.theme+xml",
  NOTES: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  PRESENTATION: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
} as const;

// =============================================================================
// Functions
// =============================================================================

/**
 * Parse content types from [Content_Types].xml
 * @param contentTypesXml - Parsed content types XML
 * @returns Content types object with slide and layout arrays
 */
export function parseContentTypes(contentTypesXml: XmlDocument): ContentTypes {
  const slidesLocArray: string[] = [];
  const slideLayoutsLocArray: string[] = [];
  const slideMastersLocArray: string[] = [];

  // Get Types element from document
  const typesElement = getByPath(contentTypesXml, ["Types"]);
  if (!typesElement) {
    return { slides: slidesLocArray, slideLayouts: slideLayoutsLocArray, slideMasters: slideMastersLocArray };
  }

  // Get all Override elements
  const overrideArray = getChildren(typesElement, "Override");

  for (const override of overrideArray) {
    const contentType = override.attrs["ContentType"];
    const partName = override.attrs["PartName"];

    if (contentType === undefined || partName === undefined) {
      continue;
    }

    // Remove leading slash from part name
    const normalizedPath = partName.startsWith("/") ? partName.substring(1) : partName;

    switch (contentType) {
      case CONTENT_TYPES.SLIDE:
        slidesLocArray.push(normalizedPath);
        break;
      case CONTENT_TYPES.SLIDE_LAYOUT:
        slideLayoutsLocArray.push(normalizedPath);
        break;
      case CONTENT_TYPES.SLIDE_MASTER:
        slideMastersLocArray.push(normalizedPath);
        break;
    }
  }

  // Sort slides by number
  slidesLocArray.sort((a, b) => {
    const numA = extractSlideNumber(a);
    const numB = extractSlideNumber(b);
    return numA - numB;
  });

  return {
    slides: slidesLocArray,
    slideLayouts: slideLayoutsLocArray,
    slideMasters: slideMastersLocArray,
  };
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
