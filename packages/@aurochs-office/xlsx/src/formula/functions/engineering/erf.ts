/**
 * @file Error function implementations (ODF 1.3 §6.19).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const TWO_OVER_SQRT_PI = 2 / Math.sqrt(Math.PI);
const ERF_SERIES_TOLERANCE = 1e-15;
const ERF_SERIES_MAX_ITERATIONS = 80;
const ERFC_TOLERANCE = 1e-15;
const ERFC_MAX_ITERATIONS = 60;

const computeErfSeries = (x: number): number => {
  if (x === 0) {
    return 0;
  }
  const state = { term: x, sum: x };
  for (let n = 1; n < ERF_SERIES_MAX_ITERATIONS; n += 1) {
    state.term *= (-x * x) / n;
    const contribution = state.term / (2 * n + 1);
    state.sum += contribution;
    if (Math.abs(contribution) < ERF_SERIES_TOLERANCE) {
      break;
    }
  }
  return TWO_OVER_SQRT_PI * state.sum;
};

const computeErfcComplement = (x: number): number => {
  const inverseSquare = 1 / (x * x);
  const state = { term: 1, sum: 1 };
  for (let n = 1; n < ERFC_MAX_ITERATIONS; n += 1) {
    state.term *= -((2 * n - 1) * inverseSquare) / 2;
    state.sum += state.term;
    if (Math.abs(state.term) < ERFC_TOLERANCE) {
      break;
    }
  }
  const prefactor = Math.exp(-x * x) / (x * Math.sqrt(Math.PI));
  return prefactor * state.sum;
};

const computeErf = (x: number): number => {
  if (!Number.isFinite(x)) {
    return x < 0 ? -1 : 1;
  }
  if (x === 0) {
    return 0;
  }
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  if (absX <= 2) {
    return sign * computeErfSeries(absX);
  }
  const complement = computeErfcComplement(absX);
  return sign * (1 - complement);
};

const computeErfc = (x: number): number => {
  if (!Number.isFinite(x)) {
    return x < 0 ? 2 : 0;
  }
  if (x <= 0) {
    return 1 - computeErf(x);
  }
  if (x <= 2) {
    return 1 - computeErf(x);
  }
  return computeErfcComplement(x);
};

export const erfFunction: FormulaFunctionEagerDefinition = {
  name: "ERF",
  category: "engineering",
  description: {
    en: "Returns the integral of the Gaussian distribution.",
    ja: "ガウス分布の積分値（誤差関数）を返します。",
  },
  examples: ["ERF(1)", "ERF(0, 1)"],
  samples: [
    {
      input: "ERF(0)",
      output: 0,
      description: {
        en: "Error function of 0 is 0",
        ja: "0の誤差関数は0",
      },
    },
    {
      input: "ERF(1)",
      output: 0.8427,
      description: {
        en: "Error function of 1 is approximately 0.8427",
        ja: "1の誤差関数は約0.8427",
      },
    },
    {
      input: "ERF(0, 1)",
      output: 0.8427,
      description: {
        en: "Error function between 0 and 1",
        ja: "0から1までの誤差関数",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length === 0 || args.length > 2) {
      throw new Error("ERF expects one or two arguments");
    }
    const lower = helpers.requireNumber(args[0], "ERF lower limit");
    if (args.length === 1) {
      return computeErf(lower);
    }
    const upper = helpers.requireNumber(args[1], "ERF upper limit");
    return computeErf(upper) - computeErf(lower);
  },
};

export const erfcFunction: FormulaFunctionEagerDefinition = {
  name: "ERFC",
  category: "engineering",
  description: {
    en: "Returns the complementary error function.",
    ja: "相補誤差関数を返します。",
  },
  examples: ["ERFC(1)"],
  samples: [
    {
      input: "ERFC(0)",
      output: 1,
      description: {
        en: "Complementary error function of 0 is 1",
        ja: "0の相補誤差関数は1",
      },
    },
    {
      input: "ERFC(1)",
      output: 0.1573,
      description: {
        en: "Complementary error function of 1 is approximately 0.1573",
        ja: "1の相補誤差関数は約0.1573",
      },
    },
    {
      input: "ERFC(2)",
      output: 0.0047,
      description: {
        en: "Complementary error function of 2 is approximately 0.0047",
        ja: "2の相補誤差関数は約0.0047",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("ERFC expects exactly one argument");
    }
    const value = helpers.requireNumber(args[0], "ERFC value");
    return computeErfc(value);
  },
};
