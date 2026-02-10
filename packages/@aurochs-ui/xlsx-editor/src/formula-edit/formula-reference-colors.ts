/**
 * @file Formula reference highlight colors
 *
 * 8-color cycle for formula reference highlighting, matching the Excel convention.
 * Each reference in a formula is assigned a color from this palette in order.
 */

export const REFERENCE_COLORS = [
  "#4472C4",
  "#ED7D31",
  "#A5A5A5",
  "#FFC000",
  "#5B9BD5",
  "#70AD47",
  "#264478",
  "#9B59B6",
] as const;

/**
 * Get a reference color by cycling through the 8-color palette.
 */
export function getReferenceColor(index: number): string {
  return REFERENCE_COLORS[index % REFERENCE_COLORS.length];
}
