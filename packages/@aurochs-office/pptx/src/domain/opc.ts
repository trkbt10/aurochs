/**
 * @file OPC (Open Packaging Conventions) infrastructure types
 *
 * Core types for OPC package access and resource resolution.
 * These types represent the infrastructure layer for PPTX processing.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlElement } from "@aurochs/xml";
import type { PackageFile } from "@aurochs-office/opc";

// =============================================================================
// Presentation File Abstraction
// =============================================================================

/**
 * Abstract type for reading presentation files.
 * Users can implement this with any ZIP library (fflate, pako, etc.)
 * or even a filesystem-based implementation for extracted archives.
 */
export type PresentationFile = PackageFile;

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
