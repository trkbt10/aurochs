/**
 * @file DSUM/DPRODUCT function implementations (ODF 1.3 §6.7.2, §6.7.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

const prepareNumericValues = (
  args: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[0],
  helpers: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[1],
  functionName: string,
) => {
  if (args.length !== 3) {
    throw new Error(`${functionName} expects exactly three arguments`);
  }

  const [databaseArg, fieldArg, criteriaArg] = args;
  const database = parseDatabaseArgument(databaseArg, functionName);
  const fieldValue = helpers.coerceScalar(fieldArg, `${functionName} field`);
  const fieldIndex = resolveFieldIndex(fieldValue, database, functionName);
  const matchingRows = filterDatabaseRows(database, criteriaArg, helpers, functionName);
  return collectNumericFieldValues(matchingRows, fieldIndex);
};

export const dSumFunction: FormulaFunctionEagerDefinition = {
  name: "DSUM",
  category: "database",
  description: {
    en: "Sums numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値を合計します。",
  },
  examples: ['DSUM(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DSUM({{"Name", "Amount"}; {"Alice", 100}; {"Bob", 200}; {"Carol", 150}}, "Amount", {{"Amount"}; {">100"}})',
      output: 350,
      description: {
        en: "Sum amounts where Amount > 100 (200 + 150 = 350)",
        ja: "金額が100より大きい合計（200 + 150 = 350）",
      },
    },
    {
      input: 'DSUM({{"Product", "Sales"}; {"A", 50}; {"B", 100}; {"C", 75}}, "Sales", {{"Sales"}; {">=50"}})',
      output: 225,
      description: {
        en: "Sum all sales >= 50 (50 + 100 + 75 = 225)",
        ja: "50以上の売上の合計（50 + 100 + 75 = 225）",
      },
    },
    {
      input: 'DSUM({{"Item", "Price"}; {"X", 10}; {"Y", 20}; {"Z", 30}}, "Price", {{"Price"}; {"<30"}})',
      output: 30,
      description: {
        en: "Sum prices where Price < 30 (10 + 20 = 30)",
        ja: "価格が30未満の合計（10 + 20 = 30）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = prepareNumericValues(args, helpers, "DSUM");
    return values.reduce((total, value) => total + value, 0);
  },
};

export const dProductFunction: FormulaFunctionEagerDefinition = {
  name: "DPRODUCT",
  category: "database",
  description: {
    en: "Multiplies numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値を掛け合わせます。",
  },
  examples: ['DPRODUCT(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DPRODUCT({{"Name", "Factor"}; {"Alice", 2}; {"Bob", 3}; {"Carol", 4}}, "Factor", {{"Factor"}; {">2"}})',
      output: 12,
      description: {
        en: "Product of factors where Factor > 2 (3 * 4 = 12)",
        ja: "因数が2より大きい積（3 * 4 = 12）",
      },
    },
    {
      input: 'DPRODUCT({{"Product", "Multiplier"}; {"A", 2}; {"B", 5}; {"C", 10}}, "Multiplier", {{"Multiplier"}; {"<=5"}})',
      output: 10,
      description: {
        en: "Product of multipliers <= 5 (2 * 5 = 10)",
        ja: "乗数が5以下の積（2 * 5 = 10）",
      },
    },
    {
      input: 'DPRODUCT({{"Item", "Value"}; {"X", 1}; {"Y", 2}; {"Z", 3}}, "Value", {{"Value"}; {">=1"}})',
      output: 6,
      description: {
        en: "Product of all values >= 1 (1 * 2 * 3 = 6)",
        ja: "1以上のすべての値の積（1 * 2 * 3 = 6）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    const values = prepareNumericValues(args, helpers, "DPRODUCT");
    return values.reduce((product, value) => product * value, 1);
  },
};
