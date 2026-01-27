/**
 * @file OPC (Open Packaging Conventions) common types
 *
 * Core types for OPC package access and resource resolution.
 * These types are shared across all OOXML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

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
