/**
 * @file Shape traversal
 *
 * PPTX-specific traversal delegating to ooxml-components shared resolver.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { collectPptxShapeRenderData } from "@aurochs-ui/ooxml-components/pptx-render-resolver";

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
 * Collect all visible shapes with their render data
 */
export function collectShapeRenderData(shapes: readonly Shape[]): readonly ShapeRenderData[] {
  return collectPptxShapeRenderData(shapes) as readonly ShapeRenderData[];
}
