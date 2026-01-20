/**
 * @file Aggregates reusable helpers for formula function evaluators.
 */

import type { FormulaEvaluationResult } from "../../types";
import type { EvalResult, FormulaFunctionHelpers } from "./types";
import { isArrayResult as isArrayResultInternal } from "./isArrayResult";
import { flattenResult as flattenResultInternal } from "./flattenResult";
import { flattenArguments as flattenArgumentsInternal } from "./flattenArguments";
import { coerceScalar as coerceScalarInternal } from "./coerceScalar";
import { requireNumber as requireNumberInternal } from "./requireNumber";
import { requireBoolean as requireBooleanInternal } from "./requireBoolean";
import { comparePrimitiveEquality as comparePrimitiveEqualityInternal } from "./comparePrimitiveEquality";
import { createCriteriaPredicate as createCriteriaPredicateInternal } from "./createCriteriaPredicate";
import { summarizeNumbers as summarizeNumbersInternal } from "./summarizeNumbers";
import { collectNumericArguments as collectNumericArgumentsInternal } from "./collectNumericArguments";
import {
  requireInteger as requireIntegerInternal,
  computePowerOfTen as computePowerOfTenInternal,
  normalizeZero as normalizeZeroInternal,
} from "./numeric";
import { coerceText as coerceTextInternal, valueToText as valueToTextInternal } from "./text";
import { coerceLogical as coerceLogicalInternal } from "./coerceLogical";
import {
  FINANCIAL_EPSILON,
  FINANCIAL_MAX_ITERATIONS,
  validateInterestRate as validateInterestRateInternal,
  pow1p as pow1pInternal,
  computeNPV as computeNPVInternal,
  discountSeries as discountSeriesInternal,
  calculatePayment as calculatePaymentInternal,
  calculateInterestPayment as calculateInterestPaymentInternal,
  computeXNPV as computeXNPVInternal,
} from "./finance";
import {
  createFormulaError as createFormulaErrorInternal,
  getErrorCodeFromError,
  getErrorTypeNumber as getErrorTypeNumberInternal,
  isNAError as isNAErrorInternal,
  isFormulaError as isFormulaErrorInternal,
  type FormulaErrorCode,
} from "./errors";

export type { EvalResult, FormulaFunctionHelpers } from "./types";

export const isArrayResult = (value: EvalResult): value is EvalResult[] => {
  return isArrayResultInternal(value);
};

export const flattenResult = (result: EvalResult): FormulaEvaluationResult[] => {
  return flattenResultInternal(result);
};

export const flattenArguments = (args: EvalResult[]): FormulaEvaluationResult[] => {
  return flattenArgumentsInternal(args);
};

export const coerceScalar = (result: EvalResult, description: string): FormulaEvaluationResult => {
  return coerceScalarInternal(result, description);
};

export const requireNumber = (result: EvalResult, description: string): number => {
  return requireNumberInternal(result, description);
};

export const requireBoolean = (result: EvalResult, description: string): boolean => {
  return requireBooleanInternal(result, description);
};

export const comparePrimitiveEquality = (left: FormulaEvaluationResult, right: FormulaEvaluationResult): boolean => {
  return comparePrimitiveEqualityInternal(left, right);
};

export const coerceLogical = (result: EvalResult, description: string): boolean => {
  return coerceLogicalInternal(result, description);
};

export const requireInteger = (value: number, errorMessage: string): number => {
  return requireIntegerInternal(value, errorMessage);
};

export const computePowerOfTen = (exponent: number, errorMessage: string): number => {
  return computePowerOfTenInternal(exponent, errorMessage);
};

export const normalizeZero = (value: number): number => {
  return normalizeZeroInternal(value);
};

export const coerceText = (result: EvalResult, description: string): string => {
  return coerceTextInternal(result, description);
};

export const valueToText = (value: FormulaEvaluationResult): string => {
  return valueToTextInternal(value);
};

export const createCriteriaPredicate = (
  criteria: EvalResult,
  compare: (left: FormulaEvaluationResult, right: FormulaEvaluationResult) => boolean,
  description: string,
) => {
  return createCriteriaPredicateInternal(criteria, compare, description);
};

export const collectNumericArguments = (args: EvalResult[], helpers: FormulaFunctionHelpers) => {
  return collectNumericArgumentsInternal(args, helpers);
};

export const summarizeNumbers = (values: ReadonlyArray<number>) => {
  return summarizeNumbersInternal(values);
};

export const validateInterestRate = (rate: number, description: string): number => {
  return validateInterestRateInternal(rate, description);
};

export const pow1p = (rate: number, periods: number): number => {
  return pow1pInternal(rate, periods);
};

export const computeNPV = (rate: number, cashflows: number[], initial: number = 0): number => {
  return computeNPVInternal(rate, cashflows, initial);
};

export const FINANCE_EPSILON = FINANCIAL_EPSILON;
export const FINANCE_MAX_ITERATIONS = FINANCIAL_MAX_ITERATIONS;

export const computeXNPV = (rate: number, cashflows: number[], dayDifferences: number[]): number => {
  return computeXNPVInternal(rate, cashflows, dayDifferences);
};

export const discountSeries = (rate: number, cashflows: number[]): number => {
  return discountSeriesInternal(rate, cashflows);
};

export const calculatePayment = (
  rate: number,
  periods: number,
  presentValue: number,
  futureValue: number,
  type: number,
): number => {
  return calculatePaymentInternal(rate, periods, presentValue, futureValue, type);
};

export const calculateInterestPayment = (
  rate: number,
  periods: number,
  payment: number,
  presentValue: number,
  futureValue: number,
  type: number,
  targetPeriod: number,
): number => {
  return calculateInterestPaymentInternal(rate, periods, payment, presentValue, futureValue, type, targetPeriod);
};

export { type FormulaErrorCode } from "./errors";

export const createFormulaError = (code: FormulaErrorCode, message?: string) => {
  return createFormulaErrorInternal(code, message);
};

export const getErrorCode = (error: unknown): FormulaErrorCode => {
  return getErrorCodeFromError(error);
};

export const getErrorTypeNumber = (code: FormulaErrorCode): number => {
  return getErrorTypeNumberInternal(code);
};

export const isNAError = (error: unknown): boolean => {
  return isNAErrorInternal(error);
};

export const isFormulaError = (error: unknown): boolean => {
  return isFormulaErrorInternal(error);
};

export const formulaFunctionHelpers: FormulaFunctionHelpers = {
  flattenArguments,
  flattenResult,
  coerceScalar,
  coerceLogical,
  requireNumber,
  requireBoolean,
  comparePrimitiveEquality,
  requireInteger,
  computePowerOfTen,
  normalizeZero,
  coerceText,
  valueToText,
  createCriteriaPredicate,
  collectNumericArguments,
  summarizeNumbers,
  validateInterestRate,
  pow1p,
  computeNPV,
  discountSeries,
  calculatePayment,
  calculateInterestPayment,
  computeXNPV,
  createFormulaError,
  getErrorCode,
  getErrorTypeNumber,
  isNAError,
  isFormulaError,
};
