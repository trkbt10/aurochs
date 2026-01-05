/**
 * @file Shape utility functions for PPTX processing
 *
 * Domain-level utilities for working with Shape types.
 * These functions operate on domain objects and have no parser/render dependencies.
 *
 * @see ECMA-376 Part 1, Section 19.3.1 - Presentation ML Shapes
 */

import type { Shape, SpShape } from "./shape";

/**
 * Check if a shape is a placeholder.
 *
 * Only SpShape can be a placeholder per ECMA-376.
 * Placeholder shapes inherit content and styling from layout/master.
 *
 * @param shape - The shape to check
 * @returns true if the shape is a placeholder
 * @see ECMA-376 Part 1, Section 19.3.1.36 (ph)
 */
export function isPlaceholder(shape: Shape): boolean {
  if (shape.type !== "sp") {
    return false;
  }
  return (shape as SpShape).placeholder !== undefined;
}

/**
 * Filter non-placeholder shapes from an array.
 *
 * These are decorative shapes that should be rendered behind slide content.
 * Used when processing layout shapes to separate decorative elements from
 * placeholder slots.
 *
 * @param shapes - Array of shapes to filter
 * @returns Array containing only non-placeholder shapes
 */
export function getNonPlaceholderShapes(shapes: readonly Shape[]): readonly Shape[] {
  return shapes.filter((shape) => !isPlaceholder(shape));
}
