/**
 * @file Trigonometric function implementations (ODF 1.3 §6.20).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const assertSingleArgument = (argsLength: number, functionName: string): void => {
  if (argsLength !== 1) {
    throw new Error(`${functionName} expects exactly one argument`);
  }
};

export const sinFunction: FormulaFunctionEagerDefinition = {
  name: "SIN",
  category: "engineering",
  description: {
    en: "Returns the sine of an angle specified in radians.",
    ja: "ラジアンで指定した角度のサインを返します。",
  },
  examples: ["SIN(PI()/2)"],
  samples: [
    {
      input: "SIN(0)",
      output: 0,
      description: {
        en: "Sine of 0 radians is 0",
        ja: "0ラジアンのサインは0",
      },
    },
    {
      input: "SIN(1.5708)",
      output: 1,
      description: {
        en: "Sine of π/2 (approximately 1.5708) is 1",
        ja: "π/2（約1.5708）のサインは1",
      },
    },
    {
      input: "SIN(3.14159)",
      output: 0,
      description: {
        en: "Sine of π (approximately 3.14159) is approximately 0",
        ja: "π（約3.14159）のサインは約0",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "SIN");
    const angle = helpers.requireNumber(args[0], "SIN angle");
    return Math.sin(angle);
  },
};

export const cosFunction: FormulaFunctionEagerDefinition = {
  name: "COS",
  category: "engineering",
  description: {
    en: "Returns the cosine of an angle specified in radians.",
    ja: "ラジアンで指定した角度のコサインを返します。",
  },
  examples: ["COS(0)"],
  samples: [
    {
      input: "COS(0)",
      output: 1,
      description: {
        en: "Cosine of 0 radians is 1",
        ja: "0ラジアンのコサインは1",
      },
    },
    {
      input: "COS(1.5708)",
      output: 0,
      description: {
        en: "Cosine of π/2 (approximately 1.5708) is 0",
        ja: "π/2（約1.5708）のコサインは0",
      },
    },
    {
      input: "COS(3.14159)",
      output: -1,
      description: {
        en: "Cosine of π (approximately 3.14159) is -1",
        ja: "π（約3.14159）のコサインは-1",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "COS");
    const angle = helpers.requireNumber(args[0], "COS angle");
    return Math.cos(angle);
  },
};

export const tanFunction: FormulaFunctionEagerDefinition = {
  name: "TAN",
  category: "engineering",
  description: {
    en: "Returns the tangent of an angle specified in radians.",
    ja: "ラジアンで指定した角度のタンジェントを返します。",
  },
  examples: ["TAN(PI()/4)"],
  samples: [
    {
      input: "TAN(0)",
      output: 0,
      description: {
        en: "Tangent of 0 radians is 0",
        ja: "0ラジアンのタンジェントは0",
      },
    },
    {
      input: "TAN(0.7854)",
      output: 1,
      description: {
        en: "Tangent of π/4 (approximately 0.7854) is 1",
        ja: "π/4（約0.7854）のタンジェントは1",
      },
    },
    {
      input: "TAN(1)",
      output: 1.5574,
      description: {
        en: "Tangent of 1 radian is approximately 1.5574",
        ja: "1ラジアンのタンジェントは約1.5574",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "TAN");
    const angle = helpers.requireNumber(args[0], "TAN angle");
    return Math.tan(angle);
  },
};

export const asinFunction: FormulaFunctionEagerDefinition = {
  name: "ASIN",
  category: "engineering",
  description: {
    en: "Returns the arcsine of a value, in radians.",
    ja: "値の逆サインをラジアンで返します。",
  },
  examples: ["ASIN(1)"],
  samples: [
    {
      input: "ASIN(0)",
      output: 0,
      description: {
        en: "Arcsine of 0 is 0 radians",
        ja: "0の逆サインは0ラジアン",
      },
    },
    {
      input: "ASIN(0.5)",
      output: 0.5236,
      description: {
        en: "Arcsine of 0.5 is π/6 (approximately 0.5236)",
        ja: "0.5の逆サインはπ/6（約0.5236）",
      },
    },
    {
      input: "ASIN(1)",
      output: 1.5708,
      description: {
        en: "Arcsine of 1 is π/2 (approximately 1.5708)",
        ja: "1の逆サインはπ/2（約1.5708）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "ASIN");
    const value = helpers.requireNumber(args[0], "ASIN value");
    if (value < -1 || value > 1) {
      throw new Error("ASIN value must be between -1 and 1");
    }
    return Math.asin(value);
  },
};

export const acosFunction: FormulaFunctionEagerDefinition = {
  name: "ACOS",
  category: "engineering",
  description: {
    en: "Returns the arccosine of a value, in radians.",
    ja: "値の逆コサインをラジアンで返します。",
  },
  examples: ["ACOS(0)"],
  samples: [
    {
      input: "ACOS(1)",
      output: 0,
      description: {
        en: "Arccosine of 1 is 0 radians",
        ja: "1の逆コサインは0ラジアン",
      },
    },
    {
      input: "ACOS(0.5)",
      output: 1.0472,
      description: {
        en: "Arccosine of 0.5 is π/3 (approximately 1.0472)",
        ja: "0.5の逆コサインはπ/3（約1.0472）",
      },
    },
    {
      input: "ACOS(0)",
      output: 1.5708,
      description: {
        en: "Arccosine of 0 is π/2 (approximately 1.5708)",
        ja: "0の逆コサインはπ/2（約1.5708）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "ACOS");
    const value = helpers.requireNumber(args[0], "ACOS value");
    if (value < -1 || value > 1) {
      throw new Error("ACOS value must be between -1 and 1");
    }
    return Math.acos(value);
  },
};

export const atanFunction: FormulaFunctionEagerDefinition = {
  name: "ATAN",
  category: "engineering",
  description: {
    en: "Returns the arctangent of a value, in radians.",
    ja: "値の逆タンジェントをラジアンで返します。",
  },
  examples: ["ATAN(1)"],
  samples: [
    {
      input: "ATAN(0)",
      output: 0,
      description: {
        en: "Arctangent of 0 is 0 radians",
        ja: "0の逆タンジェントは0ラジアン",
      },
    },
    {
      input: "ATAN(1)",
      output: 0.7854,
      description: {
        en: "Arctangent of 1 is π/4 (approximately 0.7854)",
        ja: "1の逆タンジェントはπ/4（約0.7854）",
      },
    },
    {
      input: "ATAN(-1)",
      output: -0.7854,
      description: {
        en: "Arctangent of -1 is -π/4 (approximately -0.7854)",
        ja: "-1の逆タンジェントは-π/4（約-0.7854）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "ATAN");
    const value = helpers.requireNumber(args[0], "ATAN value");
    return Math.atan(value);
  },
};
