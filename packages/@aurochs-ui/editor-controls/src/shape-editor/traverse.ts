/**
 * @file Generic shape traversal utilities
 *
 * Utilities for traversing shape trees and collecting render data.
 * Format-specific operations (hidden check, fill/stroke) via callbacks.
 */

import type { ShapeNode, GroupShapeNode } from "./types";
import type { TransformResolver } from "./transform";
import { isIdentifiable, isGroupShape, getShapeName } from "./types";
import { getAbsoluteBounds } from "./transform";

// =============================================================================
// Types
// =============================================================================

/**
 * Shape render data for canvas display
 */
export type ShapeRenderData = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly fill: string | undefined;
  readonly stroke: string | undefined;
  readonly strokeWidth: number;
  readonly name: string;
};

/**
 * Callbacks for format-specific rendering properties.
 */
export type RenderDataResolver = TransformResolver & {
  /** Check if a shape is hidden */
  readonly isHidden: (shape: ShapeNode) => boolean;
  /** Get fill color as hex string */
  readonly getFillColor: (shape: ShapeNode) => string | undefined;
  /** Get stroke color as hex string */
  readonly getStrokeColor: (shape: ShapeNode) => string | undefined;
  /** Get stroke width */
  readonly getStrokeWidth: (shape: ShapeNode) => number;
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Collect all visible shapes with their render data.
 */
export function collectShapeRenderData(
  shapes: readonly ShapeNode[],
  resolver: RenderDataResolver,
): readonly ShapeRenderData[] {
  const result: ShapeRenderData[] = [];

  const traverse = (shapeList: readonly ShapeNode[], parentGroups: readonly GroupShapeNode[] = []) => {
    for (const shape of shapeList) {
      if (resolver.isHidden(shape)) {
        continue;
      }

      if (!isIdentifiable(shape)) {
        continue;
      }

      const id = shape.nonVisual.id;
      const bounds = getAbsoluteBounds(shape, parentGroups, resolver);
      if (!bounds) {
        continue;
      }

      result.push({
        id,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: bounds.rotation,
        fill: resolver.getFillColor(shape),
        stroke: resolver.getStrokeColor(shape),
        strokeWidth: resolver.getStrokeWidth(shape),
        name: getShapeName(shape),
      });

      if (isGroupShape(shape)) {
        traverse(shape.children, [...parentGroups, shape]);
      }
    }
  };

  traverse(shapes);
  return result;
}
