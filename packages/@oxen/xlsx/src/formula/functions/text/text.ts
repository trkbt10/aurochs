/**
 * @file TEXT function implementation (Excel compatibility).
 */

import { formatNumberByCode, formatTextByCode } from "../../../domain/style/format-value";
import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const textFunction: FormulaFunctionLazyDefinition = {
  name: "TEXT",
  category: "text",
  description: {
    en: "Formats a value as text according to a specified number format code.",
    ja: "指定した数値書式コードに従って値を文字列に変換します。",
  },
  examples: ['TEXT(12.34, "0.00")', 'TEXT(314159, "#,##0.00")', 'TEXT(A1, "000.00")'],
  samples: [
    {
      input: 'TEXT(12.3, "000.00")',
      output: "012.30",
    },
    {
      input: 'TEXT(314159, "#,##0.00")',
      output: "314,159.00",
    },
  ],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 2) {
      throw new Error("TEXT expects two arguments");
    }
    const valueResult = context.helpers.coerceScalar(context.evaluate(nodes[0]!), "TEXT value");
    const formatText = context.helpers.coerceText(context.evaluate(nodes[1]!), "TEXT format_text");
    if (typeof valueResult === "number") {
      return formatNumberByCode(valueResult, formatText, { dateSystem: context.dateSystem });
    }
    return formatTextByCode(context.helpers.valueToText(valueResult), formatText);
  },
};
