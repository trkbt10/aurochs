/**
 * @file Factory functions for creating PPTX context objects
 *
 * Provides adapter functions that wrap IndexTables with consistent interfaces.
 *
 * Theme parsing functions should be imported from core/dml/parser/theme.ts
 *
 * @see ./accessor.ts for type definitions
 */

import type { PlaceholderTable, ColorMap } from "../../domain";
import type { IndexTables } from "../../core/types";
import type { XmlElement } from "../../../xml";
import { parseColorMap } from "../../core/dml/parser/theme";

// =============================================================================
// Adapter Functions
// =============================================================================

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
export function createColorMap(clrMapElement: XmlElement | undefined): ColorMap {
  return parseColorMap(clrMapElement);
}
