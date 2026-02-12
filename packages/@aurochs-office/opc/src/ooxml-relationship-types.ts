/**
 * @file OOXML Relationship Types
 *
 * Relationship type URIs used in OOXML packages (.rels files).
 * These are used to define relationships between parts in OPC packages.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 1 (PresentationML, WordprocessingML, SpreadsheetML)
 */

// =============================================================================
// Common Office Document Relationship Types
// =============================================================================

/**
 * Common relationship types shared across all Office formats.
 *
 * @see ECMA-376 Part 2, Annex F (Relationship Types)
 */
export const OFFICE_RELATIONSHIP_TYPES = {
  /** Main office document (workbook, document, presentation) */
  officeDocument: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  /** Theme relationship */
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  /** Theme override relationship */
  themeOverride: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/themeOverride",
  /** Image relationship */
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  /** Chart relationship */
  chart: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  /** Hyperlink relationship */
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  /** OLE object relationship */
  oleObject: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
  /** Embedded package relationship */
  package: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package",
  /** VML drawing relationship */
  vmlDrawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
  /** Video relationship */
  video: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
  /** Audio relationship */
  audio: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
  /** Styles relationship */
  styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  /** Font relationship */
  font: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font",
  /** VBA project relationship */
  vbaProject: "http://schemas.microsoft.com/office/2006/relationships/vbaProject",
} as const;

// =============================================================================
// PresentationML Relationship Types (PPTX/PPTM/PPSM)
// =============================================================================

/**
 * PresentationML-specific relationship types.
 *
 * @see ECMA-376 Part 1, Section 13 (PresentationML)
 */
export const PRESENTATIONML_RELATIONSHIP_TYPES = {
  /** Slide relationship (presentation.xml -> slideN.xml) */
  slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  /** Slide layout relationship */
  slideLayout: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
  /** Slide master relationship */
  slideMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
  /** Notes slide relationship */
  notesSlide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  /** Notes master relationship */
  notesMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
  /** Handout master relationship */
  handoutMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster",
  /** Comments relationship */
  comments: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  /** Comment authors relationship */
  commentAuthors: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
  /** Diagram drawing relationship (DrawingML diagrams) */
  diagramDrawing: "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing",
} as const;

// =============================================================================
// WordprocessingML Relationship Types (DOCX/DOCM)
// =============================================================================

/**
 * WordprocessingML-specific relationship types.
 *
 * @see ECMA-376 Part 1, Section 11.3.10 (Relationship Types)
 */
export const WORDPROCESSINGML_RELATIONSHIP_TYPES = {
  /** Numbering definitions part */
  numbering: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",
  /** Font table part */
  fontTable: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable",
  /** Settings part */
  settings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings",
  /** Web settings part */
  webSettings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings",
  /** Header part */
  header: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header",
  /** Footer part */
  footer: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer",
  /** Footnotes part */
  footnotes: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes",
  /** Endnotes part */
  endnotes: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes",
  /** Comments part */
  comments: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
} as const;

// =============================================================================
// SpreadsheetML Relationship Types (XLSX/XLSM)
// =============================================================================

/**
 * SpreadsheetML-specific relationship types.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */
export const SPREADSHEETML_RELATIONSHIP_TYPES = {
  /** Worksheet relationship */
  worksheet: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  /** Shared strings relationship */
  sharedStrings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
  /** Calculation chain relationship */
  calcChain: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain",
  /** Excel macro sheet relationship */
  xlMacrosheet: "http://schemas.microsoft.com/office/2006/relationships/xlMacrosheet",
} as const;
