/**
 * @file AutoFilter Evaluation Engine
 *
 * Pure functions for evaluating autoFilter conditions against cell values.
 * Determines which rows should be hidden based on filter configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 * @see ECMA-376 Part 4, Section 18.3.2.8 (filters)
 * @see ECMA-376 Part 4, Section 18.3.2.1 (customFilter)
 * @see ECMA-376 Part 4, Section 18.3.2.2 (customFilters)
 * @see ECMA-376 Part 4, Section 18.3.2.10 (top10)
 * @see ECMA-376 Part 4, Section 18.3.2.3 (dynamicFilter)
 * @see ECMA-376 Part 4, Section 18.18.31 (ST_FilterOperator)
 * @see ECMA-376 Part 4, Section 18.18.26 (ST_DynamicFilterType)
 */

import type { CellValue } from "./cell/types";
import type { XlsxWorksheet } from "./workbook";
import type {
  XlsxAutoFilter,
  XlsxFilterType,
  XlsxFilters,
  XlsxCustomFilters,
  XlsxCustomFilter,
  XlsxTop10Filter,
  XlsxDynamicFilter,
  XlsxFilterOperator,
} from "./auto-filter";
import { colIdx, rowIdx } from "./types";
import { getCellValue } from "./mutation/query";

// =============================================================================
// Cell value to string conversion
// =============================================================================

/**
 * Convert a CellValue to its string representation for filter comparison.
 *
 * ECMA-376 §18.3.2.7: filter val is always a string attribute.
 * Excel compares cell values against this string representation.
 *
 * - Numbers: decimal string (e.g. 100 → "100")
 * - Booleans: "TRUE" / "FALSE" (Excel convention)
 * - Strings: as-is
 * - Errors: the error string (e.g. "#N/A")
 * - Dates: ISO string (implementation-defined; Excel uses serial numbers internally)
 * - Empty: undefined (caller must handle)
 */
function cellValueToString(value: CellValue): string | undefined {
  switch (value.type) {
    case "string":
      return value.value;
    case "number":
      return String(value.value);
    case "boolean":
      return value.value ? "TRUE" : "FALSE";
    case "error":
      return value.value;
    case "date":
      return String(value.value.getTime());
    case "empty":
      return undefined;
  }
}

/**
 * Extract the numeric value from a CellValue, if applicable.
 * Returns undefined for non-numeric types.
 */
function cellValueToNumber(value: CellValue): number | undefined {
  switch (value.type) {
    case "number":
      return value.value;
    case "date":
      return value.value.getTime();
    default:
      return undefined;
  }
}

// =============================================================================
// Wildcard pattern matching
// =============================================================================

/**
 * Convert an Excel-style wildcard pattern to a RegExp.
 *
 * ECMA-376 §18.3.2.1: customFilter val supports wildcards:
 * - `*` matches any sequence of characters
 * - `?` matches any single character
 * - `~*` is a literal `*`
 * - `~?` is a literal `?`
 * - `~~` is a literal `~`
 */
/**
 * Token emitted by the wildcard pattern tokenizer.
 */
type WildcardToken =
  | { readonly kind: "literal"; readonly ch: string }
  | { readonly kind: "star" }
  | { readonly kind: "question" };

/**
 * Tokenize an Excel wildcard pattern into semantic tokens.
 *
 * Handles escape sequences: `~*` → literal `*`, `~?` → literal `?`, `~~` → literal `~`.
 */
function tokenizeWildcardPattern(pattern: string): readonly WildcardToken[] {
  const tokens: WildcardToken[] = [];
  const chars = [...pattern];
  const iter = chars[Symbol.iterator]();

  function advance(): IteratorResult<string> {
    return iter.next();
  }

  const first = advance();
  if (first.done) {
    return tokens;
  }
  const process = (ch: string): void => {
    if (ch === "~") {
      const next = advance();
      if (!next.done && (next.value === "*" || next.value === "?" || next.value === "~")) {
        tokens.push({ kind: "literal", ch: next.value });
      } else {
        tokens.push({ kind: "literal", ch });
        if (!next.done) {
          process(next.value);
        }
      }
    } else if (ch === "*") {
      tokens.push({ kind: "star" });
    } else if (ch === "?") {
      tokens.push({ kind: "question" });
    } else {
      tokens.push({ kind: "literal", ch });
    }
  };

  process(first.value);
  for (const ch of iter) {
    process(ch);
  }

  return tokens;
}

function escapeRegExpChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wildcardToRegExp(pattern: string): RegExp {
  const tokens = tokenizeWildcardPattern(pattern);
  const regexParts = tokens.map((token): string => {
    switch (token.kind) {
      case "star":
        return ".*";
      case "question":
        return ".";
      case "literal":
        return escapeRegExpChar(token.ch);
    }
  });
  return new RegExp(`^${regexParts.join("")}$`, "u");
}

/**
 * Remove escape sequences from a wildcard pattern that has no actual wildcards.
 * `~*` → `*`, `~?` → `?`, `~~` → `~`
 */
function unescapeWildcardPattern(pattern: string): string {
  const tokens = tokenizeWildcardPattern(pattern);
  return tokens.map((token) => {
    switch (token.kind) {
      case "star":
        return "*";
      case "question":
        return "?";
      case "literal":
        return token.ch;
    }
  }).join("");
}

/**
 * Check whether a pattern string contains unescaped wildcards.
 */
function hasWildcards(pattern: string): boolean {
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "~" && i + 1 < pattern.length) {
      i++; // skip escaped char
      continue;
    }
    if (ch === "*" || ch === "?") {
      return true;
    }
  }
  return false;
}

// =============================================================================
// Single condition evaluation
// =============================================================================

/**
 * Evaluate a single customFilter condition against a cell value.
 *
 * Comparison semantics:
 * - If both the filter val and cell value can be parsed as numbers, compare numerically.
 * - Otherwise, compare as strings (case-insensitive for equal/notEqual with wildcards).
 * - Empty cells never match custom filters.
 */
function evaluateCustomCondition(condition: XlsxCustomFilter, cellValue: CellValue): boolean {
  if (cellValue.type === "empty") {
    return false;
  }

  const operator: XlsxFilterOperator = condition.operator ?? "equal";
  const filterValStr = condition.val ?? "";

  // For equal/notEqual, handle wildcard patterns and escape sequences
  if (operator === "equal" || operator === "notEqual") {
    if (hasWildcards(filterValStr)) {
      const strVal = cellValueToString(cellValue);
      if (strVal === undefined) {
        return operator === "notEqual";
      }
      const regex = wildcardToRegExp(filterValStr);
      const matches = regex.test(strVal);
      return operator === "equal" ? matches : !matches;
    }
    // Even without wildcards, the pattern may contain escape sequences (~*, ~?, ~~)
    if (filterValStr.includes("~")) {
      const strVal = cellValueToString(cellValue);
      if (strVal === undefined) {
        return operator === "notEqual";
      }
      const unescaped = unescapeWildcardPattern(filterValStr);
      const matches = strVal === unescaped;
      return operator === "equal" ? matches : !matches;
    }
  }

  // Try numeric comparison first
  const cellNum = cellValueToNumber(cellValue);
  const filterNum = Number(filterValStr);
  if (cellNum !== undefined && !Number.isNaN(filterNum)) {
    return compareNumeric(cellNum, filterNum, operator);
  }

  // Fall back to string comparison
  const cellStr = cellValueToString(cellValue);
  if (cellStr === undefined) {
    return false;
  }
  return compareStrings(cellStr, filterValStr, operator);
}

function compareNumeric(cellVal: number, filterVal: number, operator: XlsxFilterOperator): boolean {
  switch (operator) {
    case "equal":
      return cellVal === filterVal;
    case "notEqual":
      return cellVal !== filterVal;
    case "lessThan":
      return cellVal < filterVal;
    case "lessThanOrEqual":
      return cellVal <= filterVal;
    case "greaterThan":
      return cellVal > filterVal;
    case "greaterThanOrEqual":
      return cellVal >= filterVal;
  }
}

function compareStrings(cellVal: string, filterVal: string, operator: XlsxFilterOperator): boolean {
  const cmp = cellVal.localeCompare(filterVal);
  switch (operator) {
    case "equal":
      return cmp === 0;
    case "notEqual":
      return cmp !== 0;
    case "lessThan":
      return cmp < 0;
    case "lessThanOrEqual":
      return cmp <= 0;
    case "greaterThan":
      return cmp > 0;
    case "greaterThanOrEqual":
      return cmp >= 0;
  }
}

// =============================================================================
// Filter type evaluation
// =============================================================================

/**
 * Evaluate a value-list filter (§18.3.2.8 filters).
 *
 * A cell matches if its string representation appears in the value list,
 * or if the cell is empty and `blank` is true.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.8 (filters)
 * @see ECMA-376 Part 4, Section 18.3.2.7 (filter — individual value)
 */
function evaluateFilters(filter: XlsxFilters, cellValue: CellValue): boolean {
  const isEmpty = cellValue.type === "empty";

  if (isEmpty) {
    return filter.blank === true;
  }

  if (!filter.values || filter.values.length === 0) {
    return false;
  }

  const cellStr = cellValueToString(cellValue);
  if (cellStr === undefined) {
    return false;
  }

  return filter.values.some((v) => v.val === cellStr);
}

/**
 * Evaluate a custom filter with 1–2 operator conditions (§18.3.2.2 customFilters).
 *
 * When `and` is true, both conditions must match (AND). Otherwise, either
 * condition matching is sufficient (OR).
 *
 * @see ECMA-376 Part 4, Section 18.3.2.2 (customFilters)
 * @see ECMA-376 Part 4, Section 18.3.2.1 (customFilter — individual condition)
 * @see ECMA-376 Part 4, Section 18.18.31 (ST_FilterOperator)
 */
function evaluateCustomFilters(filter: XlsxCustomFilters, cellValue: CellValue): boolean {
  if (filter.conditions.length === 0) {
    return true;
  }

  if (filter.and) {
    return filter.conditions.every((c) => evaluateCustomCondition(c, cellValue));
  }
  return filter.conditions.some((c) => evaluateCustomCondition(c, cellValue));
}

/**
 * Evaluate a top-N / bottom-N filter (§18.3.2.10 top10).
 *
 * Uses the pre-computed `filterVal` threshold. When `top` is true (default),
 * cells with value >= filterVal pass. When false, cells <= filterVal pass.
 * `percent` determines whether `val` is a count or percentage (the threshold
 * `filterVal` is pre-computed either way by the application).
 *
 * @see ECMA-376 Part 4, Section 18.3.2.10 (top10)
 */
function evaluateTop10(filter: XlsxTop10Filter, cellValue: CellValue): boolean {
  // top10 uses a pre-computed filterVal threshold.
  // If filterVal is not set, the filter cannot be evaluated at the per-cell level.
  if (filter.filterVal === undefined) {
    return true;
  }

  const cellNum = cellValueToNumber(cellValue);
  if (cellNum === undefined) {
    return false;
  }

  const isTop = filter.top !== false; // default is top
  return isTop ? cellNum >= filter.filterVal : cellNum <= filter.filterVal;
}

/**
 * Evaluate a dynamic filter (§18.3.2.3 dynamicFilter).
 *
 * Dynamic filters use application-computed values. The `val` attribute
 * holds the threshold (e.g. the average for aboveAverage/belowAverage).
 * For date-based filters (today, thisWeek, etc.), `val` and `maxVal`
 * define the date range as serial number boundaries.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.3 (dynamicFilter)
 * @see ECMA-376 Part 4, Section 18.18.26 (ST_DynamicFilterType)
 */
function evaluateDynamic(filter: XlsxDynamicFilter, cellValue: CellValue): boolean {
  // Dynamic filters that operate on pre-computed val (set by the application).
  // aboveAverage/belowAverage: val holds the computed average.
  if (filter.val === undefined) {
    return true;
  }

  const cellNum = cellValueToNumber(cellValue);
  if (cellNum === undefined) {
    return false;
  }

  switch (filter.filterType) {
    case "aboveAverage":
      return cellNum > filter.val;
    case "belowAverage":
      return cellNum < filter.val;
    default:
      // Date-based dynamic filters (today, thisWeek, etc.) would need
      // date evaluation logic. For now, fall back to pre-computed val/maxVal range.
      if (filter.maxVal !== undefined) {
        return cellNum >= filter.val && cellNum <= filter.maxVal;
      }
      return cellNum === filter.val;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Evaluate whether a cell value matches a filter condition.
 *
 * @param filter - The filter condition to evaluate
 * @param cellValue - The cell value to test
 * @returns true if the cell value matches the filter (row should be visible)
 *
 * @see ECMA-376 Part 4, Section 18.3.2 (AutoFilter filter types)
 */
export function evaluateFilter(filter: XlsxFilterType, cellValue: CellValue): boolean {
  switch (filter.type) {
    case "filters":
      return evaluateFilters(filter, cellValue);
    case "customFilters":
      return evaluateCustomFilters(filter, cellValue);
    case "top10":
      return evaluateTop10(filter, cellValue);
    case "dynamicFilter":
      return evaluateDynamic(filter, cellValue);
    case "colorFilter":
    case "iconFilter":
      // Color and icon filters require DXF/conditional formatting context
      // which is not available at the domain evaluation level.
      // These filters are always treated as "pass" (no hiding).
      return true;
  }
}

/**
 * Evaluate which rows should be hidden given the current autoFilter configuration.
 *
 * Returns a Set of 1-based row numbers that should be hidden.
 * The header row (first row of autoFilter.ref) is never included.
 * Rows outside the autoFilter.ref range are never included.
 *
 * Multiple filterColumns use AND logic: a row must match ALL column filters
 * to remain visible.
 *
 * @param autoFilter - The autoFilter configuration
 * @param worksheet - The worksheet (for cell data access)
 * @returns Set of row numbers (1-based) to hide
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 */
export function evaluateAutoFilter(
  autoFilter: XlsxAutoFilter,
  worksheet: XlsxWorksheet,
): ReadonlySet<number> {
  const hiddenRows = new Set<number>();

  // No filter columns → nothing to filter
  const filterColumns = autoFilter.filterColumns;
  if (!filterColumns || filterColumns.length === 0) {
    return hiddenRows;
  }

  // Collect only filterColumns that have an actual filter defined
  const activeFilters = filterColumns.filter((fc) => fc.filter !== undefined);
  if (activeFilters.length === 0) {
    return hiddenRows;
  }

  const refStartRow = autoFilter.ref.start.row as number;
  const refEndRow = autoFilter.ref.end.row as number;
  const refStartCol = autoFilter.ref.start.col as number;
  const headerRow = Math.min(refStartRow, refEndRow);
  const dataStartRow = headerRow + 1;
  const dataEndRow = Math.max(refStartRow, refEndRow);

  const emptyValue: CellValue = { type: "empty" };

  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const visible = activeFilters.every((fc) => {
      // colId is 0-based relative to the autoFilter ref's start column
      const absoluteCol = refStartCol + (fc.colId as number);
      const cellValue =
        getCellValue(worksheet, {
          col: colIdx(absoluteCol),
          row: rowIdx(row),
          colAbsolute: false,
          rowAbsolute: false,
        }) ?? emptyValue;

      return evaluateFilter(fc.filter!, cellValue);
    });

    if (!visible) {
      hiddenRows.add(row);
    }
  }

  return hiddenRows;
}
