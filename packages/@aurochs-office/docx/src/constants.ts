/**
 * @file DOCX WordprocessingML Namespace Constants
 *
 * XML namespace URIs and prefixes for WordprocessingML documents.
 *
 * @see ECMA-376 Part 1, Section 17.2 (Document Body)
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 */

import {
  WORDPROCESSINGML_NAMESPACES,
  DRAWINGML_NAMESPACES,
  OFFICE_NAMESPACES,
  OPC_NAMESPACES,
  VML_NAMESPACES,
} from "@aurochs-office/opc";

// =============================================================================
// XML Namespaces (re-exports from OPC for backward compatibility)
// =============================================================================

/**
 * Main WordprocessingML namespace (w:).
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML Reference Material)
 */
export const NS_WORDPROCESSINGML = WORDPROCESSINGML_NAMESPACES.main;

/**
 * DrawingML main namespace (a:).
 *
 * @see ECMA-376 Part 1, Section 20.1 (DrawingML)
 */
export const NS_DRAWINGML = DRAWINGML_NAMESPACES.main;

/**
 * DrawingML Picture namespace (pic:).
 *
 * @see ECMA-376 Part 1, Section 20.2 (Picture)
 */
export const NS_DRAWINGML_PICTURE = DRAWINGML_NAMESPACES.picture;

/**
 * DrawingML WordprocessingML Drawing namespace (wp:).
 *
 * @see ECMA-376 Part 1, Section 20.4 (WordprocessingML Drawing)
 */
export const NS_DRAWINGML_WORDPROCESSING = DRAWINGML_NAMESPACES.wordprocessingDrawing;

/**
 * Relationships namespace (r:).
 *
 * @see ECMA-376 Part 2, Section 9 (Relationships)
 */
export const NS_RELATIONSHIPS = OFFICE_NAMESPACES.relationships;

/**
 * Content Types namespace.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export const NS_CONTENT_TYPES = OPC_NAMESPACES.contentTypes;

/**
 * Package Relationships namespace.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export const NS_PACKAGE_RELATIONSHIPS = OPC_NAMESPACES.relationships;

/**
 * VML namespace (v:) for legacy compatibility.
 *
 * Used for backward compatibility with older documents.
 */
export const NS_VML = VML_NAMESPACES.vml;

/**
 * Office VML namespace (o:).
 */
export const NS_VML_OFFICE = VML_NAMESPACES.office;

/**
 * Word VML namespace (w10:).
 */
export const NS_VML_WORD = VML_NAMESPACES.word;

/**
 * Math namespace (m:).
 *
 * @see ECMA-376 Part 1, Section 22.1 (Office Math)
 */
export const NS_MATH = OFFICE_NAMESPACES.math;

/**
 * Extended Properties namespace.
 */
export const NS_EXTENDED_PROPERTIES = OFFICE_NAMESPACES.extendedProperties;

/**
 * Core Properties namespace (Dublin Core).
 */
export const NS_CORE_PROPERTIES = OPC_NAMESPACES.coreProperties;

/**
 * Custom Properties namespace.
 */
export const NS_CUSTOM_PROPERTIES = OFFICE_NAMESPACES.customProperties;

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

import {
  WORDPROCESSINGML_CONTENT_TYPES,
  DRAWINGML_CONTENT_TYPES,
  OFFICE_RELATIONSHIP_TYPES,
  WORDPROCESSINGML_RELATIONSHIP_TYPES,
} from "@aurochs-office/opc";

/**
 * Relationship type URIs for WordprocessingML.
 *
 * Re-exports from @aurochs-office/opc.
 *
 * @see ECMA-376 Part 1, Section 11.3.10 (Relationship Types)
 */
export const RELATIONSHIP_TYPES = {
  /** Main document part */
  officeDocument: OFFICE_RELATIONSHIP_TYPES.officeDocument,
  /** Styles part */
  styles: OFFICE_RELATIONSHIP_TYPES.styles,
  /** Numbering definitions part */
  numbering: WORDPROCESSINGML_RELATIONSHIP_TYPES.numbering,
  /** Font table part */
  fontTable: WORDPROCESSINGML_RELATIONSHIP_TYPES.fontTable,
  /** Settings part */
  settings: WORDPROCESSINGML_RELATIONSHIP_TYPES.settings,
  /** Web settings part */
  webSettings: WORDPROCESSINGML_RELATIONSHIP_TYPES.webSettings,
  /** Theme part */
  theme: OFFICE_RELATIONSHIP_TYPES.theme,
  /** Header part */
  header: WORDPROCESSINGML_RELATIONSHIP_TYPES.header,
  /** Footer part */
  footer: WORDPROCESSINGML_RELATIONSHIP_TYPES.footer,
  /** Footnotes part */
  footnotes: WORDPROCESSINGML_RELATIONSHIP_TYPES.footnotes,
  /** Endnotes part */
  endnotes: WORDPROCESSINGML_RELATIONSHIP_TYPES.endnotes,
  /** Comments part */
  comments: WORDPROCESSINGML_RELATIONSHIP_TYPES.comments,
  /** Image relationship */
  image: OFFICE_RELATIONSHIP_TYPES.image,
  /** Hyperlink relationship */
  hyperlink: OFFICE_RELATIONSHIP_TYPES.hyperlink,
  /** Embedded package (OLE object) */
  oleObject: OFFICE_RELATIONSHIP_TYPES.oleObject,
  /** Package relationship */
  package: OFFICE_RELATIONSHIP_TYPES.package,
} as const;

// =============================================================================
// Content Types
// =============================================================================

/**
 * Content type strings for WordprocessingML parts.
 *
 * Re-exports from @aurochs-office/opc with additional package-level types.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see MS-OFFMACRO2 Section 2.2.1.4 (macroEnabled content types)
 */
export const CONTENT_TYPES = {
  ...WORDPROCESSINGML_CONTENT_TYPES,
  /** Theme content type (from DrawingML) */
  theme: DRAWINGML_CONTENT_TYPES.theme,
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
