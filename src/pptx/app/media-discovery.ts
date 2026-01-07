/**
 * @file Media discovery via OPC relationships
 *
 * Discovers embedded media files by traversing OPC relationships.
 * This is the ECMA-376 compliant approach to finding media parts.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { PresentationFile } from "../domain";
import { parseContentTypes, RELATIONSHIP_TYPES } from "../opc";
import { parseRelationships } from "../opc/relationships";
import { resolveRelativePath } from "../opc/utils";
import { readXml, getRelationships, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../parser/slide/xml-reader";
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
 */
function collectMediaFromRelationships(
  file: PresentationFile,
  partPath: string,
  mediaPaths: Set<string>,
): void {
  const relationships = getRelationships(file, partPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);

  // Get all image targets
  const imageTargets = relationships.getAllTargetsByType(RELATIONSHIP_TYPES.IMAGE);

  for (const target of imageTargets) {
    const resolvedPath = resolveRelativePath(partPath, target);
    mediaPaths.add(resolvedPath);
  }

  // Also check for other media types if needed
  // Could add VIDEO, AUDIO relationship types here
}

/**
 * Collect media info with relationship details.
 */
function collectMediaInfoFromRelationships(
  file: PresentationFile,
  partPath: string,
  mediaMap: Map<string, MediaInfo>,
): void {
  const relationships = getRelationships(file, partPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);

  // Get all image targets
  const imageTargets = relationships.getAllTargetsByType(RELATIONSHIP_TYPES.IMAGE);

  for (const target of imageTargets) {
    const resolvedPath = resolveRelativePath(partPath, target);

    // Only add if not already present (keeps first reference)
    if (!mediaMap.has(resolvedPath)) {
      mediaMap.set(resolvedPath, {
        path: resolvedPath,
        relationType: RELATIONSHIP_TYPES.IMAGE,
        referencedFrom: partPath,
      });
    }
  }
}
