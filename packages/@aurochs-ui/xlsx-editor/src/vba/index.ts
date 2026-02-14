/**
 * @file VBA Integration Exports
 *
 * VBA execution and editing support for xlsx-editor.
 */

export type {
  CellMutation,
  ExecutionResult,
  ExecutionSuccess,
  ExecutionFailure,
  ProcedureInfo,
} from "./types";
export { getRunnableProcedures } from "./types";

export { loadVbaProgramFromPackage, hasVbaProject } from "./program-loader";

export { executeVbaProcedure, type ExecuteVbaProcedureParams } from "./execution-service";

export { applyMutations } from "./mutation-applicator";

export {
  createEmptyVbaProgram,
  createStandardModule,
  addModuleToProgram,
} from "./program-factory";
