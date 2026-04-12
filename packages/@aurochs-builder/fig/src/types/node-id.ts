/**
 * @file Node ID types and helpers — re-exported from @aurochs/fig/domain
 *
 * Domain types (FigNodeId, FigPageId, conversion helpers) live in
 * @aurochs/fig/domain. This module re-exports them for backward
 * compatibility and adds builder-specific ID generation utilities.
 */

// Re-export domain types and helpers
export type { FigNodeId, FigPageId } from "@aurochs/fig/domain";
export { guidToNodeId, guidToPageId, parseId, toNodeId, toPageId } from "@aurochs/fig/domain";

// =============================================================================
// Builder-specific: ID Generation
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
export function nextNodeId(counter: IdCounter): import("@aurochs/fig/domain").FigNodeId {
  const id = `${counter.sessionID}:${counter.nextLocalID}` as import("@aurochs/fig/domain").FigNodeId;
  counter.nextLocalID++;
  return id;
}

/**
 * Generate the next FigPageId from a counter, mutating it in place.
 */
export function nextPageId(counter: IdCounter): import("@aurochs/fig/domain").FigPageId {
  const id = `${counter.sessionID}:${counter.nextLocalID}` as import("@aurochs/fig/domain").FigPageId;
  counter.nextLocalID++;
  return id;
}
