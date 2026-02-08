/**
 * @file DAVERAGE function implementation (ODF 1.3 §6.7.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

export const dAverageFunction: FormulaFunctionEagerDefinition = {
  name: "DAVERAGE",
  category: "database",
  description: {
    en: "Returns the mean of numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値の平均を返します。",
  },
  examples: ['DAVERAGE(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DAVERAGE({{"Name", "Age"}; {"Alice", 25}; {"Bob", 30}; {"Carol", 35}}, "Age", {{"Age"}; {">25"}})',
      output: 32.5,
      description: {
        en: "Average age where Age > 25 (30 and 35, average is 32.5)",
        ja: "年齢が25より大きい平均（30と35、平均は32.5）",
      },
    },
    {
      input: 'DAVERAGE({{"Product", "Price"}; {"A", 100}; {"B", 200}; {"C", 150}}, "Price", {{"Product"}; {"A"}})',
      output: 100,
      description: {
        en: "Average price where Product is A",
        ja: "製品がAの価格の平均",
      },
    },
    {
      input: 'DAVERAGE({{"Item", "Qty"}; {"X", 10}; {"Y", 20}; {"Z", 30}}, "Qty", {{"Qty"}; {">=20"}})',
      output: 25,
      description: {
        en: "Average quantity where Qty >= 20 (20 and 30, average is 25)",
        ja: "数量が20以上の平均（20と30、平均は25）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("DAVERAGE expects exactly three arguments");
    }

    const [databaseArg, fieldArg, criteriaArg] = args;
    const database = parseDatabaseArgument(databaseArg, "DAVERAGE");
    const fieldValue = helpers.coerceScalar(fieldArg, "DAVERAGE field");
    const fieldIndex = resolveFieldIndex(fieldValue, database, "DAVERAGE");
    const matchingRows = filterDatabaseRows({ database, criteriaArg, helpers, functionName: "DAVERAGE" });
    const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);

    if (numericValues.length === 0) {
      throw new Error("DAVERAGE found no numeric values matching criteria");
    }

    const total = numericValues.reduce((sum, value) => sum + value, 0);
    return total / numericValues.length;
  },
};
