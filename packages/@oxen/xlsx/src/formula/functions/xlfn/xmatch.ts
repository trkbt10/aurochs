/**
 * @file XMATCH function implementation (Excel / `_xlfn.XMATCH`).
 *
 * Supports the subset needed for POI regression fixtures:
 * - match_mode: 0 (exact), -1 (exact or next smaller), 1 (exact or next larger)
 * - search_mode: 1 (first-to-last), -1 (last-to-first), 2 (binary ascending), -2 (binary descending)
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "../helpers";
import { toLookupTable } from "../lookup/table";

type LookupVector = {
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
    return { length: row.length, at: (index) => row[index] ?? null };
  }

  if (colCount === 1) {
    return { length: rowCount, at: (index) => table[index]?.[0] ?? null };
  }

  throw new Error(`${description} must be a single row or single column`);
}

type VectorOrder = "ascending" | "descending" | "unknown";

function guessVectorOrder(vector: LookupVector): VectorOrder {
  if (vector.length < 2) {
    return "unknown";
  }
  const first = vector.at(0);
  const last = vector.at(vector.length - 1);
  if (typeof first === "number" && typeof last === "number") {
    return first <= last ? "ascending" : "descending";
  }
  return "unknown";
}

function coerceBinaryKey(value: FormulaEvaluationResult, order: Exclude<VectorOrder, "unknown">): number {
  if (typeof value === "number") {
    return value;
  }
  if (value === null) {
    return order === "ascending" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  return order === "ascending" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
}

function binarySearchExact(vector: LookupVector, lookup: number, order: Exclude<VectorOrder, "unknown">): number | null {
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), order);
    if (key === lookup) {
      return mid;
    }
    if (order === "ascending") {
      if (key < lookup) {
        state.lo = mid + 1;
      } else {
        state.hi = mid;
      }
    } else if (key > lookup) {
      state.lo = mid + 1;
    } else {
      state.hi = mid;
    }
  }
  return null;
}

function binarySearchNextLarger(vector: LookupVector, lookup: number, order: Exclude<VectorOrder, "unknown">): number | null {
  // Smallest index whose key >= lookup (ascending) / rightmost index whose key >= lookup (descending).
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), order);
    if (order === "ascending") {
      if (key >= lookup) {
        state.hi = mid;
      } else {
        state.lo = mid + 1;
      }
    } else if (key >= lookup) {
      state.lo = mid + 1;
    } else {
      state.hi = mid;
    }
  }
  if (order === "ascending") {
    return state.lo < n ? state.lo : null;
  }
  const index = state.lo - 1;
  return index >= 0 ? index : null;
}

function binarySearchNextSmaller(vector: LookupVector, lookup: number, order: Exclude<VectorOrder, "unknown">): number | null {
  // Largest index whose key <= lookup (ascending) / leftmost index whose key <= lookup (descending).
  const n = vector.length;
  const state = { lo: 0, hi: n };
  while (state.lo < state.hi) {
    const mid = Math.floor((state.lo + state.hi) / 2);
    const key = coerceBinaryKey(vector.at(mid), order);
    if (order === "ascending") {
      if (key <= lookup) {
        state.lo = mid + 1;
      } else {
        state.hi = mid;
      }
    } else if (key <= lookup) {
      state.hi = mid;
    } else {
      state.lo = mid + 1;
    }
  }
  if (order === "ascending") {
    const index = state.lo - 1;
    return index >= 0 ? index : null;
  }
  return state.lo < n ? state.lo : null;
}

export const xmatchFunction: FormulaFunctionEagerDefinition = {
  name: "XMATCH",
  category: "lookup",
  description: {
    en: "Returns the relative position of an item in a range/array (Excel XMATCH).",
    ja: "範囲/配列内での項目の相対位置を返します（Excel XMATCH）。",
  },
  examples: ["XMATCH(15000, C3:C9, -1)", "XMATCH(\"Key\", A1:A10)"],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 4) {
      throw new Error("XMATCH expects two to four arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "XMATCH lookup value");
    const vector = toLookupVector(args[1], "XMATCH lookup array");
    const matchMode = args.length >= 3 ? helpers.requireNumber(args[2], "XMATCH match_mode") : 0;
    const searchMode = args.length >= 4 ? helpers.requireNumber(args[3], "XMATCH search_mode") : 1;

    if (![0, -1, 1, 2].includes(matchMode)) {
      throw new Error("XMATCH match_mode must be -1, 0, 1, or 2");
    }
    if (![1, -1, 2, -2].includes(searchMode)) {
      throw new Error("XMATCH search_mode must be 1, -1, 2, or -2");
    }
    if (matchMode === 2) {
      throw new Error("XMATCH wildcard match is not implemented");
    }

    const resolveNotFound = () => {
      throw helpers.createFormulaError("#N/A", "XMATCH could not find a match");
    };

    const findExactLinear = (fromEnd: boolean): number | null => {
      if (!fromEnd) {
        for (let i = 0; i < vector.length; i += 1) {
          if (helpers.comparePrimitiveEquality(vector.at(i), lookupValue)) {
            return i;
          }
        }
        return null;
      }
      for (let i = vector.length - 1; i >= 0; i -= 1) {
        if (helpers.comparePrimitiveEquality(vector.at(i), lookupValue)) {
          return i;
        }
      }
      return null;
    };

    const findApproxLinear = (fromEnd: boolean, mode: -1 | 1): number | null => {
      if (typeof lookupValue !== "number") {
        throw new Error("XMATCH approximate match requires numeric lookup value");
      }

      const order = guessVectorOrder(vector);
      if (order === "unknown") {
        throw new Error("XMATCH approximate match requires an ordered numeric vector");
      }

      const iterateIndex = (i: number) => (fromEnd ? vector.length - 1 - i : i);

      if (order === "descending") {
        // Descending scan: boundary occurs once values cross below/above lookup.
        if (mode === -1) {
          for (let i = 0; i < vector.length; i += 1) {
            const idx = iterateIndex(i);
            const candidate = vector.at(idx);
            if (typeof candidate !== "number") {
              continue;
            }
            if (candidate <= lookupValue) {
              return idx;
            }
          }
          return null;
        }

        const state = { best: null as number | null };
        for (let i = 0; i < vector.length; i += 1) {
          const idx = iterateIndex(i);
          const candidate = vector.at(idx);
          if (typeof candidate !== "number") {
            continue;
          }
          if (candidate >= lookupValue) {
            state.best = idx;
          } else {
            break;
          }
        }
        return state.best;
      }

      // Ascending
      if (mode === 1) {
        for (let i = 0; i < vector.length; i += 1) {
          const idx = iterateIndex(i);
          const candidate = vector.at(idx);
          if (typeof candidate !== "number") {
            continue;
          }
          if (candidate >= lookupValue) {
            return idx;
          }
        }
        return null;
      }

      const state = { best: null as number | null };
      for (let i = 0; i < vector.length; i += 1) {
        const idx = iterateIndex(i);
        const candidate = vector.at(idx);
        if (typeof candidate !== "number") {
          continue;
        }
        if (candidate <= lookupValue) {
          state.best = idx;
        } else {
          break;
        }
      }
      return state.best;
    };

    const findIndex = (): number | null => {
      if (searchMode === 2 || searchMode === -2) {
        if (typeof lookupValue !== "number") {
          throw new Error("XMATCH binary search requires numeric lookup value");
        }
        const order = searchMode === 2 ? "ascending" : "descending";
        if (matchMode === 0) {
          return binarySearchExact(vector, lookupValue, order);
        }
        if (matchMode === 1) {
          return binarySearchNextLarger(vector, lookupValue, order);
        }
        return binarySearchNextSmaller(vector, lookupValue, order);
      }

      const fromEnd = searchMode === -1;
      if (matchMode === 0) {
        return findExactLinear(fromEnd);
      }
      return findApproxLinear(fromEnd, matchMode as -1 | 1);
    };

    const index = findIndex();
    if (index === null) {
      return resolveNotFound();
    }
    return index + 1;
  },
};
