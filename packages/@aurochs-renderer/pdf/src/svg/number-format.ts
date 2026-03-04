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

export function formatSvgMatrix(values: readonly number[]): string {
  return values.map((value) => formatSvgNumber(value)).join(" ");
}
