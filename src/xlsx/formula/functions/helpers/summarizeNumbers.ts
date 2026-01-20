/**
 * @file Summarizes numeric sequences for statistical calculations.
 */

export const summarizeNumbers = (
  values: ReadonlyArray<number>,
): {
  count: number;
  sum: number;
  sumOfSquares: number;
} => {
  const summary = values.reduce<{
    sum: number;
    sumOfSquares: number;
  }>(
    (state, value) => ({
      sum: state.sum + value,
      sumOfSquares: state.sumOfSquares + value * value,
    }),
    {
      sum: 0,
      sumOfSquares: 0,
    },
  );

  return {
    count: values.length,
    sum: summary.sum,
    sumOfSquares: summary.sumOfSquares,
  };
};
