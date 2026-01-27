/**
 * @file Compatibility function registry for Excel "future functions" (`_xlfn.*`)
 *
 * Excel writes newer functions into SpreadsheetML formulas using a namespaced identifier like
 * `_xlfn.XLOOKUP(...)`. This file keeps those mappings isolated from the core function registry.
 *
 * The registry only resolves functions that are explicitly prefixed with `_xlfn.` (case-insensitive)
 * so the compatibility surface does not silently expand standard function parsing/execution.
 */

import type { FormulaFunctionDefinition } from "../../functionRegistry";
import { xlookupFunction } from "./xlookup";
import { xmatchFunction } from "./xmatch";

const xlfnRegistry = new Map<string, FormulaFunctionDefinition>([
  ["XLOOKUP", xlookupFunction],
  ["XMATCH", xmatchFunction],
]);

function isXlfnQualifiedFunctionName(name: string): boolean {
  return name.toUpperCase().startsWith("_XLFN.");
}

function extractQualifiedSuffix(name: string): string {
  const upper = name.toUpperCase();
  const parts = upper.split(".");
  return parts[parts.length - 1] ?? upper;
}

/**
 * Resolve an `_xlfn.*` function by its qualified name.
 *
 * @param qualifiedName - Function name from the AST (e.g. `_XLFN.XLOOKUP`)
 * @returns Function definition when known, otherwise undefined
 */
export function getXlfnFormulaFunction(qualifiedName: string): FormulaFunctionDefinition | undefined {
  if (!isXlfnQualifiedFunctionName(qualifiedName)) {
    return undefined;
  }
  const suffix = extractQualifiedSuffix(qualifiedName);
  return xlfnRegistry.get(suffix);
}
