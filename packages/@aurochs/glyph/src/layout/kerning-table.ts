/**
 * @file Font kerning table storage
 *
 * Stores and retrieves kerning tables for fonts.
 * Used by layout to determine spacing between character pairs.
 */

import type { KerningTable } from "../types";

// =============================================================================
// Kerning Table Storage
// =============================================================================

const kerningTables = new Map<string, KerningTable>();

/**
 * Set kerning table for a font
 */
export function setKerningTable(fontFamily: string, table: KerningTable): void {
  kerningTables.set(fontFamily, table);
}

/**
 * Get kerning adjustment for a character pair
 */
export function getKerningAdjustment(
  fontFamily: string,
  first: string,
  second: string,
): number {
  const table = kerningTables.get(fontFamily);
  if (!table) {
    return 0;
  }

  return table.pairs.get(first + second) ?? 0;
}

/**
 * Check if font has kerning table
 */
export function hasKerningTable(fontFamily: string): boolean {
  return kerningTables.has(fontFamily);
}

/**
 * Clear all kerning tables
 */
export function clearKerningTables(): void {
  kerningTables.clear();
}
