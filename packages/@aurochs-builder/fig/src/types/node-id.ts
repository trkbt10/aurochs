/**
 * @file Builder-specific ID generation utilities.
 *
 * Domain types (FigNodeId, FigPageId) and conversion helpers (guidToNodeId, etc.)
 * live in @aurochs/fig/domain. Import them from there at each usage site.
 *
 * This file provides only the builder-specific stateful ID counter machinery.
 */

import type { FigNodeId, FigPageId } from "@aurochs/fig/domain";

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
