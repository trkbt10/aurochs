/**
 * @file VBA Execution Service
 *
 * Orchestrates VBA macro execution with Excel host adapter.
 */

import type { VbaProgramIr, VbaModule, VbaRuntimeValue } from "@aurochs-office/vba";
import { VbaRuntimeError, parseVbaProcedureBody } from "@aurochs-office/vba";
import { createVbaExecutionContext, createVbaRuntime } from "@aurochs-office/vba/runtime";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import type { CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import {
  createExcelAdapterState,
  createExcelHostAdapter,
  type ExcelAdapterState,
} from "@aurochs-office/xlsx/vba";
import type { ExecutionResult, CellMutation } from "./types";

// =============================================================================
// Execution Parameters
// =============================================================================

/**
 * Parameters for VBA procedure execution.
 */
export type ExecuteVbaProcedureParams = {
  /** Current workbook state */
  readonly workbook: XlsxWorkbook;
  /** VBA program containing the procedure */
  readonly program: VbaProgramIr;
  /** Module name containing the procedure */
  readonly moduleName: string;
  /** Procedure name to execute */
  readonly procedureName: string;
};

// =============================================================================
// Execution Service
// =============================================================================

/**
 * Execute a VBA procedure and collect cell mutations.
 *
 * @param params - Execution parameters
 * @returns Execution result with mutations or error
 *
 * @example
 * ```typescript
 * const result = executeVbaProcedure({
 *   workbook,
 *   program,
 *   moduleName: "Module1",
 *   procedureName: "UpdateCells",
 * });
 *
 * if (result.ok) {
 *   console.log("Mutations:", result.mutations);
 *   console.log("Output:", result.output);
 * } else {
 *   console.error("Error:", result.message);
 * }
 * ```
 */
export function executeVbaProcedure(params: ExecuteVbaProcedureParams): ExecutionResult {
  const { workbook, program, moduleName, procedureName } = params;
  const startTime = performance.now();
  const outputLog: string[] = [];

  try {
    // Find the module
    const module = program.modules.find(
      (m) => m.name.toLowerCase() === moduleName.toLowerCase()
    );
    if (!module) {
      return {
        ok: false,
        message: `Module not found: ${moduleName}`,
        errorType: "invalidProcedureCall",
      };
    }

    // Find the procedure
    const procedure = module.procedures.find(
      (p) => p.name.toLowerCase() === procedureName.toLowerCase()
    );
    if (!procedure) {
      return {
        ok: false,
        message: `Procedure not found: ${moduleName}.${procedureName}`,
        errorType: "invalidProcedureCall",
      };
    }

    // Create adapter state for tracking mutations
    const adapterState = createExcelAdapterState(workbook);

    // Create host adapter
    const hostApi = createExcelHostAdapter(adapterState);

    // Create execution context with host API
    const ctx = createVbaExecutionContext(hostApi);

    // Initialize all modules in the context
    for (const mod of program.modules) {
      ctx.initModule(mod);
    }

    // Create runtime
    const runtime = createVbaRuntime(ctx);

    // Register all procedures from all modules
    for (const mod of program.modules) {
      registerModuleProcedures(mod, runtime);
    }

    // Execute the procedure
    const returnValue = runtime.execute(moduleName, procedureName);

    // Collect mutations from adapter state
    const mutations = collectMutations(adapterState);

    const durationMs = performance.now() - startTime;

    return {
      ok: true,
      mutations,
      output: outputLog,
      returnValue,
      durationMs,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;

    if (error instanceof VbaRuntimeError) {
      return {
        ok: false,
        message: error.message,
        errorType: error.errorType,
        stackTrace: error.stack,
      };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Register all procedures from a module in the runtime.
 */
function registerModuleProcedures(
  module: VbaModule,
  runtime: ReturnType<typeof createVbaRuntime>
): void {
  for (const proc of module.procedures) {
    // Parse the procedure body from source
    // Note: In a complete implementation, we'd extract the procedure body from sourceCode
    // For now, we'll parse the entire procedure body
    const procBody = extractProcedureBody(module.sourceCode, proc.name);
    if (procBody) {
      const ast = parseVbaProcedureBody(procBody);
      runtime.registerProcedure(module.name, proc.name, ast);
    }
  }
}

/**
 * Extract procedure body from source code.
 *
 * This is a simplified extraction that looks for Sub/Function blocks.
 */
function extractProcedureBody(sourceCode: string, procedureName: string): string | undefined {
  const lines = sourceCode.split(/\r?\n/);
  const lowerProcName = procedureName.toLowerCase();

  let inProcedure = false;
  let braceDepth = 0;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();

    if (!inProcedure) {
      // Look for procedure start
      const subMatch = trimmed.match(/^(public\s+|private\s+)?sub\s+(\w+)/);
      const funcMatch = trimmed.match(/^(public\s+|private\s+)?function\s+(\w+)/);
      const propMatch = trimmed.match(/^(public\s+|private\s+)?property\s+(get|let|set)\s+(\w+)/);

      const matchedName = subMatch?.[2] || funcMatch?.[2] || propMatch?.[3];
      if (matchedName?.toLowerCase() === lowerProcName) {
        inProcedure = true;
        braceDepth = 1;
        continue; // Skip the declaration line
      }
    } else {
      // Check for nested blocks
      if (/^(if|for|do|while|select|with)\b/.test(trimmed) && !trimmed.includes("then") && !trimmed.includes("end")) {
        braceDepth++;
      } else if (/^(if\b.*\bthen\b)/.test(trimmed) && !/\bthen\s+\S/.test(trimmed)) {
        // Multi-line If (has Then at end but nothing after)
        braceDepth++;
      }

      // Check for end statements
      if (/^end\s+(sub|function|property|if|for|select|with)\b/.test(trimmed)) {
        braceDepth--;
        if (braceDepth === 0) {
          // End of procedure
          break;
        }
      }

      bodyLines.push(line);
    }
  }

  return bodyLines.length > 0 ? bodyLines.join("\n") : undefined;
}

/**
 * Collect cell mutations from adapter state.
 */
function collectMutations(state: ExcelAdapterState): CellMutation[] {
  const mutations: CellMutation[] = [];

  for (const [sheetIndex, sheetMutations] of state.mutations) {
    for (const [row, rowMutations] of sheetMutations) {
      for (const [col, value] of rowMutations) {
        mutations.push({
          sheetIndex,
          row,
          col,
          value,
        });
      }
    }
  }

  return mutations;
}
