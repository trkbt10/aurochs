/**
 * @file OPC (Open Packaging Conventions) infrastructure types
 *
 * Core types for OPC package access and resource resolution.
 * These types represent the infrastructure layer for PPTX processing.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlElement } from "@oxen/xml";

// =============================================================================
// Presentation File Abstraction
// =============================================================================

/**
 * Abstract type for reading presentation files.
 * Users can implement this with any ZIP library (fflate, pako, etc.)
 * or even a filesystem-based implementation for extracted archives.
 */
export type PresentationFile = {
  /**
   * Read an entry as text (UTF-8)
   * @param path - Entry path within the archive (e.g., "ppt/presentation.xml")
   * @returns Text content or null if entry doesn't exist
   */
  readText(path: string): string | null;

  /**
   * Read an entry as binary
   * @param path - Entry path within the archive (e.g., "ppt/media/image1.png")
   * @returns ArrayBuffer or null if entry doesn't exist
   */
  readBinary(path: string): ArrayBuffer | null;

  /**
   * Check if an entry exists
   * @param path - Entry path within the archive
   */
  exists(path: string): boolean;

  /**
   * List all file paths in the archive.
   * Optional for backward compatibility - implementations may not support this.
   * @returns Array of file paths (excludes directories)
   */
  listFiles?(): readonly string[];
};

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
  /** Get all targets matching a relationship type */
  getAllTargetsByType(relType: string): readonly string[];
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
