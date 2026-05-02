/**
 * @file Branded ID types for fig design documents
 *
 * IDs are encoded as "sessionID:localID" strings matching the
 * guidToString() format from @aurochs/fig/parser. The conversion
 * helpers below delegate to that primitive — never inline the format
 * here or anywhere else (the brand cast is the only addition).
 *
 * These are domain types — they define the identity model for
 * FigDesignNode / FigDesignDocument and are consumed by renderer,
 * builder, and editor packages alike.
 */
import { guidToString, parseGuidString, type FigGuid } from "../parser";

// =============================================================================
// Branded ID Types
// =============================================================================

/**
 * Unique identifier for a design node within a fig document.
 *
 * Format: "sessionID:localID" (e.g., "0:1", "1:42")
 * This matches the Kiwi binary GUID format used by .fig files.
 */
export type FigNodeId = string & { readonly __brand: "FigNodeId" };

/**
 * Unique identifier for a page (CANVAS node) within a fig document.
 *
 * Same format as FigNodeId but branded separately for type safety,
 * preventing accidental use of a node ID where a page ID is expected.
 */
export type FigPageId = string & { readonly __brand: "FigPageId" };

// =============================================================================
// Conversion Helpers
// =============================================================================

/**
 * Convert a FigGuid (from @aurochs/fig) to a FigNodeId string.
 *
 * Delegates the actual stringification to the SoT primitive
 * `guidToString` — keep them aligned (this brand is just the type
 * marker, not an alternative format).
 */
export function guidToNodeId(guid: FigGuid): FigNodeId {
  return guidToString(guid) as FigNodeId;
}

/**
 * Convert a FigGuid to a FigPageId string. See `guidToNodeId` —
 * same delegation, different brand.
 */
export function guidToPageId(guid: FigGuid): FigPageId {
  return guidToString(guid) as FigPageId;
}

/**
 * Parse a branded ID string back into session and local components.
 *
 * Delegates to `parseGuidString` — the inverse of `guidToString` and
 * the single source of truth for parsing the `"sessionID:localID"`
 * format. Validation that the input contains a separator is performed
 * here (since `parseGuidString` assumes well-formed input).
 */
export function parseId(id: FigNodeId | FigPageId): FigGuid {
  if (id.indexOf(":") === -1) {
    throw new Error(`Invalid fig ID format: "${id}" (expected "sessionID:localID")`);
  }
  return parseGuidString(id);
}

/**
 * Cast a raw string to FigNodeId (for trusted inputs only).
 */
export function toNodeId(raw: string): FigNodeId {
  return raw as FigNodeId;
}

/**
 * Cast a raw string to FigPageId (for trusted inputs only).
 */
export function toPageId(raw: string): FigPageId {
  return raw as FigPageId;
}
