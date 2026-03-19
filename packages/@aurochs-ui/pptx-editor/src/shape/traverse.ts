/**
 * @file Shape traversal
 *
 * PPTX-specific traversal using generic shape-editor implementation.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { isShapeHidden } from "@aurochs-renderer/pptx/svg";
import { pptxTransformResolver } from "./transform";
import { getFillColor, getStrokeColor, getStrokeWidth } from "./render";
import {
  collectShapeRenderData as genericCollectShapeRenderData,
  type RenderDataResolver,
} from "@aurochs-ui/editor-controls/shape-editor";

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
 * PPTX render data resolver
 */
const pptxRenderResolver: RenderDataResolver = {
  ...pptxTransformResolver,
  isHidden: (shape) => isShapeHidden(shape as Shape),
  getFillColor: (shape) => getFillColor(shape as Shape),
  getStrokeColor: (shape) => getStrokeColor(shape as Shape),
  getStrokeWidth: (shape) => getStrokeWidth(shape as Shape),
};

/**
 * Collect all visible shapes with their render data
 */
export function collectShapeRenderData(shapes: readonly Shape[]): readonly ShapeRenderData[] {
  return genericCollectShapeRenderData(shapes, pptxRenderResolver) as readonly ShapeRenderData[];
}
