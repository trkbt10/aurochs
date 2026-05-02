/**
 * @file SoT: resolve a `FigGuid` against a flat `symbolMap`.
 *
 * This file holds the **single** algorithm the codebase uses to look
 * a SYMBOL up in the parsed file's `symbolMap` — exact
 * `"sessionID:localID"` key match, no fallback.
 *
 * The previous implementation also performed a localID-suffix scan
 * to "survive cross-file paste residue and stale session ids."
 * Calibration across the production fixture corpus
 * (apple-ios26 / Simple Design System / Balatro / edge-cases / ...)
 * showed zero fires; the fallback only ever triggered from a single
 * unit test that constructed an artificial sessionID-mismatch input
 * to exercise it. Per the project policy of "don't guess; resolve
 * correctly or drop" the fallback was deleted along with that test.
 */

import type { FigNode } from "../types";
import { guidToString, type FigGuid } from "../parser";

export type SymbolMapResolution = {
  readonly node: FigNode;
  readonly guidStr: string;
};

/**
 * Resolve a GUID to its SYMBOL node in `symbolMap`. Returns the
 * resolved node + the matched key, or `undefined` when no SYMBOL is
 * registered under that GUID.
 */
export function resolveSymbolGuidStr(
  symbolID: FigGuid,
  symbolMap: ReadonlyMap<string, FigNode>,
): SymbolMapResolution | undefined {
  const exactKey = guidToString(symbolID);
  const exact = symbolMap.get(exactKey);
  if (exact) { return { node: exact, guidStr: exactKey }; }
  return undefined;
}
