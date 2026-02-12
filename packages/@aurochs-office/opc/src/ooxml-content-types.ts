/**
 * @file OOXML Internal Content Types
 *
 * Content types used inside OOXML packages ([Content_Types].xml).
 * These are the `.main+xml` format used for internal package parts.
 *
 * Note: These are different from HTTP download MIME types (`.12` format).
 * - Internal: `application/vnd.ms-excel.sheet.macroEnabled.main+xml`
 * - Download: `application/vnd.ms-excel.sheet.macroEnabled.12`
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 4 (SpreadsheetML)
 * @see ECMA-376 Part 1, Section 15 (PresentationML)
 * @see ECMA-376 Part 1, Section 11 (WordprocessingML)
 */

// =============================================================================
// SpreadsheetML Content Types (XLSX/XLSM)
// =============================================================================

/**
 * SpreadsheetML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */
export const SPREADSHEETML_CONTENT_TYPES = {
  /** Main workbook */
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  /** Macro-enabled workbook (xlsm) */
  workbookMacroEnabled: "application/vnd.ms-excel.sheet.macroEnabled.main+xml",
  /** Worksheet */
  worksheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  /** Styles */
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  /** Shared strings */
  sharedStrings: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
  /** Excel macro sheet */
  macrosheet: "application/vnd.ms-excel.macrosheet+xml",
} as const;

// =============================================================================
// PresentationML Content Types (PPTX/PPTM/PPSM)
// =============================================================================

/**
 * PresentationML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1, Section 15 (PresentationML)
 */
export const PRESENTATIONML_CONTENT_TYPES = {
  /** Main presentation */
  presentation: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  /** Macro-enabled presentation (pptm) */
  presentationMacroEnabled: "application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml",
  /** Macro-enabled slideshow (ppsm) */
  slideshowMacroEnabled: "application/vnd.ms-powerpoint.slideshow.macroEnabled.main+xml",
  /** Slide */
  slide: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  /** Slide layout */
  slideLayout: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  /** Slide master */
  slideMaster: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  /** Notes slide */
  notesSlide: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  /** Comments */
  comments: "application/vnd.openxmlformats-officedocument.presentationml.comments+xml",
  /** Comment authors */
  commentAuthors: "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml",
} as const;

// =============================================================================
// WordprocessingML Content Types (DOCX/DOCM)
// =============================================================================

/**
 * WordprocessingML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1, Section 11 (WordprocessingML)
 */
export const WORDPROCESSINGML_CONTENT_TYPES = {
  /** Main document */
  document: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  /** Macro-enabled document (docm) */
  documentMacroEnabled: "application/vnd.ms-word.document.macroEnabled.main+xml",
  /** Styles */
  styles: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  /** Numbering */
  numbering: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
  /** Font table */
  fontTable: "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml",
  /** Settings */
  settings: "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  /** Web settings */
  webSettings: "application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml",
  /** Header */
  header: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
  /** Footer */
  footer: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
  /** Footnotes */
  footnotes: "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
  /** Endnotes */
  endnotes: "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
  /** Comments */
  comments: "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
} as const;

// =============================================================================
// DrawingML Content Types (Shared)
// =============================================================================

/**
 * DrawingML content types for [Content_Types].xml.
 *
 * @see ECMA-376 Part 1, Section 20 (DrawingML)
 */
export const DRAWINGML_CONTENT_TYPES = {
  /** Theme */
  theme: "application/vnd.openxmlformats-officedocument.theme+xml",
  /** Chart */
  chart: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
} as const;

// =============================================================================
// OLE Object Content Types
// =============================================================================

/**
 * Content types for embedded OLE objects.
 *
 * These are used for embedded Office documents (not macro-enabled).
 */
export const OLE_CONTENT_TYPES = {
  /** Embedded Excel workbook */
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  /** Embedded Word document */
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  /** Embedded PowerPoint presentation */
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;
