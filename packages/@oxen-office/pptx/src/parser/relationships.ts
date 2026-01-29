/**
 * @file Unified relationship parsing and loading
 *
 * Single entry point for all relationship operations.
 * Provides RFC 3986 compliant path resolution.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 */

import type { PresentationFile, ResourceMap } from "../domain/opc";
import {
  RELATIONSHIP_TYPES,
  createEmptyResourceMap,
} from "../domain/relationships";
import type { XmlDocument } from "@oxen/xml";
import {
  parseRelationships as parseRelationshipsShared,
  getRelationshipPath as getRelationshipPathShared,
  parseRelationshipsFromText as parseRelationshipsFromTextShared,
  resolvePartPath as resolvePartPathShared,
} from "@oxen-office/ooxml/parser";

/**
 * Resolve a relative URI reference against a base path.
 *
 * Implements RFC 3986 Section 5.2.3 (Merge Paths) and 5.2.4 (Remove Dot Segments).
 * This is the ECMA-376 compliant way to resolve OPC relationship Target attributes.
 *
 * @param basePath - Source part path (e.g., "ppt/slides/slide1.xml")
 * @param reference - Relative URI reference (e.g., "../media/image1.png")
 * @returns Resolved absolute path (e.g., "ppt/media/image1.png")
 *
 * @see ECMA-376 Part 2, Section 9.3.3 (Resolving Part Name)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 *
 * @example
 * resolvePartPath("ppt/slides/slide1.xml", "../media/image1.png")
 * // => "ppt/media/image1.png"
 *
 * resolvePartPath("ppt/slides/slide1.xml", "slide2.xml")
 * // => "ppt/slides/slide2.xml"
 */
export function resolvePartPath(basePath: string, reference: string): string {
  return resolvePartPathShared(basePath, reference);
}

// =============================================================================
// Relationship File Path
// =============================================================================

/**
 * Get the .rels file path for a given part.
 *
 * Per ECMA-376, relationships are stored in _rels/[partname].rels
 *
 * @param partPath - Part path (e.g., "ppt/slides/slide1.xml")
 * @returns Relationship file path (e.g., "ppt/slides/_rels/slide1.xml.rels")
 *
 * @see ECMA-376 Part 2, Section 9.3.1 (Relationship Part)
 *
 * @example
 * getRelationshipPath("ppt/slides/slide1.xml")
 * // => "ppt/slides/_rels/slide1.xml.rels"
 *
 * getRelationshipPath("ppt/presentation.xml")
 * // => "ppt/_rels/presentation.xml.rels"
 */
export function getRelationshipPath(partPath: string): string {
  return getRelationshipPathShared(partPath);
}

// =============================================================================
// Relationship Parsing
// =============================================================================

/**
 * Parse relationships from .rels XML document.
 *
 * Resolves all relative paths using RFC 3986 against the source part path.
 *
 * @param relsXml - Parsed .rels XML document
 * @param sourcePath - Path of the source part (for resolving relative targets)
 * @returns ResourceMap for querying relationships
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function parseRelationships(
  relsXml: XmlDocument | null,
  sourcePath: string,
): ResourceMap {
  return parseRelationshipsShared(relsXml, sourcePath);
}

// =============================================================================
// High-Level Loading
// =============================================================================

/**
 * Load relationships for a part from a presentation file.
 *
 * This is the primary entry point for relationship loading.
 * Combines file reading and parsing in one operation.
 *
 * @param file - Presentation file
 * @param partPath - Path of the part (e.g., "ppt/slides/slide1.xml")
 * @returns ResourceMap for querying relationships
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function loadRelationships(
  file: PresentationFile,
  partPath: string,
): ResourceMap {
  const relsPath = getRelationshipPathShared(partPath);
  const relsText = file.readText(relsPath);
  if (relsText === null) {
    return createEmptyResourceMap();
  }
  return parseRelationshipsFromTextShared(relsText, partPath);
}

// =============================================================================
// Relationship Finders
// =============================================================================

/**
 * Find slide layout path from slide relationships.
 */
export function findLayoutPath(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.SLIDE_LAYOUT);
}

/**
 * Find slide master path from layout relationships.
 */
export function findMasterPath(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.SLIDE_MASTER);
}

/**
 * Find theme path from master relationships.
 */
export function findThemePath(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.THEME);
}

/**
 * Find diagram drawing path from relationships.
 */
export function findDiagramDrawingPath(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.DIAGRAM_DRAWING);
}

/**
 * Find all image paths from relationships.
 */
export function findImagePaths(resources: ResourceMap): readonly string[] {
  return resources.getAllTargetsByType(RELATIONSHIP_TYPES.IMAGE);
}
