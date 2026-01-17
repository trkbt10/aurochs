/**
 * @file Operand stack operations
 *
 * Pure functions for manipulating the PDF operand stack.
 * Each function returns a tuple of [value, newStack] enabling immutable operations.
 *
 * Design principles (ts-refine):
 * - No mutation (Rule 3)
 * - Pure functions for testability (Rule 5)
 * - Explicit return values instead of side effects
 */

import type { OperandStack, OperandValue } from "./types";

// =============================================================================
// Stack Pop Operations
// =============================================================================

/**
 * Pop a number from the operand stack.
 *
 * If the stack is empty or the value is not a number, returns 0 as fallback.
 * This matches PDF viewer behavior where malformed content streams are handled gracefully.
 *
 * @returns Tuple of [poppedNumber, remainingStack]
 * @see PDF Reference 1.7, Section 3.7.1 (Content Streams)
 */
export function popNumber(stack: OperandStack): [number, OperandStack] {
  if (stack.length === 0) {
    console.warn("[PDF Parser] Expected number operand but got empty stack");
    return [0, stack];
  }

  const val = stack[stack.length - 1];
  const newStack = stack.slice(0, -1);

  if (typeof val !== "number") {
    console.warn(
      `[PDF Parser] Expected number operand but got ${typeof val}` +
        ` (value: ${JSON.stringify(val)})`
    );
    return [0, newStack];
  }

  return [val, newStack];
}

/**
 * Pop a string from the operand stack.
 *
 * If the stack is empty or the value is not a string, returns empty string as fallback.
 *
 * @returns Tuple of [poppedString, remainingStack]
 */
export function popString(stack: OperandStack): [string, OperandStack] {
  if (stack.length === 0) {
    console.warn("[PDF Parser] Expected string operand but got empty stack");
    return ["", stack];
  }

  const val = stack[stack.length - 1];
  const newStack = stack.slice(0, -1);

  if (typeof val !== "string") {
    console.warn(
      `[PDF Parser] Expected string operand but got ${typeof val}` +
        ` (value: ${JSON.stringify(val)})`
    );
    return ["", newStack];
  }

  return [val, newStack];
}

/**
 * Pop an array from the operand stack.
 *
 * If the stack is empty or the value is not an array, returns empty array as fallback.
 *
 * @returns Tuple of [poppedArray, remainingStack]
 */
export function popArray(stack: OperandStack): [readonly (number | string)[], OperandStack] {
  if (stack.length === 0) {
    console.warn("[PDF Parser] Expected array operand but got empty stack");
    return [[], stack];
  }

  const val = stack[stack.length - 1];
  const newStack = stack.slice(0, -1);

  if (Array.isArray(val)) {
    return [val, newStack];
  }

  console.warn(
    `[PDF Parser] Expected array operand but got ${typeof val}` +
      ` (value: ${JSON.stringify(val)})`
  );
  return [[], newStack];
}

/**
 * Pop multiple numbers from the stack in reverse order.
 *
 * For operators like "a b c d e f cm", this pops f, e, d, c, b, a
 * and returns them as [a, b, c, d, e, f].
 *
 * @param count Number of values to pop
 * @returns Tuple of [values array in original order, remainingStack]
 */
export function popNumbers(stack: OperandStack, count: number): [number[], OperandStack] {
  const values: number[] = [];
  const state = { currentStack: stack };

  for (let i = 0; i < count; i++) {
    const [val, newStack] = popNumber(state.currentStack);
    values.unshift(val); // Prepend to maintain original order
    state.currentStack = newStack;
  }

  return [values, state.currentStack];
}

/**
 * Push a value onto the operand stack.
 *
 * @returns New stack with value added
 */
export function pushValue(stack: OperandStack, value: OperandValue): OperandStack {
  return [...stack, value];
}

/**
 * Push multiple values onto the operand stack.
 *
 * @returns New stack with values added
 */
export function pushValues(stack: OperandStack, values: readonly OperandValue[]): OperandStack {
  return [...stack, ...values];
}

// =============================================================================
// Array Building Operations
// =============================================================================

/**
 * Finalize an array by collecting elements since the last array start marker.
 *
 * PDF arrays are delimited by '[' and ']'. When we encounter ']', we need to
 * collect all elements pushed since the '[' (represented as an empty array marker).
 *
 * @returns New stack with collected array pushed
 */
export function finalizeArray(stack: OperandStack): OperandStack {
  const items: (number | string)[] = [];
  const state = { currentStack: stack, foundStart: false };

  while (state.currentStack.length > 0) {
    const item = state.currentStack[state.currentStack.length - 1];
    state.currentStack = state.currentStack.slice(0, -1);

    // Empty array serves as the array start marker
    if (Array.isArray(item) && item.length === 0) {
      state.foundStart = true;
      break;
    }

    if (typeof item === "number" || typeof item === "string") {
      items.unshift(item);
    }
  }

  if (!state.foundStart) {
    console.warn("[PDF Parser] Array end found without matching start");
  }

  return [...state.currentStack, items];
}

// =============================================================================
// Color Component Collection
// =============================================================================

/**
 * Collect all numeric values from the operand stack as color components.
 * Stops when a non-numeric value (like a color space name) is encountered.
 *
 * Used by sc/SC/scn/SCN operators that infer color space from component count.
 *
 * @returns Tuple of [colorComponents, remainingStack]
 */
export function collectColorComponents(stack: OperandStack): [number[], OperandStack] {
  const components: number[] = [];
  const state = { currentStack: stack };

  while (state.currentStack.length > 0) {
    const top = state.currentStack[state.currentStack.length - 1];
    if (typeof top === "number") {
      components.unshift(top);
      state.currentStack = state.currentStack.slice(0, -1);
    } else {
      break;
    }
  }

  return [components, state.currentStack];
}
