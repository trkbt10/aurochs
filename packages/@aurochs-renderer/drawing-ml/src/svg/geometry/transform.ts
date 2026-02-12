/**
 * @file Transform utilities for SVG rendering
 *
 * @see ECMA-376 Part 1, Section 20.1.7.5 (xfrm)
 */

import type { Transform } from "@aurochs-office/drawing-ml/domain/geometry";

/**
 * Build SVG transform attribute from Transform
 */
export function buildTransformAttr(transform: Transform): string {
  const parts: string[] = [];

  // Translate to position
  if (transform.x !== 0 || transform.y !== 0) {
    parts.push(`translate(${transform.x}, ${transform.y})`);
  }

  // Apply rotation around center
  if (transform.rotation !== 0) {
    const cx = transform.width / 2;
    const cy = transform.height / 2;
    parts.push(`rotate(${transform.rotation}, ${cx}, ${cy})`);
  }

  // Apply flips
  if (transform.flipH || transform.flipV) {
    const sx = transform.flipH ? -1 : 1;
    const sy = transform.flipV ? -1 : 1;
    const tx = transform.flipH ? transform.width : 0;
    const ty = transform.flipV ? transform.height : 0;
    parts.push(`translate(${tx}, ${ty}) scale(${sx}, ${sy})`);
  }

  return parts.join(" ");
}
