/**
 * @file Factory functions for creating PPTX context objects
 *
 * Provides adapter functions that wrap IndexTables with consistent interfaces.
 *
 * Theme parsing functions should be imported from parser/drawing-ml
 *
 * @see ./accessor.ts for type definitions
 */

import type { PlaceholderTable, ColorMap } from "../../domain";
import type { IndexTables } from "./shape-tree-indexer";
import type { XmlElement } from "@oxen/xml";
import { parseColorMap } from "../drawing-ml";

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
