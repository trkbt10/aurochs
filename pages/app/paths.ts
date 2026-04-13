/**
 * @file Single source of truth for all route paths in the app.
 *
 * Route definitions (routes.tsx) and navigation calls (AppContext.tsx)
 * both reference these constants, so renaming or restructuring paths
 * only requires changes in this file.
 */

// =============================================================================
// Static paths
// =============================================================================

export const PATHS = {
  home: "/",

  // PPTX
  pptxViewer: "/pptx/viewer",
  pptxEditor: "/pptx/editor",
  pptxSuite: "/pptx/suite",

  // DOCX
  docxViewer: "/docx/viewer",
  docxEditor: "/docx/editor",

  // XLSX
  xlsxViewer: "/xlsx/viewer",
  xlsxEditor: "/xlsx/editor",

  // PDF
  pdfViewer: "/pdf/viewer",
  pdfEditor: "/pdf/editor",

  // POTX
  potxEditor: "/potx/editor",
  potxTextEditDev: "/potx/editor/dev/text-edit",

  // Fig
  figViewer: "/fig/viewer",
  figEditor: "/fig/editor",
} as const;

// =============================================================================
// Parameterized paths
// =============================================================================

/** Route pattern for react-router (contains :param placeholders). */
export const PATH_PATTERNS = {
  pptxSlideshow: "/pptx/slideshow/:slideNumber",
} as const;

/** Build a concrete path for navigation. */
export function pptxSlideshowPath(slideNumber: number): string {
  return `/pptx/slideshow/${slideNumber}`;
}
