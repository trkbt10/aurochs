/**
 * @file Financial math helpers shared across financial functions (ODF 1.3 §6.12).
 */

export const FINANCIAL_EPSILON = 1e-10;
export const FINANCIAL_MAX_ITERATIONS = 200;

export const validateInterestRate = (rate: number, description: string): number => {
  if (!Number.isFinite(rate)) {
    throw new Error(`${description} must be finite`);
  }
  if (rate <= -1) {
    throw new Error(`${description} must be greater than -1`);
  }
  return rate;
};

export const pow1p = (rate: number, periods: number): number => {
  return (1 + rate) ** periods;
};

export const discountSeries = (rate: number, cashflows: number[]): number => {
  validateInterestRate(rate, "Discount rate");
  return cashflows.reduce((total, amount, index) => total + amount / pow1p(rate, index), 0);
};

export const computeNPV = (rate: number, cashflows: number[], initial: number = 0): number => {
  validateInterestRate(rate, "NPV rate");
  return cashflows.reduce((total, amount, index) => total + amount / pow1p(rate, index + 1), initial);
};

export const computeXNPV = (rate: number, cashflows: number[], dayDifferences: number[]): number => {
  validateInterestRate(rate, "XNPV rate");
  return cashflows.reduce((total, amount, index) => {
    const discount = (1 + rate) ** (dayDifferences[index] / 365);
    return total + amount / discount;
  }, 0);
};

export const calculatePayment = (
  rate: number,
  periods: number,
  presentValue: number,
  futureValue: number,
  type: number,
): number => {
  if (periods <= 0 || !Number.isFinite(periods)) {
    throw new Error("Payment periods must be a finite positive number");
  }
  if (type !== 0 && type !== 1) {
    throw new Error("Payment type must be 0 or 1");
  }
  if (rate === 0) {
    return -(presentValue + futureValue) / periods;
  }
  validateInterestRate(rate, "Payment rate");
  const factor = pow1p(rate, periods);
  return (-(presentValue * factor + futureValue) * rate) / ((1 + rate * type) * (factor - 1));
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
  if (targetPeriod < 1 || targetPeriod > periods) {
    throw new Error("Target period is out of range");
  }
  if (rate === 0) {
    return 0;
  }
  validateInterestRate(rate, "Interest rate");
  const state = { balance: presentValue };
  for (let period = 1; period <= targetPeriod; period += 1) {
    if (type === 1) {
      state.balance += payment;
    }
    const interestComponent = state.balance * rate;
    if (period === targetPeriod) {
      return -interestComponent;
    }
    state.balance += interestComponent;
    if (type === 0) {
      state.balance += payment;
    }
  }
  return 0;
};
