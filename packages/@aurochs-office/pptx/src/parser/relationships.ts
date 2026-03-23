/**
 * @file Unified relationship parsing and loading
 *
 * Single entry point for all relationship operations.
 * Provides RFC 3986 compliant path resolution.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 */

import type { PackageFile } from "@aurochs-office/opc";
import type { ResourceMap } from "@aurochs-office/opc";
import { RELATIONSHIP_TYPES, createEmptyResourceMap } from "../domain/relationships";
import {
  parseRelationshipsFromText as parseRelationshipsFromTextShared,
} from "@aurochs-office/ooxml/parser";
import { getRelationshipPartPath as getRelationshipPartPathShared } from "@aurochs-office/opc";

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
export function loadRelationships(file: PackageFile, partPath: string): ResourceMap {
  const relsPath = getRelationshipPartPathShared(partPath);
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
