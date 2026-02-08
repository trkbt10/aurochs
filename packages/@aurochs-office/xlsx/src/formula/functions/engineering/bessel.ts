/**
 * @file Bessel function implementations (ODF 1.3 §6.19).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

const BESSEL_MAX_ITERATIONS = 500;
const BESSEL_TOLERANCE = 1e-12;

const computeBesselSeries = (order: number, x: number, alternating: boolean): number => {
  const halfX = x / 2;
  const state = { term: 1, sum: 0 };
  if (order > 0) {
    for (let k = 1; k <= order; k += 1) {
      state.term *= halfX / k;
    }
  }
  state.sum = state.term;
  for (let m = 0; m < BESSEL_MAX_ITERATIONS; m += 1) {
    const denominator = (m + 1) * (m + 1 + order);
    if (denominator === 0) {
      throw new Error("Bessel series encountered zero denominator");
    }
    const ratioBase = (halfX * halfX) / denominator;
    const ratio = alternating ? -ratioBase : ratioBase;
    state.term *= ratio;
    state.sum += state.term;
    if (!Number.isFinite(state.term) || !Number.isFinite(state.sum)) {
      throw new Error("Bessel series failed to converge");
    }
    const magnitude = Math.abs(state.sum);
    const tolerance = magnitude > 1 ? BESSEL_TOLERANCE * magnitude : BESSEL_TOLERANCE;
    if (Math.abs(state.term) < tolerance) {
      break;
    }
  }
  return state.sum;
};

export const besseliFunction: FormulaFunctionEagerDefinition = {
  name: "BESSELI",
  category: "engineering",
  description: {
    en: "Returns the modified Bessel function of the first kind.",
    ja: "第1種変形ベッセル関数を返します。",
  },
  examples: ["BESSELI(1, 0)", "BESSELI(2, 1.5)"],
  samples: [
    {
      input: "BESSELI(0, 0)",
      output: 1,
      description: {
        en: "Modified Bessel I₀(0) equals 1",
        ja: "変形ベッセルI₀(0)は1",
      },
    },
    {
      input: "BESSELI(1, 0)",
      output: 1.2661,
      description: {
        en: "Modified Bessel I₀(1) is approximately 1.2661",
        ja: "変形ベッセルI₀(1)は約1.2661",
      },
    },
    {
      input: "BESSELI(1, 1)",
      output: 0.5652,
      description: {
        en: "Modified Bessel I₁(1) is approximately 0.5652",
        ja: "変形ベッセルI₁(1)は約0.5652",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("BESSELI expects exactly two arguments");
    }
    const x = helpers.requireNumber(args[0], "BESSELI value");
    const orderCandidate = helpers.requireNumber(args[1], "BESSELI order");
    const order = helpers.requireInteger(orderCandidate, "BESSELI order must be an integer");
    if (order < 0) {
      throw new Error("BESSELI order must be non-negative");
    }
    return computeBesselSeries(order, x, false);
  },
};

export const besseljFunction: FormulaFunctionEagerDefinition = {
  name: "BESSELJ",
  category: "engineering",
  description: {
    en: "Returns the Bessel function of the first kind.",
    ja: "第1種ベッセル関数を返します。",
  },
  examples: ["BESSELJ(0, 1)", "BESSELJ(1, 2.5)"],
  samples: [
    {
      input: "BESSELJ(0, 0)",
      output: 1,
      description: {
        en: "Bessel J₀(0) equals 1",
        ja: "ベッセルJ₀(0)は1",
      },
    },
    {
      input: "BESSELJ(1, 0)",
      output: 0.7652,
      description: {
        en: "Bessel J₀(1) is approximately 0.7652",
        ja: "ベッセルJ₀(1)は約0.7652",
      },
    },
    {
      input: "BESSELJ(1, 1)",
      output: 0.4401,
      description: {
        en: "Bessel J₁(1) is approximately 0.4401",
        ja: "ベッセルJ₁(1)は約0.4401",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("BESSELJ expects exactly two arguments");
    }
    const x = helpers.requireNumber(args[0], "BESSELJ value");
    const orderCandidate = helpers.requireNumber(args[1], "BESSELJ order");
    const order = helpers.requireInteger(orderCandidate, "BESSELJ order must be an integer");
    if (order < 0) {
      throw new Error("BESSELJ order must be non-negative");
    }
    return computeBesselSeries(order, x, true);
  },
};
