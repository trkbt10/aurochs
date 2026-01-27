/**
 * @file OPC Relationship utilities
 *
 * Core types and factory functions for OPC relationship handling.
 * These are shared across all OOXML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { ResourceMap } from "../domain/opc";

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
