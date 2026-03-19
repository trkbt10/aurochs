/**
 * @file PPTX render data resolver
 *
 * Combines transform resolver with render utilities for shape display.
 * Shared by pptx-editor and potx-editor.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import { pptxTransformResolver } from "./pptx-transform";
import { isShapeHidden } from "@aurochs-renderer/pptx/svg";
import { getFillColor, getStrokeColor, getStrokeWidth } from "./pptx-render";
import {
  collectShapeRenderData as genericCollectShapeRenderData,
  type RenderDataResolver,
  type ShapeRenderData,
} from "@aurochs-ui/editor-controls/shape-editor";

/**
 * PPTX render data resolver with fill/stroke/hidden support.
 */
export const pptxRenderResolver: RenderDataResolver = {
  ...pptxTransformResolver,
  isHidden: (shape) => isShapeHidden(shape as Shape),
  getFillColor: (shape) => getFillColor(shape as Shape),
  getStrokeColor: (shape) => getStrokeColor(shape as Shape),
  getStrokeWidth: (shape) => getStrokeWidth(shape as Shape),
};

/**
 * Collect all visible shapes with their render data using PPTX resolver.
 */
export function collectPptxShapeRenderData(shapes: readonly Shape[]): readonly ShapeRenderData[] {
  return genericCollectShapeRenderData(shapes, pptxRenderResolver);
}
