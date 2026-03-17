/** @file SVG number formatting utilities. */

/** Format a number for SVG attribute output (3 decimal precision). */
export function formatSvgNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`value must be finite: ${value}`);
  }

  const rounded = Math.round(value * 1000) / 1000;
  if (Object.is(rounded, -0)) {
    return "0";
  }

  return `${rounded}`;
}

/** Format a matrix of numbers as a space-separated SVG string. */
export function formatSvgMatrix(values: readonly number[]): string {
  return values.map((value) => formatSvgNumber(value)).join(" ");
}
