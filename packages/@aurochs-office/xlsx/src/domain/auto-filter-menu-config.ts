/**
 * @file AutoFilter menu configuration
 *
 * Maps ColumnDataType to sort labels and filter submenu items.
 * Provides a builder for customFilters conditions from submenu actions.
 *
 * This is a pure data/logic module with no UI dependencies.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.1 (customFilter)
 * @see ECMA-376 Part 4, Section 18.3.2.2 (customFilters)
 * @see ECMA-376 Part 4, Section 18.3.2.10 (top10)
 * @see ECMA-376 Part 4, Section 18.3.2.3 (dynamicFilter)
 * @see ECMA-376 Part 4, Section 18.18.26 (ST_DynamicFilterType)
 * @see ECMA-376 Part 4, Section 18.18.31 (ST_FilterOperator)
 */

import type { XlsxCustomFilters, XlsxFilterOperator } from "./auto-filter";
import type { ColumnDataType } from "./auto-filter-column-type";

// =============================================================================
// Sort labels
// =============================================================================

export type SortLabels = {
  readonly ascending: string;
  readonly descending: string;
};

const SORT_LABELS: Record<ColumnDataType, SortLabels> = {
  text: { ascending: "昇順 (A→Z)", descending: "降順 (Z→A)" },
  number: { ascending: "小さい順", descending: "大きい順" },
  date: { ascending: "古い順", descending: "新しい順" },
  mixed: { ascending: "昇順 (A→Z)", descending: "降順 (Z→A)" },
};

/**
 * Get sort button labels for the given column data type.
 */
export function getSortLabels(dataType: ColumnDataType): SortLabels {
  return SORT_LABELS[dataType];
}

// =============================================================================
// Filter submenu
// =============================================================================

export type FilterSubmenuItem = {
  /** Action identifier (maps to buildCustomFilter actionId) */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /**
   * Whether this action requires user input (a value prompt).
   * If false, it is applied immediately (e.g. "today", "aboveAverage").
   */
  readonly requiresInput: boolean;
  /**
   * Whether this action requires two inputs (e.g. "between").
   */
  readonly requiresTwoInputs?: boolean;
};

export type FilterSubmenuConfig = {
  readonly submenuLabel: string;
  readonly items: readonly FilterSubmenuItem[];
};

const TEXT_FILTER_ITEMS: readonly FilterSubmenuItem[] = [
  { id: "equal", label: "指定の値に等しい...", requiresInput: true },
  { id: "notEqual", label: "指定の値に等しくない...", requiresInput: true },
  { id: "beginsWith", label: "指定の値で始まる...", requiresInput: true },
  { id: "endsWith", label: "指定の値で終わる...", requiresInput: true },
  { id: "contains", label: "指定の値を含む...", requiresInput: true },
  { id: "notContains", label: "指定の値を含まない...", requiresInput: true },
];

const NUMBER_FILTER_ITEMS: readonly FilterSubmenuItem[] = [
  { id: "equal", label: "指定の値に等しい...", requiresInput: true },
  { id: "notEqual", label: "指定の値に等しくない...", requiresInput: true },
  { id: "greaterThan", label: "指定の値より大きい...", requiresInput: true },
  { id: "greaterThanOrEqual", label: "指定の値以上...", requiresInput: true },
  { id: "lessThan", label: "指定の値より小さい...", requiresInput: true },
  { id: "lessThanOrEqual", label: "指定の値以下...", requiresInput: true },
  { id: "between", label: "指定の範囲内...", requiresInput: true, requiresTwoInputs: true },
  { id: "top10", label: "トップ10...", requiresInput: true },
  { id: "aboveAverage", label: "平均より上", requiresInput: false },
  { id: "belowAverage", label: "平均より下", requiresInput: false },
];

const DATE_FILTER_ITEMS: readonly FilterSubmenuItem[] = [
  { id: "equal", label: "指定の値に等しい...", requiresInput: true },
  { id: "before", label: "指定の値より前...", requiresInput: true },
  { id: "after", label: "指定の値より後...", requiresInput: true },
  { id: "between", label: "指定の範囲内...", requiresInput: true, requiresTwoInputs: true },
  { id: "today", label: "今日", requiresInput: false },
  { id: "yesterday", label: "昨日", requiresInput: false },
  { id: "thisWeek", label: "今週", requiresInput: false },
  { id: "lastWeek", label: "先週", requiresInput: false },
  { id: "thisMonth", label: "今月", requiresInput: false },
  { id: "lastMonth", label: "先月", requiresInput: false },
  { id: "thisYear", label: "今年", requiresInput: false },
  { id: "lastYear", label: "去年", requiresInput: false },
];

const FILTER_SUBMENU: Record<ColumnDataType, FilterSubmenuConfig | undefined> = {
  text: { submenuLabel: "テキストフィルター", items: TEXT_FILTER_ITEMS },
  number: { submenuLabel: "数値フィルター", items: NUMBER_FILTER_ITEMS },
  date: { submenuLabel: "日付フィルター", items: DATE_FILTER_ITEMS },
  mixed: undefined,
};

/**
 * Get filter submenu configuration for the given column data type.
 * Returns undefined for "mixed" (no submenu available).
 */
export function getFilterSubmenuItems(dataType: ColumnDataType): FilterSubmenuConfig | undefined {
  return FILTER_SUBMENU[dataType];
}

// =============================================================================
// Operator options for inline Select dropdowns
// =============================================================================

export type OperatorOption = {
  readonly value: string;
  readonly label: string;
};

const TEXT_OPERATORS: readonly OperatorOption[] = [
  { value: "contains", label: "を含む" },
  { value: "notContains", label: "を含まない" },
  { value: "equal", label: "に等しい" },
  { value: "notEqual", label: "に等しくない" },
  { value: "beginsWith", label: "で始まる" },
  { value: "endsWith", label: "で終わる" },
];

const NUMBER_OPERATORS: readonly OperatorOption[] = [
  { value: "equal", label: "に等しい" },
  { value: "notEqual", label: "に等しくない" },
  { value: "greaterThan", label: "より大きい" },
  { value: "greaterThanOrEqual", label: "以上" },
  { value: "lessThan", label: "より小さい" },
  { value: "lessThanOrEqual", label: "以下" },
];

const DATE_OPERATORS: readonly OperatorOption[] = [
  { value: "equal", label: "に等しい" },
  { value: "before", label: "より前" },
  { value: "after", label: "より後" },
];

const OPERATOR_OPTIONS: Record<ColumnDataType, readonly OperatorOption[]> = {
  text: TEXT_OPERATORS,
  number: NUMBER_OPERATORS,
  date: DATE_OPERATORS,
  mixed: TEXT_OPERATORS,
};

/**
 * Get operator options for the inline condition Select dropdowns.
 */
export function getOperatorOptions(dataType: ColumnDataType): readonly OperatorOption[] {
  return OPERATOR_OPTIONS[dataType];
}

// =============================================================================
// Custom filter builder
// =============================================================================

/**
 * Escape wildcard characters in user input so they are treated as literals
 * when embedded in a wildcard pattern.
 *
 * ECMA-376 §18.3.2.1: `~*` = literal `*`, `~?` = literal `?`, `~~` = literal `~`
 */
function escapeWildcardInput(input: string): string {
  return input.replace(/[~*?]/g, (ch) => `~${ch}`);
}

/**
 * Build an XlsxCustomFilters from a filter submenu action.
 *
 * @param actionId - The filter action (e.g. "equal", "contains", "between")
 * @param value1 - The primary value (user input)
 * @param value2 - The secondary value (for "between" actions)
 * @returns XlsxCustomFilters ready to be applied as a filterColumn filter
 */
export function buildCustomFilter(
  actionId: string,
  value1: string,
  value2?: string,
): XlsxCustomFilters {
  switch (actionId) {
    // Direct operator mappings
    case "equal":
      return single("equal", value1);
    case "notEqual":
      return single("notEqual", value1);
    case "greaterThan":
      return single("greaterThan", value1);
    case "greaterThanOrEqual":
      return single("greaterThanOrEqual", value1);
    case "lessThan":
      return single("lessThan", value1);
    case "lessThanOrEqual":
      return single("lessThanOrEqual", value1);

    // Wildcard patterns for text filters
    case "contains":
      return single("equal", `*${escapeWildcardInput(value1)}*`);
    case "notContains":
      return single("notEqual", `*${escapeWildcardInput(value1)}*`);
    case "beginsWith":
      return single("equal", `${escapeWildcardInput(value1)}*`);
    case "endsWith":
      return single("equal", `*${escapeWildcardInput(value1)}`);

    // Range (AND condition)
    case "between":
      return {
        type: "customFilters",
        and: true,
        conditions: [
          { operator: "greaterThanOrEqual", val: value1 },
          { operator: "lessThanOrEqual", val: value2 ?? value1 },
        ],
      };

    // Date aliases → map to standard operators
    case "before":
      return single("lessThan", value1);
    case "after":
      return single("greaterThan", value1);

    default:
      return single("equal", value1);
  }
}

function single(operator: XlsxFilterOperator, val: string): XlsxCustomFilters {
  return {
    type: "customFilters",
    conditions: [{ operator, val }],
  };
}
