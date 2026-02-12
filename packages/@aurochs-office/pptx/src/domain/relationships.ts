/**
 * @file Relationship domain types and constants
 *
 * Core types and constants for OPC relationship handling.
 * Based on ECMA-376 Part 2, Section 9.3 (Relationships).
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { ResourceMap } from "@aurochs-office/opc";
import {
  OFFICE_RELATIONSHIP_TYPES,
  PRESENTATIONML_RELATIONSHIP_TYPES,
} from "@aurochs-office/opc";

// =============================================================================
// Relationship Type Constants
// =============================================================================

/**
 * ECMA-376 Part 2 Relationship Type URIs.
 *
 * Re-exports from @aurochs-office/opc with SCREAMING_CASE aliases for backward compatibility.
 *
 * @see ECMA-376 Part 2, Annex F (Relationship Types)
 * @see ECMA-376 Part 1, Section 13 (PresentationML)
 */
export const RELATIONSHIP_TYPES = {
  /** Slide relationship (presentation.xml -> slideN.xml) */
  SLIDE: PRESENTATIONML_RELATIONSHIP_TYPES.slide,
  /** Slide layout relationship */
  SLIDE_LAYOUT: PRESENTATIONML_RELATIONSHIP_TYPES.slideLayout,
  /** Slide master relationship */
  SLIDE_MASTER: PRESENTATIONML_RELATIONSHIP_TYPES.slideMaster,
  /** Theme relationship */
  THEME: OFFICE_RELATIONSHIP_TYPES.theme,
  /** Theme override relationship */
  THEME_OVERRIDE: OFFICE_RELATIONSHIP_TYPES.themeOverride,
  /** Image relationship */
  IMAGE: OFFICE_RELATIONSHIP_TYPES.image,
  /** Chart relationship */
  CHART: OFFICE_RELATIONSHIP_TYPES.chart,
  /** Hyperlink relationship */
  HYPERLINK: OFFICE_RELATIONSHIP_TYPES.hyperlink,
  /** Notes slide relationship */
  NOTES: PRESENTATIONML_RELATIONSHIP_TYPES.notesSlide,
  /** Diagram drawing relationship (DrawingML diagrams) */
  DIAGRAM_DRAWING: PRESENTATIONML_RELATIONSHIP_TYPES.diagramDrawing,
  /** VML drawing relationship */
  VML_DRAWING: OFFICE_RELATIONSHIP_TYPES.vmlDrawing,
  /** OLE object relationship */
  OLE_OBJECT: OFFICE_RELATIONSHIP_TYPES.oleObject,
  /** Video relationship */
  VIDEO: OFFICE_RELATIONSHIP_TYPES.video,
  /** Audio relationship */
  AUDIO: OFFICE_RELATIONSHIP_TYPES.audio,
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
  return type === RELATIONSHIP_TYPES.IMAGE || type === RELATIONSHIP_TYPES.VIDEO || type === RELATIONSHIP_TYPES.AUDIO;
}
