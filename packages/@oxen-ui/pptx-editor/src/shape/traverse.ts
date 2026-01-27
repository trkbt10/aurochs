/**
 * @file Shape traversal
 *
 * Utilities for traversing shape trees and collecting data.
 */

import type { Shape, GrpShape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { isShapeHidden } from "@oxen/pptx-render/svg";
import { getAbsoluteBounds } from "./transform";
import { getShapeId } from "./identity";
import { getFillColor, getStrokeColor, getStrokeWidth } from "./render";

/**
 * Shape render data for canvas display
 */
export type ShapeRenderData = {
  readonly id: ShapeId;
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
 * Get shape name from nonVisual properties
 */
export function getShapeName(shape: Shape): string {
  if ("nonVisual" in shape) {
    return shape.nonVisual.name ?? "";
  }
  return "";
}

/**
 * Collect all visible shapes with their render data
 */
export function collectShapeRenderData(shapes: readonly Shape[]): readonly ShapeRenderData[] {
  const result: ShapeRenderData[] = [];

  const traverse = (shapeList: readonly Shape[], parentGroups: readonly GrpShape[] = []) => {
    for (const shape of shapeList) {
      if (isShapeHidden(shape)) {
        continue;
      }

      const id = getShapeId(shape);
      if (!id) {
        continue;
      }

      const bounds = getAbsoluteBounds(shape, parentGroups);
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
        fill: getFillColor(shape),
        stroke: getStrokeColor(shape),
        strokeWidth: getStrokeWidth(shape),
        name: getShapeName(shape),
      });

      if (shape.type === "grpSp") {
        traverse(shape.children, [...parentGroups, shape]);
      }
    }
  };

  traverse(shapes);
  return result;
}
