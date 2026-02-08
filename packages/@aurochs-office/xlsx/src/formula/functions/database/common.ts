/**
 * @file Shared utilities for database functions (ODF 1.3 §6.7).
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult, FormulaFunctionHelpers } from "../helpers";
import { toLookupTable } from "../lookup/table";

export type DatabaseTable = {
  headers: string[];
  headerMap: Map<string, number>;
  rows: FormulaEvaluationResult[][];
};

const normalizeHeaderLabel = (value: FormulaEvaluationResult, description: string, columnIndex: number): string => {
  if (typeof value !== "string") {
    throw new Error(`${description} header at column ${columnIndex + 1} must be text`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${description} header at column ${columnIndex + 1} cannot be empty`);
  }
  return trimmed;
};

export const parseDatabaseArgument = (databaseArg: EvalResult, functionName: string): DatabaseTable => {
  const table = toLookupTable(databaseArg, `${functionName} database`);
  const headerRow = table[0];
  if (!headerRow) {
    throw new Error(`${functionName} database must include a header row`);
  }

  const headers = headerRow.map((cell, columnIndex) =>
    normalizeHeaderLabel(cell, `${functionName} database`, columnIndex),
  );

  const headerMap = headers.reduce<Map<string, number>>((map, header, index) => {
    const key = header.toUpperCase();
    if (map.has(key)) {
      throw new Error(`${functionName} database header "${header}" must be unique`);
    }
    map.set(key, index);
    return map;
  }, new Map());

  return {
    headers,
    headerMap,
    rows: table.slice(1),
  };
};

export const resolveFieldIndex = (
  fieldValue: FormulaEvaluationResult,
  database: DatabaseTable,
  functionName: string,
): number => {
  if (typeof fieldValue === "number") {
    if (!Number.isInteger(fieldValue)) {
      throw new Error(`${functionName} field index must be an integer`);
    }
    if (fieldValue < 1 || fieldValue > database.headers.length) {
      throw new Error(`${functionName} field index is out of range`);
    }
    return fieldValue - 1;
  }

  if (typeof fieldValue === "string") {
    const trimmed = fieldValue.trim();
    if (trimmed.length === 0) {
      throw new Error(`${functionName} field name cannot be empty`);
    }
    const columnIndex = database.headerMap.get(trimmed.toUpperCase());
    if (columnIndex === undefined) {
      throw new Error(`${functionName} could not find field "${trimmed}"`);
    }
    return columnIndex;
  }

  throw new Error(`${functionName} field must be a column label or index`);
};

type CriteriaColumn = {
  databaseColumnIndex: number;
  label: string;
};

type CriteriaCondition = {
  columnIndex: number;
  predicate: (value: FormulaEvaluationResult) => boolean;
};

const buildCriteriaColumns = (
  headers: FormulaEvaluationResult[],
  database: DatabaseTable,
  functionName: string,
): CriteriaColumn[] => {
  return headers.map((header, columnIndex) => {
    const label = normalizeHeaderLabel(header, `${functionName} criteria`, columnIndex);
    const databaseColumnIndex = database.headerMap.get(label.toUpperCase());
    if (databaseColumnIndex === undefined) {
      throw new Error(`${functionName} criteria header "${label}" does not match a database field`);
    }
    return {
      databaseColumnIndex,
      label,
    };
  });
};

const buildCriteriaGroups = (params: {
  readonly rows: FormulaEvaluationResult[][];
  readonly criteriaColumns: CriteriaColumn[];
  readonly helpers: FormulaFunctionHelpers;
  readonly functionName: string;
}): {
  groups: CriteriaCondition[][];
  hasUnconditionalRow: boolean;
} => {
  const { rows, criteriaColumns, helpers, functionName } = params;
  const conditionsByRow = rows.map((row, rowIndex) => {
    return criteriaColumns.reduce<CriteriaCondition[]>((conditions, column, columnIndex) => {
      const cellValue = row[columnIndex];
      if (cellValue === null) {
        return conditions;
      }
      const predicate = helpers.createCriteriaPredicate(
        cellValue,
        helpers.comparePrimitiveEquality,
        `${functionName} criteria for "${column.label}" (row ${rowIndex + 2})`,
      );
      conditions.push({
        columnIndex: column.databaseColumnIndex,
        predicate,
      });
      return conditions;
    }, []);
  });

  const hasUnconditionalRow = conditionsByRow.some((conditions) => conditions.length === 0);
  const groups = conditionsByRow.filter((conditions) => conditions.length > 0);
  return {
    groups,
    hasUnconditionalRow,
  };
};

const createCriteriaFilter = (params: {
  readonly criteriaArg: EvalResult;
  readonly database: DatabaseTable;
  readonly helpers: FormulaFunctionHelpers;
  readonly functionName: string;
}): ((row: FormulaEvaluationResult[]) => boolean) => {
  const { criteriaArg, database, helpers, functionName } = params;
  const criteriaTable = toLookupTable(criteriaArg, `${functionName} criteria`);
  const headerRow = criteriaTable[0];
  if (!headerRow) {
    throw new Error(`${functionName} criteria must include a header row`);
  }

  const criteriaColumns = buildCriteriaColumns(headerRow, database, functionName);
  const dataRows = criteriaTable.slice(1);
  const { groups, hasUnconditionalRow } = buildCriteriaGroups({ rows: dataRows, criteriaColumns, helpers, functionName });

  if (hasUnconditionalRow || groups.length === 0) {
    return () => true;
  }

  return (row) => {
    return groups.some((conditions) =>
      conditions.every((condition) => {
        const value = row[condition.columnIndex] ?? null;
        return condition.predicate(value);
      }),
    );
  };
};

export const filterDatabaseRows = (params: {
  readonly database: DatabaseTable;
  readonly criteriaArg: EvalResult;
  readonly helpers: FormulaFunctionHelpers;
  readonly functionName: string;
}): FormulaEvaluationResult[][] => {
  const { database, criteriaArg, helpers, functionName } = params;
  const predicate = createCriteriaFilter({ criteriaArg, database, helpers, functionName });
  return database.rows.filter((row) => predicate(row));
};

export const collectFieldValues = (
  rows: ReadonlyArray<FormulaEvaluationResult[]>,
  fieldIndex: number,
): FormulaEvaluationResult[] => {
  return rows.map((row) => row[fieldIndex] ?? null);
};

export const collectNumericFieldValues = (rows: ReadonlyArray<FormulaEvaluationResult[]>, fieldIndex: number) => {
  return rows.reduce<number[]>((numbers, row) => {
    const value = row[fieldIndex] ?? null;
    if (typeof value === "number" && !Number.isNaN(value)) {
      numbers.push(value);
    }
    return numbers;
  }, []);
};
