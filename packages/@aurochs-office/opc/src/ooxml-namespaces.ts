/**
 * @file OOXML XML Namespace URIs
 *
 * XML namespace URIs used across OOXML packages.
 * These are used for xmlns attributes in XML elements.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 1 (Office Open XML)
 */

// =============================================================================
// OPC (Package-Level) Namespaces
// =============================================================================

/**
 * OPC package-level namespace URIs.
 *
 * @see ECMA-376 Part 2 (OPC)
 */
export const OPC_NAMESPACES = {
  /** Content Types namespace */
  contentTypes: "http://schemas.openxmlformats.org/package/2006/content-types",
  /** Relationships namespace */
  relationships: "http://schemas.openxmlformats.org/package/2006/relationships",
  /** Core Properties (Dublin Core) namespace */
  coreProperties: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
  /** Markup Compatibility namespace */
  markupCompatibility: "http://schemas.openxmlformats.org/markup-compatibility/2006",
} as const;

// =============================================================================
// Office Document Namespaces
// =============================================================================

/**
 * Common Office document namespace URIs.
 *
 * @see ECMA-376 Part 1, Section 17 (Office Document)
 */
export const OFFICE_NAMESPACES = {
  /** Relationships (r:) */
  relationships: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  /** Office Math (m:) */
  math: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  /** Extended Properties */
  extendedProperties: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
  /** Custom Properties */
  customProperties: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
} as const;

// =============================================================================
// DrawingML Namespaces
// =============================================================================

/**
 * DrawingML namespace URIs.
 *
 * @see ECMA-376 Part 1, Section 20 (DrawingML)
 */
export const DRAWINGML_NAMESPACES = {
  /** Main DrawingML (a:) */
  main: "http://schemas.openxmlformats.org/drawingml/2006/main",
  /** Picture (pic:) */
  picture: "http://schemas.openxmlformats.org/drawingml/2006/picture",
  /** Chart (c:) */
  chart: "http://schemas.openxmlformats.org/drawingml/2006/chart",
  /** Diagram */
  diagram: "http://schemas.openxmlformats.org/drawingml/2006/diagram",
  /** WordprocessingML Drawing (wp:) */
  wordprocessingDrawing: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  /** SpreadsheetML Drawing (xdr:) */
  spreadsheetDrawing: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
} as const;

// =============================================================================
// PresentationML Namespaces
// =============================================================================

/**
 * PresentationML namespace URIs.
 *
 * @see ECMA-376 Part 1, Section 13 (PresentationML)
 */
export const PRESENTATIONML_NAMESPACES = {
  /** Main PresentationML (p:) */
  main: "http://schemas.openxmlformats.org/presentationml/2006/main",
} as const;

// =============================================================================
// WordprocessingML Namespaces
// =============================================================================

/**
 * WordprocessingML namespace URIs.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */
export const WORDPROCESSINGML_NAMESPACES = {
  /** Main WordprocessingML (w:) */
  main: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
} as const;

// =============================================================================
// SpreadsheetML Namespaces
// =============================================================================

/**
 * SpreadsheetML namespace URIs.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */
export const SPREADSHEETML_NAMESPACES = {
  /** Main SpreadsheetML */
  main: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
} as const;

// =============================================================================
// Microsoft Extensions Namespaces
// =============================================================================

/**
 * Microsoft Office extension namespace URIs.
 */
export const MS_OFFICE_NAMESPACES = {
  /** Word 2010 wordprocessingCanvas */
  wordprocessingCanvas: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
  /** Office 2007 diagram drawing */
  diagramDrawing: "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing",
} as const;

// =============================================================================
// VML (Legacy) Namespaces
// =============================================================================

/**
 * VML namespace URIs for legacy compatibility.
 */
export const VML_NAMESPACES = {
  /** VML (v:) */
  vml: "urn:schemas-microsoft-com:vml",
  /** Office VML (o:) */
  office: "urn:schemas-microsoft-com:office:office",
  /** Word VML (w10:) */
  word: "urn:schemas-microsoft-com:office:word",
} as const;
