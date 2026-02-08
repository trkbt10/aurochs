/**
 * @file Utility to detect array evaluation results.
 */

import type { EvalResult } from "./types";

export const isArrayResult = (value: EvalResult): value is EvalResult[] => Array.isArray(value);
