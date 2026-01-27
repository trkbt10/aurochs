/**
 * @file XLOOKUP function implementation (Excel / `_xlfn.XLOOKUP`).
 *
 * Implements a subset of XLOOKUP sufficient for POI regression fixtures:
 * - Exact match (match_mode = 0)
 * - Approximate match: exact or next larger (match_mode = 1)
 * - Search modes: forward/backward (1/-1) and binary search (2/-2)
 *
 * Notes:
 * - Dynamic array spill behavior is out of scope for the current evaluator; when `return_array`
 *   spans multiple columns/rows, this implementation returns the first element in the matched row/column.
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "../helpers";
import { toLookupTable } from "../lookup/table";

type VectorOrientation = "row" | "col";

type LookupVector = {
  readonly orientation: VectorOrientation;
  readonly length: number;
  at: (index: number) => FormulaEvaluationResult;
};

function toLookupVector(range: EvalResult, description: string): LookupVector {
  const table = toLookupTable(range, description);
  const rowCount = table.length;
  const colCount = table[0]?.length ?? 0;
  if (rowCount === 0 || colCount === 0) {
    throw new Error(`${description} cannot be empty`);
  }

  if (rowCount === 1) {
    const row = table[0]!;
    return {
      orientation: "row",
      length: row.length,
      at: (index) => row[index] ?? null,
    };
  }

  if (colCount === 1) {
    return {
      orientation: "col",
      length: rowCount,
      at: (index) => table[index]?.[0] ?? null,
    };
  }

  throw new Error(`${description} must be a single row or single column`);
}

function resolveReturnValue(params: {
  readonly orientation: VectorOrientation;
  readonly matchIndex: number;
  readonly returnArray: EvalResult;
}): FormulaEvaluationResult {
  const table = toLookupTable(params.returnArray, "XLOOKUP return array");
  const rowCount = table.length;
  const colCount = table[0]?.length ?? 0;
  if (rowCount === 0 || colCount === 0) {
    throw new Error("XLOOKUP return array cannot be empty");
  }

  if (params.orientation === "row") {
    const row = table[0];
    if (!row) {
      throw new Error("XLOOKUP return array must contain at least one row");
    }
    const value = row[params.matchIndex];
    if (value === undefined) {
      throw new Error("XLOOKUP return array column index is out of range");
    }
    return value;
  }

  const row = table[params.matchIndex];
  if (!row) {
    throw new Error("XLOOKUP return array row index is out of range");
  }
  const value = row[0];
  if (value === undefined) {
    throw new Error("XLOOKUP return array must contain at least one column");
  }
  return value;
}

type BinaryOrder = "ascending" | "descending";

function coerceBinaryKey(value: FormulaEvaluationResult, order: BinaryOrder): number {
  if (typeof value === "number") {
    return value;
  }
  if (value === null) {
    return order === "ascending" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  return order === "ascending" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
}

function binarySearchAscendingLowerBound(vector: LookupVector, lookup: number): number | null {
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), "ascending");
    if (key >= lookup) {
      state.hi = mid;
    } else {
      state.lo = mid + 1;
    }
  }
  return state.lo < n ? state.lo : null;
}

function binarySearchAscendingUpperBound(vector: LookupVector, lookup: number): number | null {
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), "ascending");
    if (key <= lookup) {
      state.lo = mid + 1;
    } else {
      state.hi = mid;
    }
  }
  const index = state.lo - 1;
  return index >= 0 ? index : null;
}

function binarySearchDescendingLowerBound(vector: LookupVector, lookup: number): number | null {
  // Rightmost index where key >= lookup.
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), "descending");
    if (key >= lookup) {
      state.lo = mid + 1;
    } else {
      state.hi = mid;
    }
  }
  const index = state.lo - 1;
  return index >= 0 ? index : null;
}

function binarySearchDescendingUpperBound(vector: LookupVector, lookup: number): number | null {
  // Leftmost index where key <= lookup.
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), "descending");
    if (key <= lookup) {
      state.hi = mid;
    } else {
      state.lo = mid + 1;
    }
  }
  return state.lo < n ? state.lo : null;
}

function findExactIndex(
  vector: LookupVector,
  lookupValue: FormulaEvaluationResult,
  fromEnd: boolean,
  compare: (a: FormulaEvaluationResult, b: FormulaEvaluationResult) => boolean,
): number | null {
  if (!fromEnd) {
    for (let i = 0; i < vector.length; i += 1) {
      if (compare(vector.at(i), lookupValue)) {
        return i;
      }
    }
    return null;
  }
  for (let i = vector.length - 1; i >= 0; i -= 1) {
    if (compare(vector.at(i), lookupValue)) {
      return i;
    }
  }
  return null;
}

export const xlookupFunction: FormulaFunctionEagerDefinition = {
  name: "XLOOKUP",
  category: "lookup",
  description: {
    en: "Searches a range or array and returns an item corresponding to the first match.",
    ja: "範囲/配列を検索し、一致する要素に対応する値を返します。",
  },
  examples: ["XLOOKUP(E2, C2:C7, B2:B7)", "XLOOKUP(B2, B5:B14, C5:D14)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 6) {
      throw new Error("XLOOKUP expects three to six arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "XLOOKUP lookup value");
    const lookupVector = toLookupVector(args[1], "XLOOKUP lookup array");
    const ifNotFound = args.length >= 4 ? helpers.coerceScalar(args[3], "XLOOKUP if_not_found") : undefined;
    const matchMode = args.length >= 5 ? helpers.requireNumber(args[4], "XLOOKUP match_mode") : 0;
    const searchMode = args.length >= 6 ? helpers.requireNumber(args[5], "XLOOKUP search_mode") : 1;

    if (![0, -1, 1, 2].includes(matchMode)) {
      throw new Error("XLOOKUP match_mode must be -1, 0, 1, or 2");
    }
    if (![1, -1, 2, -2].includes(searchMode)) {
      throw new Error("XLOOKUP search_mode must be 1, -1, 2, or -2");
    }
    if (matchMode === 2) {
      throw new Error("XLOOKUP wildcard match is not implemented");
    }

    const fromEnd = searchMode === -1;
    const useBinaryAscending = searchMode === 2;
    const useBinaryDescending = searchMode === -2;

    const findIndex = (): number | null => {
      if (matchMode === 0) {
        return findExactIndex(lookupVector, lookupValue, fromEnd, helpers.comparePrimitiveEquality);
      }

      if (typeof lookupValue !== "number") {
        throw new Error("XLOOKUP approximate match requires numeric lookup value");
      }

      if (useBinaryAscending) {
        if (matchMode === 1) {
          return binarySearchAscendingLowerBound(lookupVector, lookupValue);
        }
        return binarySearchAscendingUpperBound(lookupVector, lookupValue);
      }
      if (useBinaryDescending) {
        if (matchMode === 1) {
          return binarySearchDescendingLowerBound(lookupVector, lookupValue);
        }
        return binarySearchDescendingUpperBound(lookupVector, lookupValue);
      }

      if (matchMode === 1) {
        for (let i = 0; i < lookupVector.length; i += 1) {
          const idx = fromEnd ? lookupVector.length - 1 - i : i;
          const candidate = lookupVector.at(idx);
          if (typeof candidate !== "number") {
            continue;
          }
          if (candidate >= lookupValue) {
            return idx;
          }
        }
        return null;
      }

      for (let i = 0; i < lookupVector.length; i += 1) {
        const idx = fromEnd ? lookupVector.length - 1 - i : i;
        const candidate = lookupVector.at(idx);
        if (typeof candidate !== "number") {
          continue;
        }
        if (candidate <= lookupValue) {
          return idx;
        }
      }
      return null;
    };

    const matchIndex = findIndex();
    if (matchIndex === null) {
      if (ifNotFound !== undefined) {
        return ifNotFound;
      }
      throw helpers.createFormulaError("#N/A", "XLOOKUP could not find a match");
    }

    return resolveReturnValue({ orientation: lookupVector.orientation, matchIndex, returnArray: args[2] });
  },
};

