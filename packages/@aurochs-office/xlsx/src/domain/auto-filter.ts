/**
 * @file Auto Filter Type Definitions
 *
 * Defines types for auto filter functionality in worksheets.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 * @see ECMA-376 Part 4, Section 18.3.2.5 (filterColumn)
 */

import type { CellRange } from "./cell/address";
import type { ColIndex } from "./types";

// =============================================================================
// Filter Values
// =============================================================================

/**
 * Individual filter value.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.7 (filter)
 */
export type XlsxFilterValue = {
  /** The value to filter */
  readonly val: string;
};

/**
 * Filter by specific values.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.8 (filters)
 */
export type XlsxFilters = {
  readonly type: "filters";
  /** Whether to include blank cells */
  readonly blank?: boolean;
  /** Filter values */
  readonly values?: readonly XlsxFilterValue[];
};

// =============================================================================
// Custom Filters
// =============================================================================

/**
 * Custom filter operators.
 *
 * @see ECMA-376 Part 4, Section 18.18.31 (ST_FilterOperator)
 */
export type XlsxFilterOperator =
  | "equal"
  | "lessThan"
  | "lessThanOrEqual"
  | "notEqual"
  | "greaterThanOrEqual"
  | "greaterThan";

/**
 * Single custom filter condition.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.1 (customFilter)
 */
export type XlsxCustomFilter = {
  /** Filter operator */
  readonly operator?: XlsxFilterOperator;
  /** Value to compare against */
  readonly val?: string;
};

/**
 * Custom filter configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.2 (customFilters)
 */
export type XlsxCustomFilters = {
  readonly type: "customFilters";
  /** Whether both conditions must match (AND) or just one (OR) */
  readonly and?: boolean;
  /** Filter conditions (1-2 conditions) */
  readonly conditions: readonly XlsxCustomFilter[];
};

// =============================================================================
// Top10 Filter
// =============================================================================

/**
 * Top 10 filter configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.10 (top10)
 */
export type XlsxTop10Filter = {
  readonly type: "top10";
  /** Whether to get top (true) or bottom (false) values */
  readonly top?: boolean;
  /** Whether val is a percentage */
  readonly percent?: boolean;
  /** Number of items or percentage */
  readonly val?: number;
  /** The actual value used for filtering */
  readonly filterVal?: number;
};

// =============================================================================
// Date Grouping Filter
// =============================================================================

/**
 * Date grouping values.
 *
 * @see ECMA-376 Part 4, Section 18.18.18 (ST_DateTimeGrouping)
 */
export type XlsxDateTimeGrouping = "year" | "month" | "day" | "hour" | "minute" | "second";

/**
 * Date grouping item.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.4 (dateGroupItem)
 */
export type XlsxDateGroupItem = {
  /** Year component */
  readonly year: number;
  /** Month component (1-12) */
  readonly month?: number;
  /** Day component (1-31) */
  readonly day?: number;
  /** Hour component (0-23) */
  readonly hour?: number;
  /** Minute component (0-59) */
  readonly minute?: number;
  /** Second component (0-59) */
  readonly second?: number;
  /** Date/time grouping type */
  readonly dateTimeGrouping: XlsxDateTimeGrouping;
};

// =============================================================================
// Dynamic Filter
// =============================================================================

/**
 * Dynamic filter types.
 *
 * @see ECMA-376 Part 4, Section 18.18.26 (ST_DynamicFilterType)
 */
export type XlsxDynamicFilterType =
  | "null"
  | "aboveAverage"
  | "belowAverage"
  | "tomorrow"
  | "today"
  | "yesterday"
  | "nextWeek"
  | "thisWeek"
  | "lastWeek"
  | "nextMonth"
  | "thisMonth"
  | "lastMonth"
  | "nextQuarter"
  | "thisQuarter"
  | "lastQuarter"
  | "nextYear"
  | "thisYear"
  | "lastYear"
  | "yearToDate"
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | "M1"
  | "M2"
  | "M3"
  | "M4"
  | "M5"
  | "M6"
  | "M7"
  | "M8"
  | "M9"
  | "M10"
  | "M11"
  | "M12";

/**
 * Dynamic filter configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.3 (dynamicFilter)
 */
export type XlsxDynamicFilter = {
  readonly type: "dynamicFilter";
  /** Dynamic filter type */
  readonly filterType: XlsxDynamicFilterType;
  /** Value for dynamic filter (e.g., average value) */
  readonly val?: number;
  /** Maximum value for range-based dynamic filters */
  readonly maxVal?: number;
};

// =============================================================================
// Color Filter
// =============================================================================

/**
 * Color filter configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.0 (colorFilter - extension)
 */
export type XlsxColorFilter = {
  readonly type: "colorFilter";
  /** Whether to filter by cell color (true) or font color (false) */
  readonly cellColor?: boolean;
  /** DXF ID for the color */
  readonly dxfId?: number;
};

// =============================================================================
// Icon Filter
// =============================================================================

/**
 * Icon filter configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.6 (iconFilter - extension)
 */
export type XlsxIconFilter = {
  readonly type: "iconFilter";
  /** Icon set name */
  readonly iconSet?: string;
  /** Icon ID within the set */
  readonly iconId?: number;
};

// =============================================================================
// Filter Column
// =============================================================================

/**
 * Filter type union.
 */
export type XlsxFilterType =
  | XlsxFilters
  | XlsxCustomFilters
  | XlsxTop10Filter
  | XlsxDynamicFilter
  | XlsxColorFilter
  | XlsxIconFilter;

/**
 * Filter column definition.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.5 (filterColumn)
 */
export type XlsxFilterColumn = {
  /** Column index (0-based relative to autoFilter ref) */
  readonly colId: ColIndex;
  /** Whether dropdown is hidden */
  readonly hiddenButton?: boolean;
  /** Whether to show the filter dropdown button */
  readonly showButton?: boolean;
  /** Filter configuration */
  readonly filter?: XlsxFilterType;
};

// =============================================================================
// Sort State
// =============================================================================

/**
 * Sort condition for a column.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.91 (sortCondition)
 */
export type XlsxSortCondition = {
  /** Whether to sort descending (default: ascending) */
  readonly descending?: boolean;
  /** Cell range reference for this sort condition */
  readonly ref: string;
};

/**
 * Sort state configuration.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.92 (sortState)
 */
export type XlsxSortState = {
  /** Whether sort is case-sensitive */
  readonly caseSensitive?: boolean;
  /** Reference range for sorting */
  readonly ref: string;
  /** Sort conditions */
  readonly sortConditions?: readonly XlsxSortCondition[];
};

// =============================================================================
// Auto Filter
// =============================================================================

/**
 * Auto filter definition.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 */
export type XlsxAutoFilter = {
  /** The range reference for the auto filter area */
  readonly ref: CellRange;
  /** Filter columns with conditions */
  readonly filterColumns?: readonly XlsxFilterColumn[];
  /** Sort state for the auto filter */
  readonly sortState?: XlsxSortState;
};
