/**
 * @file Single-axis constraint resolution.
 *
 * Figma defines 5 constraint types per axis (MIN, CENTER, MAX, STRETCH, SCALE).
 * This module provides a single, numeric-value-based implementation used by
 * both the builder (computeDerivedSymbolData) and the renderer.
 */

import { CONSTRAINT_TYPE_VALUES } from "../constants/layout";

/**
 * Resolve a single-axis constraint.
 *
 * @param origPos       Child's original position along this axis
 * @param origDim       Child's original size along this axis
 * @param parentOrigDim Parent SYMBOL's size along this axis
 * @param parentNewDim  Parent INSTANCE's (resized) size along this axis
 * @param constraintValue  Numeric constraint value (from CONSTRAINT_TYPE_VALUES)
 * @returns New position and dimension for this axis
 */
export function resolveConstraintAxis(
  origPos: number,
  origDim: number,
  parentOrigDim: number,
  parentNewDim: number,
  constraintValue: number,
): { pos: number; dim: number } {
  const delta = parentNewDim - parentOrigDim;
  switch (constraintValue) {
    case CONSTRAINT_TYPE_VALUES.MIN:
      return { pos: origPos, dim: origDim };
    case CONSTRAINT_TYPE_VALUES.CENTER:
      return { pos: origPos + delta / 2, dim: origDim };
    case CONSTRAINT_TYPE_VALUES.MAX:
      return { pos: origPos + delta, dim: origDim };
    case CONSTRAINT_TYPE_VALUES.STRETCH: {
      const leftMargin = origPos;
      const rightMargin = parentOrigDim - (origPos + origDim);
      return { pos: leftMargin, dim: Math.max(0, parentNewDim - leftMargin - rightMargin) };
    }
    case CONSTRAINT_TYPE_VALUES.SCALE: {
      if (parentOrigDim === 0) return { pos: origPos, dim: origDim };
      const ratio = parentNewDim / parentOrigDim;
      return { pos: origPos * ratio, dim: origDim * ratio };
    }
    default:
      return { pos: origPos, dim: origDim };
  }
}
