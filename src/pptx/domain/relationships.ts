/**
 * @file Relationship domain types and constants
 *
 * Core types and constants for OPC relationship handling.
 * Based on ECMA-376 Part 2, Section 9.3 (Relationships).
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { ResourceMap } from "./opc";

// =============================================================================
// Relationship Type Constants
// =============================================================================

/**
 * ECMA-376 Part 2 Relationship Type URIs.
 *
 * These are the standard relationship types defined in the Open Packaging
 * Conventions and PresentationML specifications.
 *
 * @see ECMA-376 Part 2, Annex F (Relationship Types)
 * @see ECMA-376 Part 1, Section 13 (PresentationML)
 */
export const RELATIONSHIP_TYPES = {
  /** Slide relationship (presentation.xml -> slideN.xml) */
  SLIDE: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  /** Slide layout relationship */
  SLIDE_LAYOUT: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
  /** Slide master relationship */
  SLIDE_MASTER: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
  /** Theme relationship */
  THEME: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  /** Theme override relationship */
  THEME_OVERRIDE: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/themeOverride",
  /** Image relationship */
  IMAGE: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  /** Chart relationship */
  CHART: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  /** Hyperlink relationship */
  HYPERLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  /** Notes slide relationship */
  NOTES: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  /** Diagram drawing relationship (DrawingML diagrams) */
  DIAGRAM_DRAWING: "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing",
  /** VML drawing relationship */
  VML_DRAWING: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
  /** OLE object relationship */
  OLE_OBJECT: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject",
  /** Video relationship */
  VIDEO: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
  /** Audio relationship */
  AUDIO: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
} as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal resource entry structure.
 * Used during relationship parsing.
 */
export type ResourceEntry = {
  readonly type: string;
  readonly target: string;
};

// =============================================================================
// ResourceMap Factory
// =============================================================================

/**
 * Create an empty ResourceMap.
 *
 * Used when no relationships exist or when parsing fails.
 */
export function createEmptyResourceMap(): ResourceMap {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    getTargetByType: () => undefined,
    getAllTargetsByType: () => [],
  };
}

/**
 * Create ResourceMap from entries record.
 *
 * @param entries - Record of relationship ID to ResourceEntry
 * @returns ResourceMap instance for querying relationships
 */
export function createResourceMap(entries: Record<string, ResourceEntry>): ResourceMap {
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
// Relationship Type Utilities
// =============================================================================

/**
 * Check if relationship type is an image.
 */
export function isImageRelationship(type: string): boolean {
  return type === RELATIONSHIP_TYPES.IMAGE;
}

/**
 * Check if relationship type is a hyperlink.
 */
export function isHyperlinkRelationship(type: string): boolean {
  return type === RELATIONSHIP_TYPES.HYPERLINK;
}

/**
 * Check if relationship type is media (image, video, audio).
 */
export function isMediaRelationship(type: string): boolean {
  return (
    type === RELATIONSHIP_TYPES.IMAGE ||
    type === RELATIONSHIP_TYPES.VIDEO ||
    type === RELATIONSHIP_TYPES.AUDIO
  );
}
