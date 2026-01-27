/**
 * @file Media discovery via OPC relationships
 *
 * Discovers embedded media files by traversing OPC relationships.
 * This is the ECMA-376 compliant approach to finding media parts.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { PresentationFile } from "../domain";
import { parseContentTypes } from "../opc/content-types";
import { readXml, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../parser/slide/xml-reader";
import { loadRelationships } from "../parser/relationships";
import { RELATIONSHIP_TYPES } from "../domain/relationships";
import { parseAppVersion } from "./presentation-info";

// =============================================================================
// Types
// =============================================================================

export type MediaInfo = {
  /** Full path within the package (e.g., "ppt/media/image1.png") */
  readonly path: string;
  /** Relationship type that referenced this media */
  readonly relationType: string;
  /** Source part that references this media */
  readonly referencedFrom: string;
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Discover all media files referenced by relationships in the presentation.
 *
 * This function traverses:
 * - Slide relationships (for embedded images)
 * - Layout relationships (for background images)
 * - Master relationships (for master background images)
 *
 * @param file - Presentation file
 * @returns Array of discovered media paths (deduplicated)
 */
export function discoverMediaPaths(file: PresentationFile): readonly string[] {
  const appVersion = resolveAppVersion(file);
  const contentTypesXml = readXml(
    file,
    "[Content_Types].xml",
    appVersion,
    false,
    DEFAULT_MARKUP_COMPATIBILITY_OPTIONS,
  );

  if (contentTypesXml === null) {
    return [];
  }

  const contentTypes = parseContentTypes(contentTypesXml);
  const mediaPaths = new Set<string>();

  // Traverse slides
  for (const slidePath of contentTypes.slides) {
    collectMediaFromRelationships(file, slidePath, mediaPaths);
  }

  // Traverse layouts
  for (const layoutPath of contentTypes.slideLayouts) {
    collectMediaFromRelationships(file, layoutPath, mediaPaths);
  }

  // Traverse masters (for background images, etc.)
  for (const masterPath of contentTypes.slideMasters) {
    collectMediaFromRelationships(file, masterPath, mediaPaths);
  }

  // Sort and return
  return Array.from(mediaPaths).sort();
}

/**
 * Discover media files with detailed information.
 *
 * @param file - Presentation file
 * @returns Array of MediaInfo objects
 */
export function discoverMedia(file: PresentationFile): readonly MediaInfo[] {
  const appVersion = resolveAppVersion(file);
  const contentTypesXml = readXml(
    file,
    "[Content_Types].xml",
    appVersion,
    false,
    DEFAULT_MARKUP_COMPATIBILITY_OPTIONS,
  );

  if (contentTypesXml === null) {
    return [];
  }

  const contentTypes = parseContentTypes(contentTypesXml);
  const mediaMap = new Map<string, MediaInfo>();

  // Traverse slides
  for (const slidePath of contentTypes.slides) {
    collectMediaInfoFromRelationships(file, slidePath, mediaMap);
  }

  // Traverse layouts
  for (const layoutPath of contentTypes.slideLayouts) {
    collectMediaInfoFromRelationships(file, layoutPath, mediaMap);
  }

  // Traverse masters (for background images, etc.)
  for (const masterPath of contentTypes.slideMasters) {
    collectMediaInfoFromRelationships(file, masterPath, mediaMap);
  }

  // Sort by path and return
  return Array.from(mediaMap.values()).sort((a, b) => a.path.localeCompare(b.path));
}

// =============================================================================
// Helpers
// =============================================================================

function resolveAppVersion(file: PresentationFile): number {
  const appXml = readXml(
    file,
    "docProps/app.xml",
    16,
    false,
    DEFAULT_MARKUP_COMPATIBILITY_OPTIONS,
  );
  return parseAppVersion(appXml) ?? 16;
}

/**
 * Collect media paths from a part's relationships.
 *
 * Uses loadRelationships which handles RFC 3986 path resolution.
 */
function collectMediaFromRelationships(
  file: PresentationFile,
  partPath: string,
  mediaPaths: Set<string>,
): void {
  const relationships = loadRelationships(file, partPath);

  // Get all image targets (resolved by loadRelationships)
  const imageTargets = relationships.getAllTargetsByType(RELATIONSHIP_TYPES.IMAGE);

  for (const target of imageTargets) {
    mediaPaths.add(target);
  }

  // Also check for other media types if needed
  // Could add VIDEO, AUDIO relationship types here
}

/**
 * Collect media info with relationship details.
 *
 * Uses loadRelationships which handles RFC 3986 path resolution.
 */
function collectMediaInfoFromRelationships(
  file: PresentationFile,
  partPath: string,
  mediaMap: Map<string, MediaInfo>,
): void {
  const relationships = loadRelationships(file, partPath);

  // Get all image targets (resolved by loadRelationships)
  const imageTargets = relationships.getAllTargetsByType(RELATIONSHIP_TYPES.IMAGE);

  for (const target of imageTargets) {
    // Only add if not already present (keeps first reference)
    if (!mediaMap.has(target)) {
      mediaMap.set(target, {
        path: target,
        relationType: RELATIONSHIP_TYPES.IMAGE,
        referencedFrom: partPath,
      });
    }
  }
}
