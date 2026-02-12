/**
 * @file OPC Export utilities
 *
 * Common utilities for exporting OPC (Open Packaging Conventions) packages.
 * Used by XLSX, DOCX, PPTX, and other OOXML format exporters.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { createElement, serializeElement } from "@aurochs/xml";
import { OFFICE_RELATIONSHIP_TYPES } from "./ooxml-relationship-types";

// =============================================================================
// Constants
// =============================================================================

/**
 * Standard XML declaration for OPC XML files.
 *
 * @see ECMA-376 Part 2, Section 8.1.1 (XML usage)
 */
export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * OPC content types namespace URI.
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export const CONTENT_TYPES_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/content-types";

/**
 * OPC relationships namespace URI.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export const RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships";

/**
 * Common OPC content type values.
 */
export const OPC_CONTENT_TYPES = {
  /** Content type for relationship parts */
  relationships: "application/vnd.openxmlformats-package.relationships+xml",
  /** Content type for generic XML files */
  xml: "application/xml",
} as const;

/**
 * Common OPC relationship type URIs.
 * @deprecated Use OFFICE_RELATIONSHIP_TYPES from ooxml-relationship-types.ts instead.
 */
export const OPC_RELATIONSHIP_TYPES = {
  /** Relationship to main office document */
  officeDocument: OFFICE_RELATIONSHIP_TYPES.officeDocument,
} as const;

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Serialize an XML element with the standard OPC XML declaration.
 *
 * @param element - The XML element to serialize
 * @returns String containing the XML declaration and serialized element
 */
export function serializeWithDeclaration(element: XmlElement): string {
  return XML_DECLARATION + serializeElement(element);
}

// =============================================================================
// Relationship Types
// =============================================================================

/**
 * Relationship entry for OPC packages.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type OpcRelationship = {
  /** Unique identifier for the relationship (e.g., "rId1") */
  readonly id: string;
  /** Relationship type URI */
  readonly type: string;
  /** Target URI (relative to the source part or the package) */
  readonly target: string;
  /** Target mode - "External" for absolute URIs, omit for internal parts */
  readonly targetMode?: "External";
};

// =============================================================================
// Relationships Serialization
// =============================================================================

/**
 * Serialize a list of relationships to an OPC Relationships XML element.
 *
 * @param relationships - The relationships to serialize
 * @returns XmlElement representing the Relationships part
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 *
 * @example
 * ```typescript
 * const rels: OpcRelationship[] = [
 *   { id: "rId1", type: "http://...", target: "word/document.xml" },
 * ];
 * const element = serializeRelationships(rels);
 * ```
 */
export function serializeRelationships(relationships: readonly OpcRelationship[]): XmlElement {
  const children = relationships.map((rel) => {
    const attrs: Record<string, string> = {
      Id: rel.id,
      Type: rel.type,
      Target: rel.target,
    };
    if (rel.targetMode) {
      attrs.TargetMode = rel.targetMode;
    }
    return createElement("Relationship", attrs);
  });

  return createElement("Relationships", { xmlns: RELATIONSHIPS_NAMESPACE }, children);
}

// =============================================================================
// Content Types Types
// =============================================================================

/**
 * Default content type entry (by file extension).
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export type ContentTypeDefault = {
  readonly kind: "default";
  /** File extension without the dot (e.g., "xml", "rels") */
  readonly extension: string;
  /** Content type MIME string */
  readonly contentType: string;
};

/**
 * Override content type entry (by part name).
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export type ContentTypeOverride = {
  readonly kind: "override";
  /** Part name with leading slash (e.g., "/word/document.xml") */
  readonly partName: string;
  /** Content type MIME string */
  readonly contentType: string;
};

/**
 * Content type entry (either default or override).
 */
export type ContentTypeEntry = ContentTypeDefault | ContentTypeOverride;

// =============================================================================
// Content Types Serialization
// =============================================================================

/**
 * Serialize content type entries to an OPC [Content_Types].xml element.
 *
 * @param entries - The content type entries to serialize
 * @returns XmlElement representing the Types element
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 *
 * @example
 * ```typescript
 * const entries: ContentTypeEntry[] = [
 *   { kind: "default", extension: "xml", contentType: "application/xml" },
 *   { kind: "override", partName: "/word/document.xml", contentType: "..." },
 * ];
 * const element = serializeContentTypes(entries);
 * ```
 */
export function serializeContentTypes(entries: readonly ContentTypeEntry[]): XmlElement {
  const children: XmlNode[] = entries.map((entry) => {
    if (entry.kind === "default") {
      return createElement("Default", {
        Extension: entry.extension,
        ContentType: entry.contentType,
      });
    }
    return createElement("Override", {
      PartName: entry.partName,
      ContentType: entry.contentType,
    });
  });

  return createElement("Types", { xmlns: CONTENT_TYPES_NAMESPACE }, children);
}

// =============================================================================
// Standard Defaults
// =============================================================================

/**
 * Standard OPC default content type entries.
 *
 * These should be included in every OPC package.
 */
export const STANDARD_CONTENT_TYPE_DEFAULTS: readonly ContentTypeDefault[] = [
  { kind: "default", extension: "rels", contentType: OPC_CONTENT_TYPES.relationships },
  { kind: "default", extension: "xml", contentType: OPC_CONTENT_TYPES.xml },
];

// =============================================================================
// Relationship ID Generation
// =============================================================================

/**
 * Create a relationship ID generator.
 *
 * @param startFrom - Starting number (default: 1)
 * @returns Function that returns the next relationship ID
 *
 * @example
 * ```typescript
 * const nextId = createRelationshipIdGenerator();
 * nextId(); // "rId1"
 * nextId(); // "rId2"
 * ```
 */
export function createRelationshipIdGenerator(startFrom: number = 1): () => string {
  // eslint-disable-next-line no-restricted-syntax -- closure counter requires let
  let counter = startFrom;
  return () => {
    const id = `rId${counter}`;
    counter += 1;
    return id;
  };
}
