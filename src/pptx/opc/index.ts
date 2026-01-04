/**
 * @file Open Packaging Conventions (OPC) utilities
 *
 * Consolidated OPC module for ECMA-376 Part 2 structures:
 * - Pack URI and Part Name primitives
 * - [Content_Types].xml parsing
 * - .rels relationship files parsing
 * - Path resolution and data URL creation
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// =============================================================================
// ECMA-376 Part 2 Primitives
// =============================================================================

export * from "./pack-uri";
export * from "./part-name";

// =============================================================================
// Content Types
// =============================================================================

export {
  CONTENT_TYPES,
  RELATIONSHIP_TYPES,
  parseContentTypes,
  extractSlideNumber,
  getRelationshipPath,
  buildSlideFileInfoList,
} from "./content-types";

export type { SlideFileInfo } from "./content-types";

// =============================================================================
// Relationships
// =============================================================================

export {
  parseRelationships,
  findLayoutFilename,
  findMasterFilename,
  findThemeFilename,
  findDiagramDrawingFilename,
  isImageType,
  isHyperlinkType,
} from "./relationships";

// =============================================================================
// Utilities
// =============================================================================

export {
  getMimeTypeFromPath,
  arrayBufferToBase64,
  createDataUrl,
  resolveRelativePath,
  normalizePath,
} from "./utils";

// =============================================================================
// Re-export Domain Types (Canonical Source)
// =============================================================================

export type { ResourceMap, ZipFile, ZipEntry, PlaceholderTable } from "../domain/opc";
