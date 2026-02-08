/**
 * @file Factory functions for creating PPTX context objects
 *
 * Provides adapter functions that wrap IndexTables with consistent interfaces.
 *
 * Theme parsing functions should be imported from ./theme-parser
 *
 * @see ./accessor.ts for type definitions
 */

import type { ColorMap } from "@aurochs-office/drawing-ml/domain/color-context";
import type { PlaceholderTable } from "../../domain";
import type { IndexTables } from "./shape-tree-indexer";
import type { XmlElement } from "@aurochs/xml";
import { parseColorMap } from "./theme-parser";

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
