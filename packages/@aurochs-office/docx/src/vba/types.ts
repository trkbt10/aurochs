/**
 * @file Word VBA Host Object Type Definitions
 *
 * Defines the host object types for Word VBA runtime integration.
 * These types represent the Word object model as seen from VBA.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

import type { HostObject } from "@aurochs-office/vba";

// =============================================================================
// Base Type
// =============================================================================

/**
 * Base type for Word host objects with specific host type.
 */
type WordHostObjectBase<T extends string> = HostObject & {
  readonly hostType: T;
};

// =============================================================================
// Application Object
// =============================================================================

/**
 * Word Application object.
 *
 * Represents the Word application instance.
 */
export type WordApplicationObject = WordHostObjectBase<"Application"> & {
  readonly _app: true;
};

/**
 * Type guard for Application object.
 */
export function isApplicationObject(obj: HostObject): obj is WordApplicationObject {
  return obj.hostType === "Application";
}

// =============================================================================
// Document Object
// =============================================================================

/**
 * Word Document object.
 *
 * Represents a Word document.
 */
export type WordDocumentObject = WordHostObjectBase<"Document"> & {
  readonly _documentId: string;
};

/**
 * Type guard for Document object.
 */
export function isDocumentObject(obj: HostObject): obj is WordDocumentObject {
  return obj.hostType === "Document";
}

// =============================================================================
// Paragraphs Collection Object
// =============================================================================

/**
 * Word Paragraphs collection object.
 *
 * Represents the collection of paragraphs in a document.
 */
export type WordParagraphsObject = WordHostObjectBase<"Paragraphs"> & {
  readonly _documentId: string;
};

/**
 * Type guard for Paragraphs object.
 */
export function isParagraphsObject(obj: HostObject): obj is WordParagraphsObject {
  return obj.hostType === "Paragraphs";
}

// =============================================================================
// Paragraph Object
// =============================================================================

/**
 * Word Paragraph object.
 *
 * Represents a single paragraph in the document.
 */
export type WordParagraphObject = WordHostObjectBase<"Paragraph"> & {
  readonly _documentId: string;
  readonly _paragraphIndex: number;
};

/**
 * Type guard for Paragraph object.
 */
export function isParagraphObject(obj: HostObject): obj is WordParagraphObject {
  return obj.hostType === "Paragraph";
}

// =============================================================================
// Range Object
// =============================================================================

/**
 * Word Range object.
 *
 * Represents a contiguous area in a document, defined by start and end positions.
 * Position is measured in characters from the beginning of the document.
 */
export type WordRangeObject = WordHostObjectBase<"Range"> & {
  readonly _documentId: string;
  readonly _start: number;
  readonly _end: number;
};

/**
 * Type guard for Range object.
 */
export function isRangeObject(obj: HostObject): obj is WordRangeObject {
  return obj.hostType === "Range";
}

// =============================================================================
// Selection Object
// =============================================================================

/**
 * Word Selection object.
 *
 * Represents the current selection in the document window.
 */
export type WordSelectionObject = WordHostObjectBase<"Selection"> & {
  readonly _documentId: string;
};

/**
 * Type guard for Selection object.
 */
export function isSelectionObject(obj: HostObject): obj is WordSelectionObject {
  return obj.hostType === "Selection";
}

// =============================================================================
// Union Types
// =============================================================================

/**
 * Union of all Word host object types.
 */
export type WordHostObject =
  | WordApplicationObject
  | WordDocumentObject
  | WordParagraphsObject
  | WordParagraphObject
  | WordRangeObject
  | WordSelectionObject;
