/**
 * @file OPC Relationship utilities
 *
 * Core types and factory functions for OPC relationship handling.
 * These are shared across all OOXML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import { isXmlElement, type XmlDocument } from "@aurochs/xml";
import type { ResourceMap } from "./types";

// =============================================================================
// Relationship Types
// =============================================================================

/**
 * Target mode for relationships.
 * "External" indicates the target is outside the package.
 */
export type RelationshipTargetMode = "External";

/**
 * Information about a single relationship entry.
 */
export type RelationshipInfo = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: RelationshipTargetMode;
};

// =============================================================================
// Relationship Reading
// =============================================================================

/**
 * List all relationships from a .rels XML document.
 *
 * This is a pure read operation that parses relationship entries
 * from an OPC relationships XML document.
 *
 * @param relsXml - Parsed XML document of a .rels file
 * @returns Array of relationship entries
 *
 * @example
 * ```typescript
 * const relsDoc = parseXml(relsXmlText);
 * const rels = listRelationships(relsDoc);
 * const chartRel = rels.find(r => r.type.includes("chart"));
 * ```
 */
export function listRelationships(relsXml: XmlDocument): RelationshipInfo[] {
  const root = relsXml.children.find(isXmlElement);
  if (!root || root.name !== "Relationships") {
    return [];
  }

  const relationships: RelationshipInfo[] = [];
  for (const child of root.children) {
    if (!isXmlElement(child) || child.name !== "Relationship") {
      continue;
    }
    const id = child.attrs.Id;
    const target = child.attrs.Target;
    if (!id || !target) {
      continue;
    }
    relationships.push({
      id,
      type: child.attrs.Type ?? "",
      target,
      targetMode: child.attrs.TargetMode as RelationshipTargetMode | undefined,
    });
  }
  return relationships;
}

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
