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
export function getConstraintValue(constraintField: unknown): number {
  if (!constraintField || typeof constraintField !== "object") {
    return CONSTRAINT_TYPE_VALUES.MIN;
  }
  const val = (constraintField as { value?: number }).value;
  return val ?? CONSTRAINT_TYPE_VALUES.MIN;
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
export function resolveChildConstraints(
  child: Record<string, unknown>,
  parentOrigSize: { x: number; y: number },
  parentNewSize: { x: number; y: number },
): ChildConstraintResolution | null {
  const hVal = getConstraintValue(child.horizontalConstraint);
  const vVal = getConstraintValue(child.verticalConstraint);

  const transform = child.transform as
    | { m02?: number; m12?: number }
    | undefined;
  const size = child.size as { x?: number; y?: number } | undefined;

  if (!transform || !size) return null;

  const origX = transform.m02 ?? 0;
  const origY = transform.m12 ?? 0;
  const origW = size.x ?? 0;
  const origH = size.y ?? 0;

  const hResult = resolveConstraintAxis(
    origX,
    origW,
    parentOrigSize.x,
    parentNewSize.x,
    hVal,
  );
  const vResult = resolveConstraintAxis(
    origY,
    origH,
    parentOrigSize.y,
    parentNewSize.y,
    vVal,
  );

  return {
    posX: hResult.pos,
    posY: vResult.pos,
    dimX: hResult.dim,
    dimY: vResult.dim,
    posChanged: hResult.pos !== origX || vResult.pos !== origY,
    sizeChanged: hResult.dim !== origW || vResult.dim !== origH,
  };
}
