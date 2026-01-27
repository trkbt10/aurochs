/**
 * @file DOCX WordprocessingML Namespace Constants
 *
 * XML namespace URIs and prefixes for WordprocessingML documents.
 *
 * @see ECMA-376 Part 1, Section 17.2 (Document Body)
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 */

// =============================================================================
// XML Namespaces
// =============================================================================

/**
 * Main WordprocessingML namespace (w:).
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML Reference Material)
 */
export const NS_WORDPROCESSINGML = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * DrawingML main namespace (a:).
 *
 * @see ECMA-376 Part 1, Section 20.1 (DrawingML)
 */
export const NS_DRAWINGML = "http://schemas.openxmlformats.org/drawingml/2006/main";

/**
 * DrawingML Picture namespace (pic:).
 *
 * @see ECMA-376 Part 1, Section 20.2 (Picture)
 */
export const NS_DRAWINGML_PICTURE = "http://schemas.openxmlformats.org/drawingml/2006/picture";

/**
 * DrawingML WordprocessingML Drawing namespace (wp:).
 *
 * @see ECMA-376 Part 1, Section 20.4 (WordprocessingML Drawing)
 */
export const NS_DRAWINGML_WORDPROCESSING = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";

/**
 * Relationships namespace (r:).
 *
 * @see ECMA-376 Part 2, Section 9 (Relationships)
 */
export const NS_RELATIONSHIPS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/**
 * Content Types namespace.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export const NS_CONTENT_TYPES = "http://schemas.openxmlformats.org/package/2006/content-types";

/**
 * Package Relationships namespace.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export const NS_PACKAGE_RELATIONSHIPS = "http://schemas.openxmlformats.org/package/2006/relationships";

/**
 * VML namespace (v:) for legacy compatibility.
 *
 * Used for backward compatibility with older documents.
 */
export const NS_VML = "urn:schemas-microsoft-com:vml";

/**
 * Office VML namespace (o:).
 */
export const NS_VML_OFFICE = "urn:schemas-microsoft-com:office:office";

/**
 * Word VML namespace (w10:).
 */
export const NS_VML_WORD = "urn:schemas-microsoft-com:office:word";

/**
 * Math namespace (m:).
 *
 * @see ECMA-376 Part 1, Section 22.1 (Office Math)
 */
export const NS_MATH = "http://schemas.openxmlformats.org/officeDocument/2006/math";

/**
 * Extended Properties namespace.
 */
export const NS_EXTENDED_PROPERTIES = "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties";

/**
 * Core Properties namespace (Dublin Core).
 */
export const NS_CORE_PROPERTIES = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";

/**
 * Custom Properties namespace.
 */
export const NS_CUSTOM_PROPERTIES = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties";

// =============================================================================
// Common Namespace Prefixes
// =============================================================================

/**
 * Standard namespace prefixes used in WordprocessingML documents.
 */
export const NAMESPACE_PREFIXES = {
  w: NS_WORDPROCESSINGML,
  a: NS_DRAWINGML,
  pic: NS_DRAWINGML_PICTURE,
  wp: NS_DRAWINGML_WORDPROCESSING,
  r: NS_RELATIONSHIPS,
  v: NS_VML,
  o: NS_VML_OFFICE,
  w10: NS_VML_WORD,
  m: NS_MATH,
} as const;

// =============================================================================
// Relationship Types
// =============================================================================

/**
 * Relationship type URIs for WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 11.3.10 (Relationship Types)
 */
export const RELATIONSHIP_TYPES = {
  /** Main document part */
  officeDocument: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  /** Styles part */
  styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  /** Numbering definitions part */
  numbering: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",
  /** Font table part */
  fontTable: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable",
  /** Settings part */
  settings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings",
  /** Web settings part */
  webSettings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings",
  /** Theme part */
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
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
  /** Image relationship */
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  /** Hyperlink relationship */
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  /** Embedded package (OLE object) */
  oleObject: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
  /** Package relationship */
  package: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package",
} as const;

// =============================================================================
// Content Types
// =============================================================================

/**
 * Content type strings for WordprocessingML parts.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export const CONTENT_TYPES = {
  /** Main document content type */
  document: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  /** Styles content type */
  styles: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  /** Numbering content type */
  numbering: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
  /** Font table content type */
  fontTable: "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml",
  /** Settings content type */
  settings: "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  /** Web settings content type */
  webSettings: "application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml",
  /** Theme content type */
  theme: "application/vnd.openxmlformats-officedocument.theme+xml",
  /** Header content type */
  header: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
  /** Footer content type */
  footer: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
  /** Footnotes content type */
  footnotes: "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
  /** Endnotes content type */
  endnotes: "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
  /** Comments content type */
  comments: "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
  /** Relationships content type */
  relationships: "application/vnd.openxmlformats-package.relationships+xml",
  /** Core properties content type */
  coreProperties: "application/vnd.openxmlformats-package.core-properties+xml",
} as const;

// =============================================================================
// Default Part Paths
// =============================================================================

/**
 * Default paths for WordprocessingML parts within the OPC package.
 */
export const DEFAULT_PART_PATHS = {
  document: "word/document.xml",
  styles: "word/styles.xml",
  numbering: "word/numbering.xml",
  fontTable: "word/fontTable.xml",
  settings: "word/settings.xml",
  webSettings: "word/webSettings.xml",
  theme: "word/theme/theme1.xml",
  documentRels: "word/_rels/document.xml.rels",
  rootRels: "_rels/.rels",
  contentTypes: "[Content_Types].xml",
} as const;
