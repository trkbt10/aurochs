/**
 * @file PDF color operator handlers
 *
 * Handles color operators:
 * - Device color: g/G (gray), rg/RG (RGB), k/K (CMYK)
 * - Color space: cs/CS (set color space)
 * - General color: sc/SC/scn/SCN (set color in current space)
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate related operations (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Lookup objects instead of switch (Rule 1)
 */

import type {
  GraphicsStateOps,
  OperatorHandler,
  OperatorHandlerEntry,
} from "./types";
import { popNumber, popString, collectColorComponents } from "./stack-ops";

// =============================================================================
// Gray Color Handlers
// =============================================================================

/**
 * g operator: Set fill color to gray
 */
const handleFillGray: OperatorHandler = (ctx, gfxOps) => {
  const [gray, newStack] = popNumber(ctx.operandStack);
  gfxOps.setFillGray(gray);

  return { operandStack: newStack };
};

/**
 * G operator: Set stroke color to gray
 */
const handleStrokeGray: OperatorHandler = (ctx, gfxOps) => {
  const [gray, newStack] = popNumber(ctx.operandStack);
  gfxOps.setStrokeGray(gray);

  return { operandStack: newStack };
};

// =============================================================================
// RGB Color Handlers
// =============================================================================

/**
 * rg operator: Set fill color to RGB
 */
const handleFillRgb: OperatorHandler = (ctx, gfxOps) => {
  const [b, stack1] = popNumber(ctx.operandStack);
  const [g, stack2] = popNumber(stack1);
  const [r, stack3] = popNumber(stack2);
  gfxOps.setFillRgb(r, g, b);

  return { operandStack: stack3 };
};

/**
 * RG operator: Set stroke color to RGB
 */
const handleStrokeRgb: OperatorHandler = (ctx, gfxOps) => {
  const [b, stack1] = popNumber(ctx.operandStack);
  const [g, stack2] = popNumber(stack1);
  const [r, stack3] = popNumber(stack2);
  gfxOps.setStrokeRgb(r, g, b);

  return { operandStack: stack3 };
};

// =============================================================================
// CMYK Color Handlers
// =============================================================================

/**
 * k operator: Set fill color to CMYK
 */
const handleFillCmyk: OperatorHandler = (ctx, gfxOps) => {
  const [k, stack1] = popNumber(ctx.operandStack);
  const [y, stack2] = popNumber(stack1);
  const [m, stack3] = popNumber(stack2);
  const [c, stack4] = popNumber(stack3);
  gfxOps.setFillCmyk(c, m, y, k);

  return { operandStack: stack4 };
};

/**
 * K operator: Set stroke color to CMYK
 */
const handleStrokeCmyk: OperatorHandler = (ctx, gfxOps) => {
  const [k, stack1] = popNumber(ctx.operandStack);
  const [y, stack2] = popNumber(stack1);
  const [m, stack3] = popNumber(stack2);
  const [c, stack4] = popNumber(stack3);
  gfxOps.setStrokeCmyk(c, m, y, k);

  return { operandStack: stack4 };
};

// =============================================================================
// Color Space Handlers
// =============================================================================

/**
 * cs/CS operator: Set color space
 *
 * Just consumes the color space name - we infer from component count when
 * the actual color is set.
 */
const handleColorSpace: OperatorHandler = (ctx) => {
  const [, newStack] = popString(ctx.operandStack);
  return { operandStack: newStack };
};

// =============================================================================
// General Color Handlers (sc/SC/scn/SCN)
// =============================================================================

/**
 * Apply fill color based on component count.
 *
 * Infers color space from number of numeric operands:
 * - 1 component: DeviceGray
 * - 3 components: DeviceRGB
 * - 4 components: DeviceCMYK
 */
function applyFillColorN(components: readonly number[], gfxOps: GraphicsStateOps): void {
  switch (components.length) {
    case 1:
      gfxOps.setFillGray(components[0]);
      break;
    case 3:
      gfxOps.setFillRgb(components[0], components[1], components[2]);
      break;
    case 4:
      gfxOps.setFillCmyk(components[0], components[1], components[2], components[3]);
      break;
    default:
      // Unknown color space, fallback to RGB if 3+ or gray if 1+
      if (components.length >= 3) {
        gfxOps.setFillRgb(components[0], components[1], components[2]);
      } else if (components.length >= 1) {
        gfxOps.setFillGray(components[0]);
      }
  }
}

/**
 * Apply stroke color based on component count.
 */
function applyStrokeColorN(components: readonly number[], gfxOps: GraphicsStateOps): void {
  switch (components.length) {
    case 1:
      gfxOps.setStrokeGray(components[0]);
      break;
    case 3:
      gfxOps.setStrokeRgb(components[0], components[1], components[2]);
      break;
    case 4:
      gfxOps.setStrokeCmyk(components[0], components[1], components[2], components[3]);
      break;
    default:
      if (components.length >= 3) {
        gfxOps.setStrokeRgb(components[0], components[1], components[2]);
      } else if (components.length >= 1) {
        gfxOps.setStrokeGray(components[0]);
      }
  }
}

/**
 * sc/scn operator: Set fill color in current color space
 *
 * We infer the color space from the number of operands on the stack.
 */
const handleFillColorN: OperatorHandler = (ctx, gfxOps) => {
  const [components, newStack] = collectColorComponents(ctx.operandStack);
  applyFillColorN(components, gfxOps);

  return { operandStack: newStack };
};

/**
 * SC/SCN operator: Set stroke color in current color space
 */
const handleStrokeColorN: OperatorHandler = (ctx, gfxOps) => {
  const [components, newStack] = collectColorComponents(ctx.operandStack);
  applyStrokeColorN(components, gfxOps);

  return { operandStack: newStack };
};

function popOptionalName(
  stack: readonly (number | string | readonly (number | string)[])[],
): readonly [name: string | null, newStack: readonly (number | string | readonly (number | string)[])[]] {
  if (stack.length === 0) {return [null, stack];}
  const top = stack[stack.length - 1];
  if (typeof top !== "string" || !top.startsWith("/")) {return [null, stack];}
  return [top, stack.slice(0, -1)];
}

/**
 * scn/SCN operator: Set color in current color space (including patterns/separation)
 *
 * For pattern/separation color spaces, a trailing name operand may appear.
 * We don't render patterns yet, but we must consume the name to avoid leaking
 * operands into subsequent operators.
 */
const handleFillColorNWithOptionalName: OperatorHandler = (ctx, gfxOps) => {
  const [name, stackAfterName] = popOptionalName(ctx.operandStack);
  const [components, newStack] = collectColorComponents(stackAfterName);
  if (name) {
    // Pattern color space (`/Pattern`) can be set as: `/Pattern cs /P1 scn`.
    // Uncolored tiling patterns can also be set as: `/Pattern cs c1 ... cn /P1 scn`.
    // We don't render patterns yet; make the fallback deterministic (black) and
    // avoid incorrectly using the numeric components as a solid fill.
    gfxOps.setFillRgb(0, 0, 0);
    return { operandStack: newStack };
  }
  applyFillColorN(components, gfxOps);
  return { operandStack: newStack };
};

const handleStrokeColorNWithOptionalName: OperatorHandler = (ctx, gfxOps) => {
  const [name, stackAfterName] = popOptionalName(ctx.operandStack);
  const [components, newStack] = collectColorComponents(stackAfterName);
  if (name) {
    gfxOps.setStrokeRgb(0, 0, 0);
    return { operandStack: newStack };
  }
  applyStrokeColorN(components, gfxOps);
  return { operandStack: newStack };
};

// =============================================================================
// Handler Registry (Rule 1: Lookup objects instead of switch)
// =============================================================================

/**
 * Color operator handlers.
 */
export const COLOR_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  // Gray
  ["g", { handler: handleFillGray, category: "color", description: "Set fill gray" }],
  ["G", { handler: handleStrokeGray, category: "color", description: "Set stroke gray" }],
  // RGB
  ["rg", { handler: handleFillRgb, category: "color", description: "Set fill RGB" }],
  ["RG", { handler: handleStrokeRgb, category: "color", description: "Set stroke RGB" }],
  // CMYK
  ["k", { handler: handleFillCmyk, category: "color", description: "Set fill CMYK" }],
  ["K", { handler: handleStrokeCmyk, category: "color", description: "Set stroke CMYK" }],
  // Color space
  ["cs", { handler: handleColorSpace, category: "color", description: "Set fill color space" }],
  ["CS", { handler: handleColorSpace, category: "color", description: "Set stroke color space" }],
  // General color
  ["sc", { handler: handleFillColorN, category: "color", description: "Set fill color (current space)" }],
  ["scn", { handler: handleFillColorNWithOptionalName, category: "color", description: "Set fill color (pattern/separation)" }],
  ["SC", { handler: handleStrokeColorN, category: "color", description: "Set stroke color (current space)" }],
  ["SCN", { handler: handleStrokeColorNWithOptionalName, category: "color", description: "Set stroke color (pattern/separation)" }],
]);

// =============================================================================
// Exported Functions for Testing
// =============================================================================

export const colorHandlers = {
  handleFillGray,
  handleStrokeGray,
  handleFillRgb,
  handleStrokeRgb,
  handleFillCmyk,
  handleStrokeCmyk,
  handleColorSpace,
  handleFillColorN,
  handleStrokeColorN,
  handleFillColorNWithOptionalName,
  handleStrokeColorNWithOptionalName,
  applyFillColorN,
  applyStrokeColorN,
} as const;
