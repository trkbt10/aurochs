/**
 * @file DCOUNT function implementation (ODF 1.3 §6.7.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

export const dCountFunction: FormulaFunctionEagerDefinition = {
  name: "DCOUNT",
  category: "database",
  description: {
    en: "Counts numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値の件数を返します。",
  },
  examples: ['DCOUNT(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DCOUNT({{"Name", "Age"}; {"Alice", 25}; {"Bob", 30}; {"Carol", 35}}, "Age", {{"Age"}; {">25"}})',
      output: 2,
      description: {
        en: "Count ages greater than 25 (30 and 35, count is 2)",
        ja: "25より大きい年齢をカウント（30と35、カウントは2）",
      },
    },
    {
      input: 'DCOUNT({{"Product", "Price"}; {"A", 100}; {"B", 200}; {"C", 150}}, "Price", {{"Price"}; {">=150"}})',
      output: 2,
      description: {
        en: "Count prices >= 150 (150 and 200, count is 2)",
        ja: "150以上の価格をカウント（150と200、カウントは2）",
      },
    },
    {
      input: 'DCOUNT({{"Item", "Qty"}; {"X", 10}; {"Y", 20}; {"Z", 30}}, "Qty", {{"Qty"}; {"<50"}})',
      output: 3,
      description: {
        en: "Count all quantities less than 50 (all 3 match)",
        ja: "50未満の数量をすべてカウント（3つすべて一致）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("DCOUNT expects exactly three arguments");
    }

    const [databaseArg, fieldArg, criteriaArg] = args;
    const database = parseDatabaseArgument(databaseArg, "DCOUNT");
    const fieldValue = helpers.coerceScalar(fieldArg, "DCOUNT field");
    const fieldIndex = resolveFieldIndex(fieldValue, database, "DCOUNT");
    const matchingRows = filterDatabaseRows({ database, criteriaArg, helpers, functionName: "DCOUNT" });
    const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);
    return numericValues.length;
  },
};
