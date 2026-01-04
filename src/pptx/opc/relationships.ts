/**
 * @file Relationship parsing utilities
 *
 * Parses .rels relationship files and provides ResourceMap interface.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { ResourceMap } from "../domain/opc";
import type { XmlDocument } from "../../xml/index";
import { normalizePptPath, getByPath, getChildren } from "../../xml/index";
import { RELATIONSHIP_TYPES } from "./content-types";

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Resource object from relationships (internal use only)
 */
type ResourceEntry = {
  type: string;
  target: string;
};

// =============================================================================
// Resource Map Factory
// =============================================================================

/**
 * Create an empty ResourceMap
 */
function createEmptyResourceMap(): ResourceMap {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    getTargetByType: () => undefined,
    getAllTargetsByType: () => [],
  };
}

/**
 * Create ResourceMap from entries record
 */
function createResourceMapFromEntries(entries: Record<string, ResourceEntry>): ResourceMap {
  return {
    getTarget(rId: string): string | undefined {
      return entries[rId]?.target;
    },
    getType(rId: string): string | undefined {
      return entries[rId]?.type;
    },
    getTargetByType(relType: string): string | undefined {
      for (const entry of Object.values(entries)) {
        if (entry.type === relType) {
          return entry.target;
        }
      }
      return undefined;
    },
    getAllTargetsByType(relType: string): readonly string[] {
      const targets: string[] = [];
      for (const entry of Object.values(entries)) {
        if (entry.type === relType) {
          targets.push(entry.target);
        }
      }
      return targets;
    },
  };
}

// =============================================================================
// Relationship Parsing
// =============================================================================

/**
 * Normalize target path (resolve relative paths)
 */
function normalizeTarget(target: string): string {
  if (target.startsWith("../")) {
    return normalizePptPath(target);
  }
  return target;
}

/**
 * Parse relationships from .rels file
 * @param relsXml - Parsed relationships XML
 * @returns ResourceMap for querying relationships
 */
export function parseRelationships(relsXml: XmlDocument | null): ResourceMap {
  if (relsXml === null) {
    return createEmptyResourceMap();
  }

  const entries: Record<string, ResourceEntry> = {};

  // Get Relationships element from document
  const relationshipsElement = getByPath(relsXml, ["Relationships"]);
  if (!relationshipsElement) {
    return createEmptyResourceMap();
  }

  // Get all Relationship elements
  const relationships = getChildren(relationshipsElement, "Relationship");

  for (const rel of relationships) {
    const id = rel.attrs["Id"];
    const type = rel.attrs["Type"];
    const target = rel.attrs["Target"];

    if (id !== undefined && target !== undefined) {
      entries[id] = {
        type: type ?? "",
        target: normalizeTarget(target),
      };
    }
  }

  return createResourceMapFromEntries(entries);
}

// =============================================================================
// Finder Functions
// =============================================================================

/**
 * Find layout filename from slide relationships
 * @param resources - ResourceMap from slide
 * @returns Layout filename or undefined
 */
export function findLayoutFilename(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.SLIDE_LAYOUT);
}

/**
 * Find master filename from layout relationships
 * @param resources - ResourceMap from layout
 * @returns Master filename or undefined
 */
export function findMasterFilename(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.SLIDE_MASTER);
}

/**
 * Find theme filename from master relationships
 * @param resources - ResourceMap from master
 * @returns Theme filename or undefined
 */
export function findThemeFilename(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.THEME);
}

/**
 * Find diagram drawing filename from relationships
 * @param resources - ResourceMap
 * @returns Diagram drawing filename or undefined
 */
export function findDiagramDrawingFilename(resources: ResourceMap): string | undefined {
  return resources.getTargetByType(RELATIONSHIP_TYPES.DIAGRAM_DRAWING);
}

// =============================================================================
// Resource Type Checks
// =============================================================================

/**
 * Check if resource type is an image
 * @param type - Relationship type
 * @returns True if type is an image relationship
 */
export function isImageType(type: string): boolean {
  return type === RELATIONSHIP_TYPES.IMAGE;
}

/**
 * Check if resource type is a hyperlink
 * @param type - Relationship type
 * @returns True if type is a hyperlink relationship
 */
export function isHyperlinkType(type: string): boolean {
  return type === RELATIONSHIP_TYPES.HYPERLINK;
}
