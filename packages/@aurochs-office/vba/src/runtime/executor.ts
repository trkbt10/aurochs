/**
 * @file VBA Statement Executor
 *
 * Executes VBA statements with side effects.
 */

import type { VbaRuntimeValue } from "../host/api";
import type { VbaExpression } from "../ir/expression";
import type {
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
} from "../ir/statement";
// VbaModule and VbaProcedure are used for procedure execution (future)
import type { VbaExecutionContext, VbaCallStack } from "./scope";
import { createVbaCallStack } from "./scope";
import { evaluateExpression, evaluateLValue, assignLValue } from "./evaluator";
import { toBoolean, toNumber, VbaRuntimeError, isHostObject } from "./value";
import { getBuiltinFunction } from "./builtins";

// =============================================================================
// Statement Executor
// =============================================================================

/**
 * Execute a list of statements.
 */
export function executeStatements(
  statements: readonly VbaStatement[],
  ctx: VbaExecutionContext
): void {
  for (const stmt of statements) {
    if (ctx.shouldExitProcedure()) {
      break;
    }
    executeStatement(stmt, ctx);
  }
}

/**
 * Execute a single statement.
 */
export function executeStatement(stmt: VbaStatement, ctx: VbaExecutionContext): void {
  switch (stmt.type) {
    case "assignment":
      executeAssignment(stmt, ctx);
      break;

    case "call":
      executeCall(stmt, ctx);
      break;

    case "if":
      executeIf(stmt, ctx);
      break;

    case "selectCase":
      executeSelectCase(stmt, ctx);
      break;

    case "for":
      executeFor(stmt, ctx);
      break;

    case "forEach":
      executeForEach(stmt, ctx);
      break;

    case "doLoop":
      executeDoLoop(stmt, ctx);
      break;

    case "while":
      executeWhile(stmt, ctx);
      break;

    case "dim":
      executeDim(stmt, ctx);
      break;

    case "set":
      executeSet(stmt, ctx);
      break;

    case "exit":
      executeExit(stmt, ctx);
      break;

    case "onError":
      executeOnError(stmt, ctx);
      break;

    case "with":
      executeWith(stmt, ctx);
      break;

    case "raiseEvent":
      executeRaiseEvent(stmt, ctx);
      break;

    default:
      throw new VbaRuntimeError(
        `Unknown statement type: ${(stmt as VbaStatement).type}`,
        "notImplemented"
      );
  }
}

// =============================================================================
// Assignment Execution
// =============================================================================

function executeAssignment(stmt: VbaAssignmentStmt, ctx: VbaExecutionContext): void {
  const value = evaluateExpression(stmt.value, ctx);
  const lvalue = evaluateLValue(stmt.target, ctx);
  assignLValue(lvalue, value, ctx);
}

// =============================================================================
// Call Execution
// =============================================================================

/**
 * Resolve the object for a member access expression.
 * Returns With object if object is null, otherwise evaluates the expression.
 */
function resolveMemberAccessObject(
  object: VbaExpression | null,
  ctx: VbaExecutionContext
): VbaRuntimeValue {
  if (object === null) {
    return ctx.getCurrentWithObject();
  }
  return evaluateExpression(object, ctx);
}

function executeCall(stmt: VbaCallStmt, ctx: VbaExecutionContext): void {
  const args = stmt.arguments.map((arg) => evaluateExpression(arg, ctx));

  // Check if target is an identifier
  if (stmt.target.type === "identifier") {
    const name = stmt.target.name;

    // Check for built-in function (called as sub)
    const builtin = getBuiltinFunction(name);
    if (builtin) {
      builtin(args);
      return;
    }

    // Check for host global object method
    const hostObj = ctx.resolveGlobalObject(name);
    if (hostObj && ctx.hostApi) {
      // Calling a global object as a sub might mean calling its default method
      ctx.hostApi.callMethod(hostObj, "", args);
      return;
    }

    // Would need to look up user-defined procedure here
    // For now, throw an error
    throw new VbaRuntimeError(`Sub not defined: ${name}`, "invalidProcedureCall");
  }

  // Member call: obj.Method args
  if (stmt.target.type === "memberAccess") {
    const obj = resolveMemberAccessObject(stmt.target.object, ctx);

    if (!isHostObject(obj)) {
      throw new VbaRuntimeError(`Object required: ${stmt.target.member}`, "objectRequired");
    }

    if (!ctx.hostApi) {
      throw new VbaRuntimeError("No host API available", "notImplemented");
    }

    ctx.hostApi.callMethod(obj, stmt.target.member, args);
    return;
  }

  throw new VbaRuntimeError("Invalid call target", "invalidProcedureCall");
}

// =============================================================================
// If Execution
// =============================================================================

function executeIf(stmt: VbaIfStmt, ctx: VbaExecutionContext): void {
  // Evaluate main condition
  if (toBoolean(evaluateExpression(stmt.condition, ctx))) {
    executeStatements(stmt.thenBlock, ctx);
    return;
  }

  // Check ElseIf blocks
  for (const elseIf of stmt.elseIfBlocks) {
    if (toBoolean(evaluateExpression(elseIf.condition, ctx))) {
      executeStatements(elseIf.block, ctx);
      return;
    }
  }

  // Execute Else block if present
  if (stmt.elseBlock) {
    executeStatements(stmt.elseBlock, ctx);
  }
}

// =============================================================================
// Select Case Execution
// =============================================================================

function executeSelectCase(stmt: VbaSelectCaseStmt, ctx: VbaExecutionContext): void {
  const testValue = evaluateExpression(stmt.testExpr, ctx);

  for (const caseClause of stmt.cases) {
    for (const condition of caseClause.conditions) {
      const caseValue = evaluateExpression(condition, ctx);
      // Simple equality check (VBA Select Case is more complex with ranges, etc.)
      if (testValue === caseValue || String(testValue) === String(caseValue)) {
        executeStatements(caseClause.block, ctx);
        return;
      }
    }
  }

  // Execute Case Else if present
  if (stmt.elseBlock) {
    executeStatements(stmt.elseBlock, ctx);
  }
}

// =============================================================================
// For Loop Execution
// =============================================================================

function executeFor(stmt: VbaForStmt, ctx: VbaExecutionContext): void {
  const scope = ctx.getCurrentScope();
  const startVal = toNumber(evaluateExpression(stmt.start, ctx));
  const endVal = toNumber(evaluateExpression(stmt.end, ctx));
  const stepVal = stmt.step ? toNumber(evaluateExpression(stmt.step, ctx)) : 1;

  if (stepVal === 0) {
    throw new VbaRuntimeError("Step cannot be zero", "invalidProcedureCall");
  }

  // Initialize counter
  scope.set(stmt.counter, startVal);

  // Loop
  const ascending = stepVal > 0;
  while (true) {
    const current = toNumber(scope.get(stmt.counter));

    // Check loop condition
    if (ascending) {
      if (current > endVal) {break;}
    } else {
      if (current < endVal) {break;}
    }

    // Execute body
    executeStatements(stmt.body, ctx);

    // Check exit flags
    if (ctx.shouldExitFor()) {
      ctx.clearExitFor();
      break;
    }

    // Increment counter
    scope.set(stmt.counter, current + stepVal);
  }
}

// =============================================================================
// For Each Loop Execution
// =============================================================================

function executeForEach(stmt: VbaForEachStmt, ctx: VbaExecutionContext): void {
  const scope = ctx.getCurrentScope();
  const collection = evaluateExpression(stmt.collection, ctx);

  if (!Array.isArray(collection)) {
    // For host objects, we would need to enumerate through host API
    throw new VbaRuntimeError("For Each requires an array or collection", "typeMismatch");
  }

  for (const element of collection) {
    scope.set(stmt.element, element);

    executeStatements(stmt.body, ctx);

    if (ctx.shouldExitFor()) {
      ctx.clearExitFor();
      break;
    }
  }
}

// =============================================================================
// Do Loop Execution
// =============================================================================

function executeDoLoop(stmt: VbaDoLoopStmt, ctx: VbaExecutionContext): void {
  const maxIterations = 1000000; // Safety limit
  const counter = { iterations: 0 };

  while (counter.iterations < maxIterations) {
    counter.iterations++;

    // Pre-condition check
    if (stmt.conditionPosition === "pre" && stmt.condition) {
      const condResult = toBoolean(evaluateExpression(stmt.condition, ctx));
      if (stmt.conditionType === "while" && !condResult) {break;}
      if (stmt.conditionType === "until" && condResult) {break;}
    }

    // Execute body
    executeStatements(stmt.body, ctx);

    // Check exit flags
    if (ctx.shouldExitDo()) {
      ctx.clearExitDo();
      break;
    }

    // Post-condition check
    if (stmt.conditionPosition === "post" && stmt.condition) {
      const condResult = toBoolean(evaluateExpression(stmt.condition, ctx));
      if (stmt.conditionType === "while" && !condResult) {break;}
      if (stmt.conditionType === "until" && condResult) {break;}
    }

    // Infinite loop (Do...Loop without condition)
    if (!stmt.condition) {
      // Continue (relies on Exit Do or error)
    }
  }

  if (counter.iterations >= maxIterations) {
    throw new VbaRuntimeError("Infinite loop detected", "overflow");
  }
}

// =============================================================================
// While Loop Execution (legacy While...Wend)
// =============================================================================

function executeWhile(stmt: VbaWhileStmt, ctx: VbaExecutionContext): void {
  const maxIterations = 1000000;
  const counter = { iterations: 0 };

  while (counter.iterations < maxIterations) {
    counter.iterations++;

    if (!toBoolean(evaluateExpression(stmt.condition, ctx))) {
      break;
    }

    executeStatements(stmt.body, ctx);

    if (ctx.shouldExitProcedure()) {
      break;
    }
  }

  if (counter.iterations >= maxIterations) {
    throw new VbaRuntimeError("Infinite loop detected", "overflow");
  }
}

// =============================================================================
// Dim Execution
// =============================================================================

type VbaDeclaration = VbaDimStmt["declarations"][number];

/**
 * Compute initial value for a variable declaration.
 */
function computeInitialValue(decl: VbaDeclaration): VbaRuntimeValue {
  if (!decl.isArray || !decl.arrayBounds) {
    return undefined;
  }
  // Create array with specified dimensions
  // For simplicity, only support 1D arrays
  if (decl.arrayBounds.length === 1) {
    const size = decl.arrayBounds[0].upper - decl.arrayBounds[0].lower + 1;
    return new Array(size).fill(undefined) as VbaRuntimeValue[];
  }
  // Multi-dimensional arrays not fully supported
  return [];
}

function executeDim(stmt: VbaDimStmt, ctx: VbaExecutionContext): void {
  const scope = ctx.getCurrentScope();

  for (const decl of stmt.declarations) {
    const initialValue = computeInitialValue(decl);
    scope.declare(decl.name, initialValue);
  }
}

// =============================================================================
// Set Execution
// =============================================================================

function executeSet(stmt: VbaSetStmt, ctx: VbaExecutionContext): void {
  const value = evaluateExpression(stmt.value, ctx);
  const lvalue = evaluateLValue(stmt.target, ctx);
  assignLValue(lvalue, value, ctx);
}

// =============================================================================
// Exit Execution
// =============================================================================

function executeExit(stmt: VbaExitStmt, ctx: VbaExecutionContext): void {
  switch (stmt.exitType) {
    case "sub":
      ctx.setExitSub();
      break;
    case "function":
      ctx.setExitFunction();
      break;
    case "for":
      ctx.setExitFor();
      break;
    case "do":
      ctx.setExitDo();
      break;
    case "property":
      ctx.setExitProperty();
      break;
  }
}

// =============================================================================
// On Error Execution
// =============================================================================

function executeOnError(stmt: VbaOnErrorStmt, _ctx: VbaExecutionContext): void {
  // Error handling is complex and requires runtime support
  // For now, just log and continue
  // TODO: Implement error handling
  if (stmt.handler === "resume" || stmt.handler === "resumeNext") {
    // Resume Next: ignore errors
  } else if (stmt.handler === "goto0") {
    // Disable error handling
  } else if (typeof stmt.handler === "object" && "label" in stmt.handler) {
    // On Error GoTo label
  }
}

// =============================================================================
// With Execution
// =============================================================================

function executeWith(stmt: VbaWithStmt, ctx: VbaExecutionContext): void {
  const obj = evaluateExpression(stmt.object, ctx);
  ctx.pushWithObject(obj);

  try {
    executeStatements(stmt.body, ctx);
  } finally {
    ctx.popWithObject();
  }
}

// =============================================================================
// RaiseEvent Execution
// =============================================================================

function executeRaiseEvent(stmt: VbaRaiseEventStmt, _ctx: VbaExecutionContext): void {
  // Event raising would require event handler registration
  // For now, this is not implemented
  throw new VbaRuntimeError(`RaiseEvent is not implemented: ${stmt.eventName}`, "notImplemented");
}

// =============================================================================
// Procedure Execution
// =============================================================================

type ExecuteProcedureParams = {
  readonly moduleName: string;
  readonly procedureName: string;
  readonly args: readonly VbaRuntimeValue[];
  readonly ctx: VbaExecutionContext;
  readonly callStack: VbaCallStack;
  readonly procedureAsts: Map<string, readonly VbaStatement[]>;
};

/**
 * Execute a procedure by name.
 */
export function executeProcedure(params: ExecuteProcedureParams): VbaRuntimeValue {
  const { moduleName, procedureName, ctx, callStack, procedureAsts } = params;
  const key = `${moduleName.toLowerCase()}.${procedureName.toLowerCase()}`;
  const ast = procedureAsts.get(key);

  if (!ast) {
    throw new VbaRuntimeError(`Procedure not found: ${moduleName}.${procedureName}`, "invalidProcedureCall");
  }

  // Push call frame
  callStack.push({ moduleName, procedureName });

  // Enter procedure scope
  const _scope = ctx.enterProcedure(moduleName, procedureName);

  try {
    // Bind arguments (would need parameter info)
    // For now, assume positional binding
    // TODO: Implement proper parameter binding

    // Execute procedure body
    executeStatements(ast, ctx);

    // Get return value (for functions)
    return ctx.exitProcedure();
  } finally {
    callStack.pop();
  }
}

// =============================================================================
// VBA Runtime
// =============================================================================

/**
 * VBA runtime configuration.
 */
export type VbaRuntimeConfig = {
  /** Maximum call stack depth */
  readonly maxCallDepth?: number;
  /** Maximum loop iterations */
  readonly maxIterations?: number;
};

/**
 * VBA Runtime interface.
 */
export type VbaRuntime = {
  /** Register a procedure's AST for execution */
  readonly registerProcedure: (
    moduleName: string,
    procedureName: string,
    ast: readonly VbaStatement[]
  ) => void;
  /** Execute a procedure */
  readonly execute: (
    moduleName: string,
    procedureName: string,
    args?: readonly VbaRuntimeValue[]
  ) => VbaRuntimeValue;
  /** Get the execution context */
  readonly getContext: () => VbaExecutionContext;
  /** Get the call stack */
  readonly getCallStack: () => VbaCallStack;
};

/**
 * Create a VBA Runtime for executing programs.
 */
export function createVbaRuntime(ctx: VbaExecutionContext, config?: VbaRuntimeConfig): VbaRuntime {
  const callStack = createVbaCallStack(config?.maxCallDepth ?? 1000);
  const procedureAsts = new Map<string, readonly VbaStatement[]>();

  return {
    registerProcedure(
      moduleName: string,
      procedureName: string,
      ast: readonly VbaStatement[]
    ): void {
      const key = `${moduleName.toLowerCase()}.${procedureName.toLowerCase()}`;
      procedureAsts.set(key, ast);
    },

    execute(
      moduleName: string,
      procedureName: string,
      args: readonly VbaRuntimeValue[] = []
    ): VbaRuntimeValue {
      return executeProcedure({
        moduleName,
        procedureName,
        args,
        ctx,
        callStack,
        procedureAsts,
      });
    },

    getContext(): VbaExecutionContext {
      return ctx;
    },

    getCallStack(): VbaCallStack {
      return callStack;
    },
  };
}
