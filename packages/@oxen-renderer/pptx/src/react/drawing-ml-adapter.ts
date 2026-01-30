/**
 * @file PPTX to DrawingML Context Adapter
 *
 * Adapts PPTX ReactRenderContext to DrawingML shared context.
 * This allows PPTX-specific components to use shared DrawingML rendering.
 */

import type { DrawingMLRenderContext, WarningCollector } from "@oxen-renderer/drawing-ml/context";
import type { ReactRenderContext } from "./context";

function createResolveResource(
  pptxContext: ReactRenderContext,
): DrawingMLRenderContext["resolveResource"] {
  if (!pptxContext.resources) {
    return undefined;
  }
  return (resourceId: string) => pptxContext.resources.resolve(resourceId);
}

function createRenderSize(
  slideSize: ReactRenderContext["slideSize"],
): DrawingMLRenderContext["renderSize"] {
  if (!slideSize) {
    return undefined;
  }
  return {
    width: slideSize.width as number,
    height: slideSize.height as number,
  };
}

/**
 * Create a DrawingMLRenderContext from a PPTX ReactRenderContext.
 *
 * This adapter bridges PPTX-specific context to the format-agnostic
 * DrawingML rendering context.
 *
 * @param pptxContext - PPTX render context
 * @returns DrawingML render context
 *
 * @example
 * ```tsx
 * function PptxShapeRenderer() {
 *   const pptxCtx = useRenderContext();
 *   const drawingMLCtx = createDrawingMLContext(pptxCtx);
 *
 *   return (
 *     <DrawingMLProvider {...drawingMLCtx}>
 *       <SharedColorComponent />
 *     </DrawingMLProvider>
 *   );
 * }
 * ```
 */
export function createDrawingMLContext(
  pptxContext: ReactRenderContext,
): Omit<DrawingMLRenderContext, "getNextId"> & { getNextId: (prefix: string) => string } {
  // Adapt warnings collector
  const warnings: WarningCollector = {
    warn: (message, context) => {
      pptxContext.warnings.add({
        type: "unsupported",
        message,
        // Convert context object to string details
        details: context ? JSON.stringify(context) : undefined,
      });
    },
  };

  // Create resource resolver that uses PPTX ResourceResolver
  const resolveResource = createResolveResource(pptxContext);

  // Create ID generator that uses PPTX's shape ID system
  // We use a local counter since shape IDs are different from def IDs
  // eslint-disable-next-line no-restricted-syntax -- Closure state: unique ID counter for SVG defs
  let defIdCounter = 0;
  const getNextId = (prefix: string): string => {
    return `${prefix}-${defIdCounter++}`;
  };

  return {
    colorContext: pptxContext.colorContext,
    resolveResource,
    getNextId,
    warnings,
    // Add resolved background and render size for background/shape rendering
    resolvedBackground: pptxContext.resolvedBackground,
    renderSize: createRenderSize(pptxContext.slideSize),
  };
}

/**
 * Create DrawingML provider props from PPTX context.
 *
 * Use this to pass to DrawingMLProvider component.
 */
export function getDrawingMLProviderProps(pptxContext: ReactRenderContext) {
  const ctx = createDrawingMLContext(pptxContext);

  return {
    colorContext: ctx.colorContext,
    resolveResource: ctx.resolveResource,
    getNextId: ctx.getNextId,
    warnings: ctx.warnings,
    resolvedBackground: ctx.resolvedBackground,
    renderSize: ctx.renderSize,
  };
}
