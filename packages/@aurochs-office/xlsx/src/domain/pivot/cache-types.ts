/**
 * @file Pivot Cache Type Definitions
 *
 * Defines types for pivot cache definitions and records.
 *
 * @see ECMA-376 Part 4, Section 18.10 (Pivot Tables)
 */

// =============================================================================
// Pivot Cache Field Types
// =============================================================================

/**
 * Shared item in a pivot cache field.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.77 (s - string)
 * @see ECMA-376 Part 4, Section 18.10.1.58 (n - number)
 */
export type XlsxPivotCacheItem = {
  /** Item type */
  readonly type: "s" | "n" | "b" | "e" | "d" | "m";
  /** String value (for type "s") */
  readonly v?: string;
  /** Numeric value (for type "n" or "d") */
  readonly n?: number;
  /** Boolean value (for type "b") */
  readonly b?: boolean;
  /** Error value (for type "e") */
  readonly e?: string;
};

/**
 * Cache field definition.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.3 (cacheField)
 */
export type XlsxPivotCacheField = {
  /** Field name */
  readonly name: string;
  /** Number format ID */
  readonly numFmtId?: number;
  /** Database field (1-based column index) */
  readonly databaseField?: boolean;
  /** Whether field has shared items */
  readonly sharedItems?: readonly XlsxPivotCacheItem[];
};

// =============================================================================
// Pivot Cache Source Types
// =============================================================================

/**
 * Worksheet source for pivot cache.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.96 (worksheetSource)
 */
export type XlsxPivotCacheWorksheetSource = {
  readonly type: "worksheet";
  /** Source range reference (e.g., "Sheet1!$A$1:$D$100") */
  readonly ref?: string;
  /** Sheet name */
  readonly sheet?: string;
  /** Named range or table name */
  readonly name?: string;
};

/**
 * Consolidation source for pivot cache.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.16 (consolidation)
 */
export type XlsxPivotCacheConsolidationSource = {
  readonly type: "consolidation";
  /** Whether to auto refresh on open */
  readonly autoPage?: boolean;
};

/**
 * Source for pivot cache data.
 */
export type XlsxPivotCacheSource =
  | XlsxPivotCacheWorksheetSource
  | XlsxPivotCacheConsolidationSource;

// =============================================================================
// Pivot Cache Definition
// =============================================================================

/**
 * Pivot cache definition.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.67 (pivotCacheDefinition)
 */
export type XlsxPivotCacheDefinition = {
  /** Unique cache ID */
  readonly cacheId: number;
  /** Whether to refresh on load */
  readonly refreshOnLoad?: boolean;
  /** Record count in the cache */
  readonly recordCount?: number;
  /** Upgrade on refresh */
  readonly upgradeOnRefresh?: boolean;
  /** Save data */
  readonly saveData?: boolean;
  /** Background query */
  readonly backgroundQuery?: boolean;
  /** Created version */
  readonly createdVersion?: number;
  /** Refreshed version */
  readonly refreshedVersion?: number;
  /** Min refreshable version */
  readonly minRefreshableVersion?: number;
  /** Cache source */
  readonly cacheSource?: XlsxPivotCacheSource;
  /** Cache fields */
  readonly cacheFields?: readonly XlsxPivotCacheField[];
  /** Path to the pivot cache definition XML */
  readonly xmlPath: string;
};

// =============================================================================
// Pivot Cache Records
// =============================================================================

/**
 * A single record value in the pivot cache.
 */
export type XlsxPivotRecordValue = {
  /** Value type */
  readonly type: "x" | "s" | "n" | "b" | "e" | "d" | "m";
  /** Shared item index (for type "x") */
  readonly x?: number;
  /** String value (for type "s") */
  readonly v?: string;
  /** Numeric value (for type "n" or "d") */
  readonly n?: number;
  /** Boolean value (for type "b") */
  readonly b?: boolean;
  /** Error value (for type "e") */
  readonly e?: string;
};

/**
 * A record in the pivot cache.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.75 (r - record)
 */
export type XlsxPivotRecord = {
  /** Values in this record (one per field) */
  readonly values: readonly XlsxPivotRecordValue[];
};

/**
 * Pivot cache records.
 *
 * @see ECMA-376 Part 4, Section 18.10.1.68 (pivotCacheRecords)
 */
export type XlsxPivotCacheRecords = {
  /** Number of records */
  readonly count: number;
  /** Records */
  readonly records: readonly XlsxPivotRecord[];
};
