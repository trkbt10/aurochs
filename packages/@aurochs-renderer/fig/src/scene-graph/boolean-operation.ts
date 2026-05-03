/** @file Shared boolean path operation contract for fig render/edit paths. */

import type { KiwiEnumValue } from "@aurochs/fig/types";
import {
  FillRule,
  PathBooleanOperation,
  pathBoolean,
  pathFromPathData,
  pathToPathData,
} from "../../vendor/path-bool/index.js";

export type BooleanOperationType = "UNION" | "SUBTRACT" | "INTERSECT" | "EXCLUDE";

export type BooleanPathInput = {
  readonly d: string;
  readonly windingRule: "nonzero" | "evenodd";
};

export type BooleanEvaluationResult =
  | { readonly ok: true; readonly paths: readonly string[] }
  | { readonly ok: false; readonly error: BooleanEvaluationError };

export type BooleanEvaluationError =
  | { readonly reason: "NO_INPUT_PATHS" }
  | { readonly reason: "PATH_EVALUATION_FAILED"; readonly message: string };

export const BOOLEAN_OPERATION_VALUES: Record<BooleanOperationType, number> = {
  UNION: 0,
  SUBTRACT: 1,
  INTERSECT: 2,
  EXCLUDE: 3,
};

const BOOLEAN_OPERATION_BY_VALUE: Record<number, BooleanOperationType> = {
  0: "UNION",
  1: "SUBTRACT",
  2: "INTERSECT",
  3: "EXCLUDE",
};

/** Create the Kiwi enum payload used by Figma for live boolean operation nodes. */
export function createBooleanOperationEnum(operation: BooleanOperationType): KiwiEnumValue {
  return { value: BOOLEAN_OPERATION_VALUES[operation], name: operation };
}

/** Resolve the canonical boolean operation from Kiwi enum value/name data. */
export function resolveBooleanOperationType(operation: KiwiEnumValue | undefined): BooleanOperationType {
  if (!operation) {
    return "UNION";
  }
  const byValue = BOOLEAN_OPERATION_BY_VALUE[operation.value];
  if (byValue) {
    return byValue;
  }
  return isBooleanOperationName(operation.name) ? operation.name : "UNION";
}

/** Evaluate boolean operation child paths through the single path-bool adapter. */
export function evaluateBooleanPathResult(
  childPaths: readonly BooleanPathInput[],
  operation: BooleanOperationType,
): BooleanEvaluationResult {
  if (childPaths.length === 0) {
    return { ok: false, error: { reason: "NO_INPUT_PATHS" } };
  }
  if (childPaths.length === 1) {
    return { ok: true, paths: [childPaths[0].d] };
  }

  try {
    return { ok: true, paths: evaluateBooleanPathsUnsafe(childPaths, operation) };
  } catch (error) {
    return { ok: false, error: { reason: "PATH_EVALUATION_FAILED", message: errorToMessage(error) } };
  }
}

/** Evaluate boolean operation child paths and throw if evaluation fails. */
export function evaluateBooleanPaths(
  childPaths: readonly BooleanPathInput[],
  operation: BooleanOperationType,
): readonly string[] {
  const result = evaluateBooleanPathResult(childPaths, operation);
  if (!result.ok) {
    throw new Error(`Boolean path evaluation failed: ${result.error.reason}${"message" in result.error ? `: ${result.error.message}` : ""}`);
  }
  return result.paths;
}

function evaluateBooleanPathsUnsafe(
  childPaths: readonly BooleanPathInput[],
  operation: BooleanOperationType,
): readonly string[] {
  // eslint-disable-next-line no-restricted-syntax -- path-bool combines children sequentially and requires carrying the accumulated path
  let currentPath = pathFromPathData(childPaths[0].d);
  // eslint-disable-next-line no-restricted-syntax -- the accumulated path's fill rule changes after the first boolean operation
  let currentFillRule = toFillRuleEnum(childPaths[0].windingRule);
  const boolOp = toPathBoolOp(operation);

  for (let i = 1; i < childPaths.length; i += 1) {
    const nextPath = pathFromPathData(childPaths[i].d);
    const nextFillRule = toFillRuleEnum(childPaths[i].windingRule);
    const results = pathBoolean(currentPath, currentFillRule, nextPath, nextFillRule, boolOp);

    if (results.length === 0) {
      if (boolOp === PathBooleanOperation.Difference) {
        continue;
      }
      return [];
    }

    currentPath = resolveNextPath(results);
    currentFillRule = FillRule.NonZero;
  }

  const finalD = pathToPathData(currentPath);
  return finalD.trim().length === 0 ? [] : [finalD];
}

function resolveNextPath(results: readonly ReturnType<typeof pathFromPathData>[]): ReturnType<typeof pathFromPathData> {
  if (results.length === 1) {
    return results[0];
  }
  return pathFromPathData(results.map((p) => pathToPathData(p)).join(" "));
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isBooleanOperationName(name: string | undefined): name is BooleanOperationType {
  return name === "UNION" || name === "SUBTRACT" || name === "INTERSECT" || name === "EXCLUDE";
}

function toFillRuleEnum(windingRule: "nonzero" | "evenodd"): FillRule {
  return windingRule === "evenodd" ? FillRule.EvenOdd : FillRule.NonZero;
}

function toPathBoolOp(operation: BooleanOperationType): PathBooleanOperation {
  switch (operation) {
    case "UNION": return PathBooleanOperation.Union;
    case "SUBTRACT": return PathBooleanOperation.Difference;
    case "INTERSECT": return PathBooleanOperation.Intersection;
    case "EXCLUDE": return PathBooleanOperation.Exclusion;
  }
}
