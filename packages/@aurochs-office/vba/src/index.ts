/**
 * @file VBA module public exports
 *
 * Provides VBA macro support for Office documents:
 * - OVBA parser for vbaProject.bin (MS-OVBA)
 * - VBA source code parser
 * - VBA intermediate representation types
 * - VBA runtime (minimal subset)
 * - Host adapter interfaces
 *
 * @see MS-OVBA (Office VBA File Format)
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

// Core types
export type {
  VbaProgramIr,
  VbaProjectInfo,
  VbaModule,
  VbaModuleType,
  VbaProcedure,
  VbaProcedureType,
  VbaParameter,
  VbaTypeName,
  VbaReference,
} from "./types";

// Errors
export { VbaParseError, VbaNotImplementedError } from "./errors";

// Parser
export {
  parseVbaProject,
  parseVbaSource,
  parseVbaProcedureBody,
  parseVbaExpression,
} from "./parser";
export type { ParseVbaProjectOptions, ParseVbaProjectResult } from "./parser";

// IR types
export type {
  VbaStatement,
  VbaAssignmentStmt,
  VbaCallStmt,
  VbaIfStmt,
  VbaSelectCaseStmt,
  VbaForStmt,
  VbaForEachStmt,
  VbaDoLoopStmt,
  VbaWhileStmt,
  VbaDimStmt,
  VbaSetStmt,
  VbaExitStmt,
  VbaOnErrorStmt,
  VbaWithStmt,
  VbaRaiseEventStmt,
} from "./ir/statement";

export type {
  VbaExpression,
  VbaLiteralExpr,
  VbaLiteralValue,
  VbaIdentifierExpr,
  VbaMemberAccessExpr,
  VbaIndexExpr,
  VbaCallExpr,
  VbaBinaryExpr,
  VbaUnaryExpr,
  VbaNewExpr,
  VbaTypeOfExpr,
  VbaParenExpr,
  VbaBinaryOp,
  VbaUnaryOp,
} from "./ir/expression";

// Runtime
export { VbaRuntimeError, evaluateExpression, executeStatements, getBuiltinFunction, isBuiltinFunction, getVbaConstant, vbaConstants } from "./runtime";
export type {
  VbaScope,
  VbaExecutionContext,
  VbaCallStack,
  VbaRuntime,
  VbaErrorType,
  ScopeType,
  CallFrame,
  VbaRuntimeConfig,
  LValueResult,
} from "./runtime";

// Host API
export type { HostApi, HostObject, VbaRuntimeValue } from "./host/api";
