/**
 * @file PDF shading operator handlers
 *
 * Handles shading operators:
 * - sh: Paint shading (fills current clipping region)
 *
 * Current strategy:
 * - Rasterize the shading into a `PdfImage` (deterministic, max-size capped).
 */

import type { OperatorHandler, OperatorHandlerEntry, ParsedRasterImage } from "./types";
import { popString } from "./stack-ops";
import { rasterizeShadingFill } from "../shading/shading-raster";

const handleShadingFill: OperatorHandler = (ctx, gfxOps) => {
  const [name, newStack] = popString(ctx.operandStack);
  const key = name.startsWith("/") ? name.slice(1) : name;

  if (!Number.isFinite(ctx.shadingMaxSize) || ctx.shadingMaxSize <= 0) {
    return { operandStack: newStack };
  }

  const shading = ctx.shadings.get(key);
  if (!shading) {
    return { operandStack: newStack };
  }

  try {
    const image = rasterizeShadingFill(shading, gfxOps.get(), {
      shadingMaxSize: ctx.shadingMaxSize,
      pageBBox: ctx.pageBBox,
    });
    if (!image) {
      return { operandStack: newStack };
    }

    const element: ParsedRasterImage = { type: "rasterImage", image };
    return {
      operandStack: newStack,
      elements: [...ctx.elements, element],
    };
  } catch (error) {
    console.warn("[PDF Parser] Failed to rasterize shading:", error);
    return { operandStack: newStack };
  }
};

export const SHADING_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  ["sh", { handler: handleShadingFill, category: "paint", description: "Paint shading (rasterized)" }],
]);

export const shadingHandlers = {
  handleShadingFill,
} as const;
