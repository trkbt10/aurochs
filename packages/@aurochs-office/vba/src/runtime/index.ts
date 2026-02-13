/**
 * @file VBA Runtime exports
 *
 * VBA core runtime for executing parsed VBA programs.
 */

// Value utilities
export {
  VbaRuntimeError,
  type VbaErrorType,
  isNothing,
  isEmpty,
  isHostObject,
  isArray,
  isDate,
  toBoolean,
  toNumber,
  toString,
  toInteger,
  toLong,
  vbaEquals,
  vbaCompare,
  vbaAdd,
  vbaSubtract,
  vbaMultiply,
  vbaDivide,
  vbaIntDivide,
  vbaMod,
  vbaPower,
  vbaNegate,
  vbaConcat,
  vbaAnd,
  vbaOr,
  vbaXor,
  vbaNot,
  vbaEqv,
  vbaImp,
  dateToOleAutomation,
  oleAutomationToDate,
} from "./value";

// Scope management
export {
  type VbaScope,
  type VbaExecutionContext,
  type VbaCallStack,
  type ScopeType,
  type CallFrame,
  createVbaScope,
  createVbaExecutionContext,
  createVbaCallStack,
} from "./scope";

// Expression evaluation
export {
  evaluateExpression,
  evaluateBinaryOp,
  evaluateLValue,
  assignLValue,
  type LValueResult,
} from "./evaluator";

// Statement execution
export {
  executeStatements,
  executeStatement,
  executeProcedure,
  type VbaRuntime,
  type VbaRuntimeConfig,
  createVbaRuntime,
} from "./executor";

// Built-in functions
export {
  getBuiltinFunction,
  isBuiltinFunction,
  getVbaConstant,
  vbaConstants,
  vbMsgBoxResult,
} from "./builtins/index";
