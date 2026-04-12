/**
 * @file Branded ID types for fig design documents
 *
 * IDs are encoded as "sessionID:localID" strings matching the
 * guidToString() format from @aurochs/fig/parser.
 */

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
// ID Generation
// =============================================================================

/**
 * Counter state for generating sequential IDs within a session.
 *
 * Session 0 is reserved for structural nodes (document, canvas) in Figma.
 * Session 1+ is used for user-created content nodes.
 */
type IdCounter = {
  sessionID: number;
  nextLocalID: number;
};

/**
 * Create a new ID counter starting at the given session.
 */
export function createIdCounter(sessionID: number, startLocalID = 1): IdCounter {
  return { sessionID, nextLocalID: startLocalID };
}

/**
 * Generate the next FigNodeId from a counter, mutating it in place.
 */
export function nextNodeId(counter: IdCounter): FigNodeId {
  const id = `${counter.sessionID}:${counter.nextLocalID}` as FigNodeId;
  counter.nextLocalID++;
  return id;
}

/**
 * Generate the next FigPageId from a counter, mutating it in place.
 */
export function nextPageId(counter: IdCounter): FigPageId {
  const id = `${counter.sessionID}:${counter.nextLocalID}` as FigPageId;
  counter.nextLocalID++;
  return id;
}

// =============================================================================
// Conversion Helpers
// =============================================================================

/**
 * Convert a FigGuid (from @aurochs/fig) to a FigNodeId string.
 */
export function guidToNodeId(guid: { readonly sessionID: number; readonly localID: number }): FigNodeId {
  return `${guid.sessionID}:${guid.localID}` as FigNodeId;
}

/**
 * Convert a FigGuid to a FigPageId string.
 */
export function guidToPageId(guid: { readonly sessionID: number; readonly localID: number }): FigPageId {
  return `${guid.sessionID}:${guid.localID}` as FigPageId;
}

/**
 * Parse a branded ID string back into session and local components.
 */
export function parseId(id: FigNodeId | FigPageId): { readonly sessionID: number; readonly localID: number } {
  const colonIndex = id.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid fig ID format: "${id}" (expected "sessionID:localID")`);
  }
  return {
    sessionID: Number(id.substring(0, colonIndex)),
    localID: Number(id.substring(colonIndex + 1)),
  };
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
