/**
 * @file Hyperbolic function implementations (ODF 1.3 §6.20).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const assertSingleArgument = (argsLength: number, functionName: string): void => {
  if (argsLength !== 1) {
    throw new Error(`${functionName} expects exactly one argument`);
  }
};

export const sinhFunction: FormulaFunctionEagerDefinition = {
  name: "SINH",
  category: "engineering",
  description: {
    en: "Returns the hyperbolic sine of a number.",
    ja: "数値の双曲線サインを返します。",
  },
  examples: ["SINH(0.5)"],
  samples: [
    {
      input: "SINH(0)",
      output: 0,
      description: {
        en: "Hyperbolic sine of 0 is 0",
        ja: "0の双曲線サインは0",
      },
    },
    {
      input: "SINH(1)",
      output: 1.1752,
      description: {
        en: "Hyperbolic sine of 1 is approximately 1.1752",
        ja: "1の双曲線サインは約1.1752",
      },
    },
    {
      input: "SINH(-1)",
      output: -1.1752,
      description: {
        en: "Hyperbolic sine of -1 is approximately -1.1752",
        ja: "-1の双曲線サインは約-1.1752",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "SINH");
    const value = helpers.requireNumber(args[0], "SINH value");
    return Math.sinh(value);
  },
};

export const coshFunction: FormulaFunctionEagerDefinition = {
  name: "COSH",
  category: "engineering",
  description: {
    en: "Returns the hyperbolic cosine of a number.",
    ja: "数値の双曲線コサインを返します。",
  },
  examples: ["COSH(0.5)"],
  samples: [
    {
      input: "COSH(0)",
      output: 1,
      description: {
        en: "Hyperbolic cosine of 0 is 1",
        ja: "0の双曲線コサインは1",
      },
    },
    {
      input: "COSH(1)",
      output: 1.5431,
      description: {
        en: "Hyperbolic cosine of 1 is approximately 1.5431",
        ja: "1の双曲線コサインは約1.5431",
      },
    },
    {
      input: "COSH(2)",
      output: 3.7622,
      description: {
        en: "Hyperbolic cosine of 2 is approximately 3.7622",
        ja: "2の双曲線コサインは約3.7622",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "COSH");
    const value = helpers.requireNumber(args[0], "COSH value");
    return Math.cosh(value);
  },
};

export const tanhFunction: FormulaFunctionEagerDefinition = {
  name: "TANH",
  category: "engineering",
  description: {
    en: "Returns the hyperbolic tangent of a number.",
    ja: "数値の双曲線タンジェントを返します。",
  },
  examples: ["TANH(0.5)"],
  samples: [
    {
      input: "TANH(0)",
      output: 0,
      description: {
        en: "Hyperbolic tangent of 0 is 0",
        ja: "0の双曲線タンジェントは0",
      },
    },
    {
      input: "TANH(1)",
      output: 0.7616,
      description: {
        en: "Hyperbolic tangent of 1 is approximately 0.7616",
        ja: "1の双曲線タンジェントは約0.7616",
      },
    },
    {
      input: "TANH(2)",
      output: 0.9640,
      description: {
        en: "Hyperbolic tangent of 2 is approximately 0.9640",
        ja: "2の双曲線タンジェントは約0.9640",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "TANH");
    const value = helpers.requireNumber(args[0], "TANH value");
    return Math.tanh(value);
  },
};
