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

import type { FigGuid, FigNode, FigKiwiSymbolData } from "../types";

// =============================================================================
// Types
// =============================================================================

/** Raw symbolID + overriddenSymbolID pair extracted from a node. */
export type SymbolIDPair = {
  readonly symbolID: FigGuid;
  readonly overriddenSymbolID?: FigGuid;
};

/**
 * Minimal shape accepted by extractSymbolIDPair.
 *
 * Accepts both FigNode (production) and plain objects (tests).
 * The typed fields mirror FigNode's symbolData/symbolID/overriddenSymbolID
 * but are all optional to support partial test data.
 */
type SymbolIDSource = {
  readonly symbolData?: FigKiwiSymbolData | Record<string, unknown>;
  readonly symbolID?: FigGuid;
  readonly overriddenSymbolID?: FigGuid;
  readonly [key: string]: unknown;
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
  nodeData: SymbolIDSource,
  field: "symbolID" | "overriddenSymbolID",
): FigGuid | undefined {
  if (symbolData && isGuid(symbolData[field])) {
    return symbolData[field] as FigGuid;
  }
  const directValue = nodeData[field];
  if (isGuid(directValue)) {
    return directValue;
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
 * Extract the raw symbolID / overriddenSymbolID pair from a node.
 *
 * Accepts FigNode or any object with the appropriate shape (for tests).
 * Returns `undefined` when no symbolID is present (i.e. the node is not
 * an INSTANCE, or the data is malformed).
 */
export function extractSymbolIDPair(
  nodeData: SymbolIDSource,
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
  nodeData: SymbolIDSource,
): FigGuid | undefined {
  const pair = extractSymbolIDPair(nodeData);
  if (!pair) {return undefined;}
  return pair.overriddenSymbolID ?? pair.symbolID;
}
