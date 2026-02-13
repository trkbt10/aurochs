/**
 * @file VBA Interaction Built-in Functions (stubs)
 */

import type { VbaRuntimeValue } from "../../host/api";
import { toString } from "../value";
import type { VbaBuiltinFn } from "./index";
import { args, checkArgs } from "./common";

/**
 * Register interaction functions.
 */
export function registerInteractionFunctions(register: (name: string, fn: VbaBuiltinFn) => void): void {
  register("MsgBox", vbaMsgBox);
  register("InputBox", vbaInputBox);
}

function vbaMsgBox(a: readonly VbaRuntimeValue[]): number {
  checkArgs("MsgBox", a, args(1, 5));
  // Stub: always returns vbOK (1)
  // In a real implementation, this would show a dialog
  console.log(`[MsgBox] ${toString(a[0])}`);
  return 1; // vbOK
}

function vbaInputBox(a: readonly VbaRuntimeValue[]): string {
  checkArgs("InputBox", a, args(1, 8));
  // Stub: returns empty string (user cancelled)
  console.log(`[InputBox] ${toString(a[0])}`);
  return "";
}
