/**
 * @file DMAX/DMIN function implementations (ODF 1.3 §6.7.7, §6.7.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

const evaluateExtremum = (params: {
  readonly formulaArgs: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[0];
  readonly helpers: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[1];
  readonly functionName: string;
  readonly reducer: (values: number[]) => number;
  readonly emptyErrorMessage: string;
}) => {
  const { formulaArgs, helpers, functionName, reducer, emptyErrorMessage } = params;
  if (formulaArgs.length !== 3) {
    throw new Error(`${functionName} expects exactly three arguments`);
  }

  const [databaseArg, fieldArg, criteriaArg] = formulaArgs;
  const database = parseDatabaseArgument(databaseArg, functionName);
  const fieldValue = helpers.coerceScalar(fieldArg, `${functionName} field`);
  const fieldIndex = resolveFieldIndex(fieldValue, database, functionName);
  const matchingRows = filterDatabaseRows({ database, criteriaArg, helpers, functionName });
  const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);

  if (numericValues.length === 0) {
    throw new Error(emptyErrorMessage);
  }

  return reducer(numericValues);
};

export const dMaxFunction: FormulaFunctionEagerDefinition = {
  name: "DMAX",
  category: "database",
  description: {
    en: "Returns the largest numeric entry in a database column that satisfies the criteria.",
    ja: "条件を満たすデータベース列で最大の数値を返します。",
  },
  examples: ['DMAX(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DMAX(A1:B4, "Age", D1:E2)',
      output: "Descriptive",
      description: {
        en: "Find maximum age from database A1:B4 where criteria in D1:E2 match",
        ja: "データベースA1:B4から条件D1:E2に一致する年齢の最大値を検索",
      },
    },
    {
      input: 'DMAX(A1:B10, 2, D1:D2)',
      output: "Descriptive",
      description: {
        en: "Find maximum value in column 2 matching criteria",
        ja: "条件に一致する2列目の最大値を検索",
      },
    },
    {
      input: 'DMAX(A1:C100, "Sales", F1:G3)',
      output: "Descriptive",
      description: {
        en: "Find maximum sales value matching multiple criteria",
        ja: "複数条件に一致する売上の最大値を検索",
      },
    },
  ],
  evaluate: (args, helpers) => {
    return evaluateExtremum({
      formulaArgs: args,
      helpers,
      functionName: "DMAX",
      reducer: (values) => Math.max(...values),
      emptyErrorMessage: "DMAX found no numeric values matching criteria",
    });
  },
};

export const dMinFunction: FormulaFunctionEagerDefinition = {
  name: "DMIN",
  category: "database",
  description: {
    en: "Returns the smallest numeric entry in a database column that satisfies the criteria.",
    ja: "条件を満たすデータベース列で最小の数値を返します。",
  },
  examples: ['DMIN(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DMIN(A1:B4, "Age", D1:E2)',
      output: "Descriptive",
      description: {
        en: "Find minimum age from database A1:B4 where criteria in D1:E2 match",
        ja: "データベースA1:B4から条件D1:E2に一致する年齢の最小値を検索",
      },
    },
    {
      input: 'DMIN(A1:B10, 2, D1:D2)',
      output: "Descriptive",
      description: {
        en: "Find minimum value in column 2 matching criteria",
        ja: "条件に一致する2列目の最小値を検索",
      },
    },
    {
      input: 'DMIN(A1:C100, "Sales", F1:G3)',
      output: "Descriptive",
      description: {
        en: "Find minimum sales value matching multiple criteria",
        ja: "複数条件に一致する売上の最小値を検索",
      },
    },
  ],
  evaluate: (args, helpers) => {
    return evaluateExtremum({
      formulaArgs: args,
      helpers,
      functionName: "DMIN",
      reducer: (values) => Math.min(...values),
      emptyErrorMessage: "DMIN found no numeric values matching criteria",
    });
  },
};
