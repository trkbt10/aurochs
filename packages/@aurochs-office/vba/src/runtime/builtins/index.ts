/**
 * @file VBA Built-in Functions Registry
 *
 * Central registry for all built-in VBA functions.
 */

import type { VbaRuntimeValue } from "../../host/api";
import { registerMathFunctions } from "./math";
import { registerStringFunctions } from "./string";
import { registerTypeFunctions } from "./type";
import { registerDateFunctions } from "./date";
import { registerArrayFunctions } from "./array";
import { registerInteractionFunctions } from "./interaction";
import { registerUtilityFunctions } from "./utility";

// =============================================================================
// Function Registry
// =============================================================================

/**
 * Built-in function signature.
 */
export type VbaBuiltinFn = (args: readonly VbaRuntimeValue[]) => VbaRuntimeValue;

/**
 * Registry of built-in functions.
 */
const registry = new Map<string, VbaBuiltinFn>();

/**
 * Register a built-in function.
 */
export function registerBuiltin(name: string, fn: VbaBuiltinFn): void {
  registry.set(name.toLowerCase(), fn);
}

/**
 * Get a built-in function by name.
 */
export function getBuiltinFunction(name: string): VbaBuiltinFn | undefined {
  return registry.get(name.toLowerCase());
}

/**
 * Check if a name is a built-in function.
 */
export function isBuiltinFunction(name: string): boolean {
  return registry.has(name.toLowerCase());
}

// =============================================================================
// Initialize Registry
// =============================================================================

registerMathFunctions(registerBuiltin);
registerStringFunctions(registerBuiltin);
registerTypeFunctions(registerBuiltin);
registerDateFunctions(registerBuiltin);
registerArrayFunctions(registerBuiltin);
registerInteractionFunctions(registerBuiltin);
registerUtilityFunctions(registerBuiltin);

// =============================================================================
// VBA Constants
// =============================================================================

/**
 * VBA built-in constants.
 */
export const vbaConstants: Record<string, VbaRuntimeValue> = {
  // Boolean
  true: true,
  false: false,

  // Special values
  nothing: null,
  empty: undefined,

  // Line terminators
  vbcrlf: "\r\n",
  vbcr: "\r",
  vblf: "\n",
  vbtab: "\t",
  vbnullchar: "\0",
  vbnullstring: "",

  // MsgBox buttons
  vbok: 0,
  vbokcancel: 1,
  vbabortretryignore: 2,
  vbyesnocancel: 3,
  vbyesno: 4,
  vbretrycancel: 5,

  // MsgBox icons
  vbcritical: 16,
  vbquestion: 32,
  vbexclamation: 48,
  vbinformation: 64,

  // MsgBox default buttons
  vbdefaultbutton1: 0,
  vbdefaultbutton2: 256,
  vbdefaultbutton3: 512,
  vbdefaultbutton4: 768,

  // MsgBox return values
  vbok_result: 1,
  vbcancel_result: 2,
  vbabort: 3,
  vbretry: 4,
  vbignore: 5,
  vbyes: 6,
  vbno: 7,

  // VarType constants
  vbempty: 0,
  vbnull: 1,
  vbinteger: 2,
  vblong: 3,
  vbsingle: 4,
  vbdouble: 5,
  vbcurrency: 6,
  vbdate: 7,
  vbstring: 8,
  vbobject: 9,
  vberror: 10,
  vbboolean: 11,
  vbvariant: 12,
  vbdataobject: 13,
  vbdecimal: 14,
  vbbyte: 17,
  vbarray: 8192,
};

/**
 * Get a VBA constant by name.
 */
export function getVbaConstant(name: string): VbaRuntimeValue | undefined {
  return vbaConstants[name.toLowerCase()];
}

/**
 * MsgBox return values.
 */
export const vbMsgBoxResult = {
  vbOK: 1,
  vbCancel: 2,
  vbAbort: 3,
  vbRetry: 4,
  vbIgnore: 5,
  vbYes: 6,
  vbNo: 7,
} as const;
