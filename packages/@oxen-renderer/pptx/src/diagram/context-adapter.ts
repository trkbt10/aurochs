/**
 * @file Diagram render context adapter (PPTX)
 *
 * Adapts `CoreRenderContext` into `@oxen-renderer/diagram` abstractions.
 */

import type { DiagramRenderContext } from "@oxen-renderer/diagram";
import type { CoreRenderContext } from "../render-context";

export type CreateDiagramRenderContextOptions<TShape> = {
  readonly ctx: CoreRenderContext;
  readonly renderShape: (shape: TShape) => string;
};

export function createDiagramRenderContext<TShape>(
  options: CreateDiagramRenderContextOptions<TShape>
): DiagramRenderContext<TShape, string> {
  const { ctx, renderShape } = options;

  return {
    renderShape,
    getResource: <TParsed,>(resourceId: string) => ctx.resourceStore?.get<TParsed>(resourceId),
    warnings: ctx.warnings,
  };
}
