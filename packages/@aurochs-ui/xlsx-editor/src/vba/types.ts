/**
 * @file VBA Execution Types for xlsx-editor
 *
 * Types for VBA execution integration in the Excel editor.
 */

import type { VbaRuntimeValue } from "@aurochs-office/vba";
import type { CellValue } from "@aurochs-office/xlsx/domain/cell/types";

// =============================================================================
// Cell Mutation Types
// =============================================================================

/**
 * A single cell mutation from VBA execution.
 */
export type CellMutation = {
  /** Sheet index (0-based) */
  readonly sheetIndex: number;
  /** Row number (1-based, matching VBA convention) */
  readonly row: number;
  /** Column number (1-based, matching VBA convention) */
  readonly col: number;
  /** New cell value */
  readonly value: CellValue;
};

// =============================================================================
// Execution Result Types
// =============================================================================

/**
 * Successful VBA execution result.
 */
export type ExecutionSuccess = {
  readonly ok: true;
  /** Cell mutations from VBA execution */
  readonly mutations: readonly CellMutation[];
  /** Debug.Print output lines */
  readonly output: readonly string[];
  /** Return value (for Functions) */
  readonly returnValue: VbaRuntimeValue;
  /** Execution time in milliseconds */
  readonly durationMs: number;
};

/**
 * Failed VBA execution result.
 */
export type ExecutionFailure = {
  readonly ok: false;
  /** Error message */
  readonly message: string;
  /** VBA error type code */
  readonly errorType?: string;
  /** Stack trace if available */
  readonly stackTrace?: string;
};

/**
 * VBA execution result (success or failure).
 */
export type ExecutionResult = ExecutionSuccess | ExecutionFailure;

// =============================================================================
// Procedure Selection Types
// =============================================================================

/**
 * Procedure info for picker UI.
 */
export type ProcedureInfo = {
  readonly moduleName: string;
  readonly procedureName: string;
  readonly type: "sub" | "function" | "propertyGet" | "propertyLet" | "propertySet";
  readonly visibility: "public" | "private";
};

/**
 * Get all runnable procedures (public subs) from a VBA program.
 */
export function getRunnableProcedures(
  modules: readonly { readonly name: string; readonly procedures: readonly ProcedureInfo[] }[]
): readonly ProcedureInfo[] {
  const procedures: ProcedureInfo[] = [];

  for (const module of modules) {
    for (const proc of module.procedures) {
      // Only include public subs (no parameters) as runnable macros
      if (proc.visibility === "public" && proc.type === "sub") {
        procedures.push({
          moduleName: module.name,
          procedureName: proc.procedureName,
          type: proc.type,
          visibility: proc.visibility,
        });
      }
    }
  }

  return procedures;
}
