/**
 * @file Unified extraction of effective symbol ID from INSTANCE nodes.
 *
 * INSTANCE nodes reference their SYMBOL via `symbolID`. When a variant is
 * switched, the original `symbolID` is kept but an `overriddenSymbolID`
 * is added pointing to the new variant's COMPONENT.
 *
 * Both fields can be stored in two formats:
 *   - Real Figma exports: nested inside `symbolData` message
 *   - Builder-generated files: at the node's top level
 *
 * This module centralises the extraction logic so every consumer
 * (renderer, pre-resolver, builder) uses the same code path.
 */

import type { FigGuid } from "../types";

// =============================================================================
// Types
// =============================================================================

/** Raw symbolID + overriddenSymbolID pair extracted from a node. */
export type SymbolIDPair = {
  readonly symbolID: FigGuid;
  readonly overriddenSymbolID?: FigGuid;
};

// =============================================================================
// Helpers
// =============================================================================

function isGuid(v: unknown): v is FigGuid {
  return v != null && typeof v === "object" && "sessionID" in v;
}

/** Resolve a GUID field from either symbolData or nodeData */
function resolveGuid(
  symbolData: Record<string, unknown> | undefined,
  nodeData: Record<string, unknown>,
  field: string,
): FigGuid | undefined {
  if (symbolData && isGuid(symbolData[field])) {
    return symbolData[field] as FigGuid;
  }
  if (isGuid(nodeData[field])) {
    return nodeData[field] as FigGuid;
  }
  return undefined;
}

/** Build a SymbolIDPair from symbolID and optional overriddenSymbolID */
function buildSymbolIDPair(symbolID: FigGuid, overriddenSymbolID: FigGuid | undefined): SymbolIDPair {
  if (overriddenSymbolID) {
    return { symbolID, overriddenSymbolID };
  }
  return { symbolID };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract the raw symbolID / overriddenSymbolID pair from a node record.
 *
 * Returns `undefined` when no symbolID is present (i.e. the node is not
 * an INSTANCE, or the data is malformed).
 */
export function extractSymbolIDPair(
  nodeData: Record<string, unknown>,
): SymbolIDPair | undefined {
  // --- symbolID ---
  const symbolData = nodeData.symbolData as Record<string, unknown> | undefined;
  const symbolID = resolveGuid(symbolData, nodeData, "symbolID");

  if (!symbolID) {return undefined;}

  // --- overriddenSymbolID ---
  const overriddenSymbolID = resolveGuid(symbolData, nodeData, "overriddenSymbolID");

  return buildSymbolIDPair(symbolID, overriddenSymbolID);
}

/**
 * Get the effective symbol ID for an INSTANCE node.
 *
 * `effectiveID = overriddenSymbolID ?? symbolID`
 *
 * This is the single canonical entry point for determining which SYMBOL
 * or COMPONENT an INSTANCE should resolve to.
 */
export function getEffectiveSymbolID(
  nodeData: Record<string, unknown>,
): FigGuid | undefined {
  const pair = extractSymbolIDPair(nodeData);
  if (!pair) {return undefined;}
  return pair.overriddenSymbolID ?? pair.symbolID;
}
