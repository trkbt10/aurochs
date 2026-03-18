/**
 * @file Generic shape transform utilities
 *
 * Coordinate calculation for group transform handling.
 * Format-specific transform get/set is handled via callbacks.
 */

import type { ShapeNode, GroupShapeNode } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Minimal transform for positioning a shape on a canvas.
 */
export type ShapeTransform = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

/**
 * Group transform with child coordinate space mapping.
 */
export type GroupShapeTransform = ShapeTransform & {
  readonly childOffsetX?: number;
  readonly childOffsetY?: number;
  readonly childExtentWidth?: number;
  readonly childExtentHeight?: number;
};

/**
 * Absolute bounds in canvas coordinate space.
 */
export type AbsoluteBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

/**
 * Callbacks for resolving transforms from format-specific shape types.
 */
export type TransformResolver = {
  /** Get transform from a shape node */
  readonly getTransform: (shape: ShapeNode) => ShapeTransform | undefined;
  /** Get group transform from a group shape node */
  readonly getGroupTransform: (group: GroupShapeNode) => GroupShapeTransform | undefined;
};

// =============================================================================
// Group Transform Calculations
// =============================================================================

/**
 * Parent transform context for calculating child coordinates.
 */
type ParentContext = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scaleX: number;
  readonly scaleY: number;
};

/**
 * Build cumulative parent context from a chain of parent groups.
 */
function buildParentContext(
  parentGroups: readonly GroupShapeNode[],
  getGroupTransform: (group: GroupShapeNode) => GroupShapeTransform | undefined,
): ParentContext {
  // eslint-disable-next-line no-restricted-syntax -- accumulating context through loop requires let
  let context: ParentContext = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
  };

  for (const group of parentGroups) {
    const grpTransform = getGroupTransform(group);
    if (!grpTransform) {
      continue;
    }

    const groupX = grpTransform.x;
    const groupY = grpTransform.y;
    const groupWidth = grpTransform.width;
    const groupHeight = grpTransform.height;
    const childOffsetX = grpTransform.childOffsetX ?? 0;
    const childOffsetY = grpTransform.childOffsetY ?? 0;
    const childExtentWidth = grpTransform.childExtentWidth ?? groupWidth;
    const childExtentHeight = grpTransform.childExtentHeight ?? groupHeight;

    const scaleX = groupWidth / childExtentWidth;
    const scaleY = groupHeight / childExtentHeight;

    context = {
      offsetX: context.offsetX + (groupX - childOffsetX * scaleX) * context.scaleX,
      offsetY: context.offsetY + (groupY - childOffsetY * scaleY) * context.scaleY,
      scaleX: context.scaleX * scaleX,
      scaleY: context.scaleY * scaleY,
    };
  }

  return context;
}

/**
 * Calculate the absolute bounds of a shape in canvas coordinate space.
 *
 * For group children, this correctly applies parent group transforms
 * including childOffset and childExtent.
 *
 * @param shape - The shape to get bounds for
 * @param parentGroups - Array of parent groups from outermost to innermost
 * @param resolver - Callbacks for resolving transforms from shape nodes
 * @returns Absolute bounds or undefined if shape has no transform
 */
export function getAbsoluteBounds(
  shape: ShapeNode,
  parentGroups: readonly GroupShapeNode[],
  resolver: TransformResolver,
): AbsoluteBounds | undefined {
  const transform = resolver.getTransform(shape);
  if (!transform) {
    return undefined;
  }

  const context = buildParentContext(parentGroups, resolver.getGroupTransform);

  return {
    x: context.offsetX + transform.x * context.scaleX,
    y: context.offsetY + transform.y * context.scaleY,
    width: transform.width * context.scaleX,
    height: transform.height * context.scaleY,
    rotation: transform.rotation,
  };
}
