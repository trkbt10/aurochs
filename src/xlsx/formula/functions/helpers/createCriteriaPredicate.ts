/**
 * @file Builds COUNT-style criteria predicates (ODF 1.3 §6.18).
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult } from "./types";

const COMPARATORS = ["<>", ">=", "<=", ">", "<", "="] as const;

type ComparatorSymbol = (typeof COMPARATORS)[number];

const NUMERIC_CRITERION_PATTERN = /^-?\d+(?:\.\d+)?$/u;

const parseNumericCriterion = (text: string, description: string): number => {
  const normalized = text.trim();
  if (!NUMERIC_CRITERION_PATTERN.test(normalized)) {
    throw new Error(`${description} expects numeric operand`);
  }
  return Number.parseFloat(normalized);
};

const parseCriterionOperand = (text: string): string | number | boolean => {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return "";
  }
  if (NUMERIC_CRITERION_PATTERN.test(normalized)) {
    return Number.parseFloat(normalized);
  }
  const lowerCase = normalized.toLowerCase();
  if (lowerCase === "true") {
    return true;
  }
  if (lowerCase === "false") {
    return false;
  }
  return normalized;
};

const compareNumbers = (value: number, operand: number, comparator: ComparatorSymbol): boolean => {
  switch (comparator) {
    case ">":
      return value > operand;
    case "<":
      return value < operand;
    case ">=":
      return value >= operand;
    case "<=":
      return value <= operand;
    case "=":
      return value === operand;
    case "<>":
      return value !== operand;
    default:
      throw new Error(`Unsupported numeric comparator "${comparator}"`);
  }
};

export const createCriteriaPredicate = (
  criteria: EvalResult,
  comparePrimitiveEquality: (left: FormulaEvaluationResult, right: FormulaEvaluationResult) => boolean,
  description: string,
): ((value: FormulaEvaluationResult) => boolean) => {
  if (criteria === null) {
    return (value) => value === null;
  }

  if (criteria === "") {
    return (value) => comparePrimitiveEquality(value, "");
  }

  if (typeof criteria === "number" || typeof criteria === "boolean") {
    return (value) => comparePrimitiveEquality(value, criteria);
  }

  if (typeof criteria !== "string") {
    throw new Error(`${description} must be string, number, boolean, or null`);
  }

  const trimmed = criteria.trim();
  const comparator = COMPARATORS.find((symbol) => trimmed.startsWith(symbol)) ?? null;

  if (!comparator) {
    const operand = parseCriterionOperand(trimmed);
    return (value) => comparePrimitiveEquality(value, operand);
  }

  const operandText = trimmed.slice(comparator.length);
  if (operandText.length === 0) {
    throw new Error(`${description} comparator requires right-hand operand`);
  }

  if (comparator === ">" || comparator === "<" || comparator === ">=" || comparator === "<=") {
    const operandNumber = parseNumericCriterion(operandText, description);
    return (value) => typeof value === "number" && compareNumbers(value, operandNumber, comparator);
  }

  const operand = parseCriterionOperand(operandText);
  if (typeof operand === "number") {
    return (value) => typeof value === "number" && compareNumbers(value, operand, comparator);
  }

  if (comparator === "=") {
    return (value) => comparePrimitiveEquality(value, operand);
  }

  if (comparator === "<>") {
    return (value) => !comparePrimitiveEquality(value, operand);
  }

  throw new Error(`Unsupported comparator "${comparator}"`);
};
