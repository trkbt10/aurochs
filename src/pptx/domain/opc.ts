/**
 * @file OPC (Open Packaging Conventions) infrastructure types
 *
 * Core types for OPC package access and resource resolution.
 * These types represent the infrastructure layer for PPTX processing.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlElement } from "../../xml/index";

// =============================================================================
// Zip Package Types (ECMA-376 Part 2, Section 8)
// =============================================================================

/**
 * Zip file interface for OPC package access.
 *
 * @see ECMA-376 Part 2, Section 8 (Physical Package)
 */
export type ZipFile = {
  file(path: string): ZipEntry | null;
  /** Load new zip data. Optional - only needed for initial loading. */
  load?(data: ArrayBuffer): ZipFile;
};

/**
 * Zip entry interface for file access.
 */
export type ZipEntry = {
  asText(): string;
  asArrayBuffer(): ArrayBuffer;
};

// =============================================================================
// Resource Resolution Types (ECMA-376 Part 2, Section 9.3)
// =============================================================================

/**
 * Resource map for relationship ID resolution.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type ResourceMap = {
  /** Get target path by relationship ID */
  getTarget(rId: string): string | undefined;
  /** Get relationship type by ID */
  getType(rId: string): string | undefined;
  /** Get first target matching a relationship type */
  getTargetByType(relType: string): string | undefined;
};

// =============================================================================
// Placeholder Types (ECMA-376 Part 1, Section 19.3.1.36)
// =============================================================================

/**
 * Placeholder lookup table.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */
export type PlaceholderTable = {
  /** Shapes indexed by p:ph/@idx (xsd:unsignedInt) */
  readonly byIdx: Map<number, XmlElement>;
  /** Shapes indexed by p:ph/@type (ST_PlaceholderType) */
  readonly byType: Record<string, XmlElement>;
};
