/**
 * @file Per-child constraint resolution.
 *
 * Both the builder (computeDerivedRecursive) and the renderer
 * (applyConstraintsToChildren) need to resolve a single child's
 * position and size when its parent INSTANCE is resized.
 *
 * This module centralises the common steps:
 *   1. Extract constraint values from horizontalConstraint / verticalConstraint
 *   2. Read transform (m02, m12) and size (x, y)
 *   3. Resolve both axes via resolveConstraintAxis
 *   4. Detect position / size changes
 */

import type { FigNode, KiwiEnumValue } from "../types";
import { CONSTRAINT_TYPE_VALUES } from "../constants/layout";
import { resolveConstraintAxis } from "./constraint-axis";

// =============================================================================
// Types
// =============================================================================

/** Result of resolving a single child's constraints on both axes. */
export type ChildConstraintResolution = {
  readonly posX: number;
  readonly posY: number;
  readonly dimX: number;
  readonly dimY: number;
  readonly posChanged: boolean;
  readonly sizeChanged: boolean;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the numeric constraint value from a constraint field.
 * Returns `CONSTRAINT_TYPE_VALUES.MIN` (0) as default when the field is
 * absent, not an object, or has no `.value`.
 */
export function getConstraintValue(constraintField: KiwiEnumValue | undefined): number {
  if (!constraintField) {
    return CONSTRAINT_TYPE_VALUES.MIN;
  }
  return constraintField.value ?? CONSTRAINT_TYPE_VALUES.MIN;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve constraints for a single child node when its parent is resized.
 *
 * Returns `null` when the child has no `transform` or `size` —
 * callers should skip such children.
 */
/**
 * Minimal shape for constraint resolution.
 * Accepts both FigNode (production) and partial test objects.
 */
type ConstraintChild = {
  readonly horizontalConstraint?: KiwiEnumValue;
  readonly verticalConstraint?: KiwiEnumValue;
  readonly transform?: { readonly m02?: number; readonly m12?: number };
  readonly size?: { readonly x?: number; readonly y?: number };
  readonly [key: string]: unknown;
};

export function resolveChildConstraints(
  child: ConstraintChild,
  parentOrigSize: { x: number; y: number },
  parentNewSize: { x: number; y: number },
): ChildConstraintResolution | null {
  const hVal = getConstraintValue(child.horizontalConstraint);
  const vVal = getConstraintValue(child.verticalConstraint);

  const transform = child.transform;
  const size = child.size;

  if (!transform || !size) {return null;}

  const origX = transform.m02 ?? 0;
  const origY = transform.m12 ?? 0;
  const origW = size.x ?? 0;
  const origH = size.y ?? 0;

  const hResult = resolveConstraintAxis({
    origPos: origX,
    origDim: origW,
    parentOrigDim: parentOrigSize.x,
    parentNewDim: parentNewSize.x,
    constraintValue: hVal,
  });
  const vResult = resolveConstraintAxis({
    origPos: origY,
    origDim: origH,
    parentOrigDim: parentOrigSize.y,
    parentNewDim: parentNewSize.y,
    constraintValue: vVal,
  });

  return {
    posX: hResult.pos,
    posY: vResult.pos,
    dimX: hResult.dim,
    dimY: vResult.dim,
    posChanged: hResult.pos !== origX || vResult.pos !== origY,
    sizeChanged: hResult.dim !== origW || vResult.dim !== origH,
  };
}
