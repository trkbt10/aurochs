/**
 * @file Placeholder lookup utilities
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */

import type { XmlElement } from "@oxen/xml";
import type { PlaceholderTables } from "../../context";

/**
 * Look up a placeholder by type first, then fall back to idx.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.36 (p:ph):
 * Placeholders can be matched by either type or idx. Type is preferred
 * for semantic matching, but idx is used when type is not specified.
 * idx is xsd:unsignedInt per ECMA-376.
 *
 * @param tables - Placeholder lookup tables
 * @param type - Placeholder type (e.g., "body", "title")
 * @param idx - Placeholder index (numeric per ECMA-376 xsd:unsignedInt)
 * @returns The matching placeholder element, or undefined
 */
export function lookupPlaceholder(
  tables: PlaceholderTables,
  type: string | undefined,
  idx: number | undefined,
): XmlElement | undefined {
  // First try by type
  if (type !== undefined && tables.byType[type] !== undefined) {
    return tables.byType[type];
  }
  // Fall back to idx
  if (idx !== undefined) {
    const byIdx = tables.byIdx.get(idx);
    if (byIdx !== undefined) {
      return byIdx;
    }
  }
  return undefined;
}
