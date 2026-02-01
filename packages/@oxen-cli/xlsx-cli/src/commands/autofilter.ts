/**
 * @file autofilter command - display auto filter configurations
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type { XlsxFilterType, XlsxFilterColumn, XlsxSortState } from "@oxen-office/xlsx/domain/auto-filter";
import { formatRange } from "@oxen-office/xlsx/domain/cell/address";

// =============================================================================
// Types
// =============================================================================

export type FilterColumnJson = {
  readonly colId: number;
  readonly filterType: string;
  readonly hiddenButton?: boolean;
  readonly showButton?: boolean;
  readonly values?: readonly string[];
  readonly operator?: string;
  readonly conditions?: readonly { operator?: string; val?: string }[];
  readonly dynamicType?: string;
  readonly top10?: { top?: boolean; percent?: boolean; val?: number };
};

export type SortConditionJson = {
  readonly ref: string;
  readonly descending?: boolean;
};

export type SortStateJson = {
  readonly ref: string;
  readonly caseSensitive?: boolean;
  readonly conditions?: readonly SortConditionJson[];
};

export type SheetAutofilterJson = {
  readonly sheetName: string;
  readonly ref: string;
  readonly filterColumns: readonly FilterColumnJson[];
  readonly sortState?: SortStateJson;
};

export type AutofilterData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetAutofilterJson[];
};

// =============================================================================
// Serialization Helpers
// =============================================================================

function serializeFilter(filter: XlsxFilterType): Partial<FilterColumnJson> {
  switch (filter.type) {
    case "filters":
      return {
        filterType: "filters",
        values: filter.values?.map((v) => v.val),
      };
    case "customFilters":
      return {
        filterType: "customFilters",
        operator: filter.and ? "and" : "or",
        conditions: filter.conditions.map((c) => ({
          operator: c.operator,
          val: c.val,
        })),
      };
    case "top10":
      return {
        filterType: "top10",
        top10: {
          top: filter.top,
          percent: filter.percent,
          val: filter.val,
        },
      };
    case "dynamicFilter":
      return {
        filterType: "dynamicFilter",
        dynamicType: filter.filterType,
      };
    case "colorFilter":
      return {
        filterType: "colorFilter",
      };
    case "iconFilter":
      return {
        filterType: "iconFilter",
      };
    default:
      return { filterType: "unknown" };
  }
}

function serializeFilterColumn(col: XlsxFilterColumn): FilterColumnJson {
  const base: FilterColumnJson = {
    colId: col.colId,
    filterType: col.filter?.type ?? "none",
    ...(col.hiddenButton !== undefined && { hiddenButton: col.hiddenButton }),
    ...(col.showButton !== undefined && { showButton: col.showButton }),
  };

  if (col.filter) {
    return { ...base, ...serializeFilter(col.filter) };
  }

  return base;
}

function serializeSortState(sortState: XlsxSortState): SortStateJson {
  return {
    ref: sortState.ref,
    ...(sortState.caseSensitive !== undefined && { caseSensitive: sortState.caseSensitive }),
    ...(sortState.sortConditions && {
      conditions: sortState.sortConditions.map((c) => ({
        ref: c.ref,
        ...(c.descending !== undefined && { descending: c.descending }),
      })),
    }),
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display auto filter configurations from an XLSX file.
 */
export async function runAutofilter(
  filePath: string,
  options: { sheet?: string } = {}
): Promise<Result<AutofilterData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetAutofilterJson[] = workbook.sheets
      .filter((sheet) => !options.sheet || sheet.name === options.sheet)
      .filter((sheet) => sheet.autoFilter)
      .map((sheet) => {
        const af = sheet.autoFilter!;
        return {
          sheetName: sheet.name,
          ref: formatRange(af.ref),
          filterColumns: af.filterColumns?.map(serializeFilterColumn) ?? [],
          ...(af.sortState && { sortState: serializeSortState(af.sortState) }),
        };
      });

    return success({
      totalCount: sheets.length,
      sheets,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
