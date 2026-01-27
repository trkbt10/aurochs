/**
 * @file Unified relationship parsing and loading
 *
 * Single entry point for all relationship operations.
 * Provides RFC 3986 compliant path resolution.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see RFC 3986, Section 5.2 (Relative Resolution)
 */

import type { XmlDocument } from "@oxen/xml";
import type { PresentationFile, ResourceMap } from "../domain/opc";
import {
  RELATIONSHIP_TYPES,
  createEmptyResourceMap,
  createResourceMap,
  type ResourceEntry,
} from "../domain/relationships";
import { parseXml, getByPath, getChildren } from "@oxen/xml";

// =============================================================================
// Path Resolution (RFC 3986)
// =============================================================================

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
  // If reference is already absolute (starts with /), return without leading slash
  if (reference.startsWith("/")) {
    return reference.substring(1);
  }

  // Get base directory
  const baseDir = getParentDirectory(basePath);

  // If reference doesn't contain relative segments, append to base directory
  if (!reference.startsWith("../") && !reference.startsWith("./")) {
    return baseDir + reference;
  }

  // RFC 3986 Section 5.2.3: Merge Paths
  const merged = baseDir + reference;

  // RFC 3986 Section 5.2.4: Remove Dot Segments
  return removeDotSegments(merged);
}

/**
 * Get the parent directory of a path.
 */
function getParentDirectory(path: string): string {
  if (path.endsWith("/")) {
    return path;
  }
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) {
    return "";
  }
  return path.substring(0, lastSlash + 1);
}

/**
 * Remove dot segments from a path per RFC 3986 Section 5.2.4.
 */
function removeDotSegments(path: string): string {
  const segments = path.split("/");
  const result: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      if (result.length > 0) {
        result.pop();
      }
    } else if (segment !== "." && segment !== "") {
      result.push(segment);
    }
  }

  return result.join("/");
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
  const lastSlash = partPath.lastIndexOf("/");
  if (lastSlash === -1) {
    return `_rels/${partPath}.rels`;
  }
  const dir = partPath.substring(0, lastSlash);
  const filename = partPath.substring(lastSlash + 1);
  return `${dir}/_rels/${filename}.rels`;
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
  if (relsXml === null) {
    return createEmptyResourceMap();
  }

  const relationshipsElement = getByPath(relsXml, ["Relationships"]);
  if (!relationshipsElement) {
    return createEmptyResourceMap();
  }

  const relationships = getChildren(relationshipsElement, "Relationship");
  const entries: Record<string, ResourceEntry> = {};

  for (const rel of relationships) {
    const id = rel.attrs["Id"];
    const type = rel.attrs["Type"];
    const target = rel.attrs["Target"];

    if (id !== undefined && target !== undefined) {
      // Resolve relative path using RFC 3986
      const resolvedTarget = resolvePartPath(sourcePath, target);
      entries[id] = {
        type: type ?? "",
        target: resolvedTarget,
      };
    }
  }

  return createResourceMap(entries);
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
  const relsPath = getRelationshipPath(partPath);
  const relsText = file.readText(relsPath);

  if (relsText === null) {
    return createEmptyResourceMap();
  }

  const relsXml = parseRelsXml(relsText);
  return parseRelationships(relsXml, partPath);
}

/**
 * Parse .rels XML text into document.
 */
function parseRelsXml(text: string): XmlDocument {
  return parseXml(text);
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
