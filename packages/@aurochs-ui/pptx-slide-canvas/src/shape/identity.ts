/**
 * @file Shape identity
 *
 * ID-related operations for shapes.
 * Delegates to generic implementation in editor-controls.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import {
  getShapeId as genericGetShapeId,
} from "@aurochs-ui/editor-controls/shape-editor";

/**
 * Get shape ID.
 * Returns undefined for shapes without nonVisual (shouldn't happen in valid PPTX).
 */
export function getShapeId(shape: Shape): ShapeId | undefined {
  return genericGetShapeId(shape) as ShapeId | undefined;
}
