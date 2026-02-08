/**
 * @file Numeric helper utilities shared across formula function implementations.
 */

export const requireInteger = (value: number, errorMessage: string): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(errorMessage);
  }
  return value;
};

export const computePowerOfTen = (exponent: number, errorMessage: string): number => {
  const result = 10 ** exponent;
  if (!Number.isFinite(result)) {
    throw new Error(errorMessage);
  }
  return result;
};

export const normalizeZero = (value: number): number => {
  return value === 0 ? 0 : value;
};
