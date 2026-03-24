/**
 * @file Archive access interface for reading files from OOXML packages
 *
 * Provides the canonical interface for reading files and resolving
 * relationship IDs within an OOXML ZIP archive. This is the base
 * abstraction shared by FileReader, ResourceContext, BackgroundContext, etc.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

/**
 * Base interface for reading files from an OOXML package archive.
 *
 * This is the single source of truth for the "read file + resolve relationship ID"
 * capability. All contexts that need archive access should extend or compose this type.
 */
export type ArchiveAccess = {
  /** Read a file from the package by its part path */
  readonly readFile: (path: string) => ArrayBuffer | null;
  /** Resolve a relationship ID (rId) to a target part path */
  readonly resolveResource: (id: string) => string | undefined;
};
