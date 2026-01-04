/**
 * @file Factory functions for creating PPTX context objects
 *
 * Provides adapter functions that wrap SlideResources/IndexTables
 * with consistent interfaces.
 *
 * Theme parsing functions should be imported from core/dml/parser/theme.ts
 *
 * @see ./accessor.ts for type definitions
 */

import type { ResourceMap, PlaceholderTable, ColorMap } from "../../domain";
import type { IndexTables } from "../../core/types";
import type { SlideResources } from "../../core/opc";
import { parseColorMap } from "../../core/dml/parser/theme";

// =============================================================================
// Adapter Functions
// =============================================================================

/**
 * Create ResourceMap from SlideResources.
 *
 * This is an adapter that wraps SlideResources with a consistent interface.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function createResourceMap(resources: SlideResources): ResourceMap {
  return {
    getTarget(rId: string): string | undefined {
      return resources[rId]?.target;
    },
    getType(rId: string): string | undefined {
      return resources[rId]?.type;
    },
    getTargetByType(relType: string): string | undefined {
      for (const resource of Object.values(resources)) {
        if (resource.type === relType) {
          return resource.target;
        }
      }
      return undefined;
    },
  };
}

/**
 * Create PlaceholderTable from IndexTables.
 *
 * This is an adapter that wraps IndexTables with a consistent interface.
 */
export function createPlaceholderTable(tables: IndexTables): PlaceholderTable {
  return {
    byIdx: tables.idxTable,
    byType: tables.typeTable,
  };
}

/**
 * Create ColorMap from color map element.
 *
 * Convenience wrapper for parseColorMap.
 */
export function createColorMap(clrMapElement: import("../../../xml").XmlElement | undefined): ColorMap {
  return parseColorMap(clrMapElement);
}
