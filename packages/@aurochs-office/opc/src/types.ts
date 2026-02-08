/**
 * @file OPC (Open Packaging Conventions) core types
 *
 * Core types for OPC package access and relationship-based resource resolution.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// =============================================================================
// Package File Abstraction
// =============================================================================

/**
 * Abstract type for reading files from an OPC package (ZIP).
 *
 * This interface is intentionally minimal and browser-safe.
 */
export type PackageFile = {
  /**
   * Read an entry as text (UTF-8).
   * @param path - Entry path within the archive (e.g., "ppt/presentation.xml")
   * @returns Text content or null if entry doesn't exist
   */
  readText(path: string): string | null;

  /**
   * Read an entry as binary.
   * @param path - Entry path within the archive (e.g., "ppt/media/image1.png")
   * @returns ArrayBuffer or null if entry doesn't exist
   */
  readBinary(path: string): ArrayBuffer | null;

  /**
   * Check if an entry exists.
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

