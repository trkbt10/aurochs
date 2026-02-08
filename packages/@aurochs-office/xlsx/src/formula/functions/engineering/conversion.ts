/**
 * @file Angle conversion function implementations (ODF 1.3 §6.20).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const assertSingleArgument = (argsLength: number, functionName: string): void => {
  if (argsLength !== 1) {
    throw new Error(`${functionName} expects exactly one argument`);
  }
};

const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 180 / Math.PI;

export const degreesFunction: FormulaFunctionEagerDefinition = {
  name: "DEGREES",
  category: "engineering",
  description: {
    en: "Converts radians to degrees.",
    ja: "ラジアン値を度に変換します。",
  },
  examples: ["DEGREES(PI())"],
  samples: [
    {
      input: "DEGREES(0)",
      output: 0,
      description: {
        en: "0 radians equals 0 degrees",
        ja: "0ラジアンは0度",
      },
    },
    {
      input: "DEGREES(1.5708)",
      output: 90,
      description: {
        en: "π/2 radians (approximately 1.5708) equals 90 degrees",
        ja: "π/2ラジアン（約1.5708）は90度",
      },
    },
    {
      input: "DEGREES(3.14159)",
      output: 180,
      description: {
        en: "π radians (approximately 3.14159) equals 180 degrees",
        ja: "πラジアン（約3.14159）は180度",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "DEGREES");
    const radians = helpers.requireNumber(args[0], "DEGREES radians");
    return radians * DEGREES_PER_RADIAN;
  },
};

export const radiansFunction: FormulaFunctionEagerDefinition = {
  name: "RADIANS",
  category: "engineering",
  description: {
    en: "Converts degrees to radians.",
    ja: "度をラジアン値に変換します。",
  },
  examples: ["RADIANS(180)"],
  samples: [
    {
      input: "RADIANS(0)",
      output: 0,
      description: {
        en: "0 degrees equals 0 radians",
        ja: "0度は0ラジアン",
      },
    },
    {
      input: "RADIANS(90)",
      output: 1.5708,
      description: {
        en: "90 degrees equals π/2 radians (approximately 1.5708)",
        ja: "90度はπ/2ラジアン（約1.5708）",
      },
    },
    {
      input: "RADIANS(180)",
      output: 3.14159,
      description: {
        en: "180 degrees equals π radians (approximately 3.14159)",
        ja: "180度はπラジアン（約3.14159）",
      },
    },
  ],
  evaluate: (args, helpers) => {
    assertSingleArgument(args.length, "RADIANS");
    const degrees = helpers.requireNumber(args[0], "RADIANS degrees");
    return degrees * RADIANS_PER_DEGREE;
  },
};
