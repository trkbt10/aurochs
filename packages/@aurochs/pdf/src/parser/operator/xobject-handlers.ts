/**
 * @file PDF XObject operator handlers
 *
 * Handles XObject operators:
 * - Do: Paint XObject (images, forms)
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate related operations (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Lookup objects instead of switch (Rule 1)
 */

import type {
  OperatorHandler,
  OperatorHandlerEntry,
  ParsedImage,
} from "./types";
import { popString } from "./stack-ops";

// =============================================================================
// XObject Handlers
// =============================================================================

/**
 * Do operator: Paint XObject
 *
 * XObjects can be images (XImage), forms (XForm), or PostScript (XObject).
 * For now, we treat all as images and record the reference name.
 */
const handleXObject: OperatorHandler = (ctx, gfxOps) => {
  const [name, newStack] = popString(ctx.operandStack);

  const element: ParsedImage = {
    type: "image",
    name,
    graphicsState: gfxOps.get(),
  };

  return {
    operandStack: newStack,
    elements: [...ctx.elements, element],
  };
};

// =============================================================================
// Handler Registry (Rule 1: Lookup objects instead of switch)
// =============================================================================

/**
 * XObject operator handlers.
 */
export const XOBJECT_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  ["Do", { handler: handleXObject, category: "xobject", description: "Paint XObject" }],
]);

// =============================================================================
// Exported Functions for Testing
// =============================================================================

export const xobjectHandlers = {
  handleXObject,
} as const;
