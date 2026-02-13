/**
 * @file VBA Expression Evaluator
 *
 * Evaluates VBA expressions to runtime values.
 */

import type { VbaRuntimeValue, HostObject } from "../host/api";
import type {
  VbaExpression,
  VbaLiteralExpr,
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
} from "../ir/expression";
import type { VbaExecutionContext } from "./scope";
import {
  toNumber,
  toString,
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
  vbaEquals,
  vbaCompare,
  VbaRuntimeError,
  isHostObject,
} from "./value";
import { getBuiltinFunction, getVbaConstant } from "./builtins";

// =============================================================================
// Expression Evaluator
// =============================================================================

/**
 * Evaluate a VBA expression in the given context.
 */
export function evaluateExpression(expr: VbaExpression, ctx: VbaExecutionContext): VbaRuntimeValue {
  switch (expr.type) {
    case "literal":
      return evaluateLiteral(expr);

    case "identifier":
      return evaluateIdentifier(expr, ctx);

    case "memberAccess":
      return evaluateMemberAccess(expr, ctx);

    case "index":
      return evaluateIndex(expr, ctx);

    case "call":
      return evaluateCall(expr, ctx);

    case "binary":
      return evaluateBinary(expr, ctx);

    case "unary":
      return evaluateUnary(expr, ctx);

    case "new":
      return evaluateNew(expr, ctx);

    case "typeOf":
      return evaluateTypeOf(expr, ctx);

    case "paren":
      return evaluateParen(expr, ctx);

    default:
      throw new VbaRuntimeError(`Unknown expression type: ${(expr as VbaExpression).type}`, "notImplemented");
  }
}

// =============================================================================
// Literal Evaluation
// =============================================================================

function evaluateLiteral(expr: VbaLiteralExpr): VbaRuntimeValue {
  const { value } = expr;

  switch (value.kind) {
    case "integer":
    case "long":
    case "double":
      return value.value;

    case "string":
      return value.value;

    case "boolean":
      return value.value;

    case "date":
      return value.value;

    case "nothing":
      return null;

    case "empty":
      return undefined;

    case "null":
      // VBA Null is a special variant state, we map to null
      return null;

    default:
      throw new VbaRuntimeError(`Unknown literal kind`, "notImplemented");
  }
}

// =============================================================================
// Identifier Evaluation
// =============================================================================

function evaluateIdentifier(expr: VbaIdentifierExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const name = expr.name;
  const lowerName = name.toLowerCase();

  // Check for VBA constants (True, False, Nothing, vbCrLf, etc.)
  const constant = getVbaConstant(lowerName);
  if (constant !== undefined) {
    return constant;
  }

  // Check current scope
  const scope = ctx.getCurrentScope();
  const value = scope.get(name);
  if (value !== undefined) {
    return value;
  }

  // Check for global object from host API
  const hostObj = ctx.resolveGlobalObject(name);
  if (hostObj !== undefined) {
    return hostObj;
  }

  // VBA: undeclared variables return Empty
  return undefined;
}

// =============================================================================
// Member Access Evaluation
// =============================================================================

function resolveObjectOrWith(
  expr: VbaMemberAccessExpr,
  ctx: VbaExecutionContext
): VbaRuntimeValue {
  if (expr.object === null) {
    if (!ctx.hasWithObject()) {
      throw new VbaRuntimeError("Invalid use of object reference", "objectRequired");
    }
    return ctx.getCurrentWithObject();
  }
  return evaluateExpression(expr.object, ctx);
}

function evaluateMemberAccess(expr: VbaMemberAccessExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const obj = resolveObjectOrWith(expr, ctx);

  if (!isHostObject(obj)) {
    throw new VbaRuntimeError(`Object required: cannot access member "${expr.member}"`, "objectRequired");
  }

  if (!ctx.hostApi) {
    throw new VbaRuntimeError("No host API available", "notImplemented");
  }

  return ctx.hostApi.getProperty(obj, expr.member);
}

// =============================================================================
// Index Evaluation
// =============================================================================

function evaluateIndex(expr: VbaIndexExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const target = evaluateExpression(expr.target, ctx);
  const indices = expr.indices.map((idx) => evaluateExpression(idx, ctx));

  // Array access
  if (Array.isArray(target)) {
    if (indices.length !== 1) {
      throw new VbaRuntimeError("Array index must be single value", "subscriptOutOfRange");
    }
    const idx = Math.floor(toNumber(indices[0]));
    if (idx < 0 || idx >= target.length) {
      throw new VbaRuntimeError(`Subscript out of range: ${idx}`, "subscriptOutOfRange");
    }
    return target[idx];
  }

  // Host object indexed access
  if (isHostObject(target)) {
    if (!ctx.hostApi?.getIndexed) {
      throw new VbaRuntimeError("Host does not support indexed access", "notImplemented");
    }
    return ctx.hostApi.getIndexed(target, indices);
  }

  // String character access (Mid-like behavior)
  if (typeof target === "string") {
    if (indices.length !== 1) {
      throw new VbaRuntimeError("String index must be single value", "subscriptOutOfRange");
    }
    const idx = Math.floor(toNumber(indices[0])) - 1; // VBA is 1-based for strings
    if (idx < 0 || idx >= target.length) {
      return "";
    }
    return target[idx];
  }

  throw new VbaRuntimeError("Object does not support indexing", "typeMismatch");
}

// =============================================================================
// Call Evaluation
// =============================================================================

function evaluateCall(expr: VbaCallExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const args = expr.arguments.map((arg) => evaluateExpression(arg, ctx));

  // Check if target is an identifier (function name)
  if (expr.target.type === "identifier") {
    const funcName = expr.target.name;

    // Check for built-in function
    const builtin = getBuiltinFunction(funcName);
    if (builtin) {
      return builtin(args);
    }

    // Check for user-defined procedure
    // This would be handled by the executor, not here
    // For now, we check if it's a host global object method
    const hostObj = ctx.resolveGlobalObject(funcName);
    if (hostObj && ctx.hostApi) {
      // It's a global object, but we're calling it like a function
      // This might be a parameterless default property or method
      if (args.length === 0) {
        return hostObj;
      }
      // Try to call as indexed access on default property
      if (ctx.hostApi.getIndexed) {
        return ctx.hostApi.getIndexed(hostObj, args);
      }
    }

    // Unknown function - might be a user procedure (handled elsewhere)
    throw new VbaRuntimeError(`Sub or Function not defined: ${funcName}`, "invalidProcedureCall");
  }

  // Member call: obj.Method(args)
  if (expr.target.type === "memberAccess") {
    const memberExpr = expr.target as VbaMemberAccessExpr;
    const obj = resolveObjectOrWith(memberExpr, ctx);

    if (!isHostObject(obj)) {
      throw new VbaRuntimeError(`Object required for method call: ${memberExpr.member}`, "objectRequired");
    }

    if (!ctx.hostApi) {
      throw new VbaRuntimeError("No host API available", "notImplemented");
    }

    return ctx.hostApi.callMethod(obj, memberExpr.member, args);
  }

  throw new VbaRuntimeError("Invalid call target", "invalidProcedureCall");
}

// =============================================================================
// Binary Expression Evaluation
// =============================================================================

function evaluateBinary(expr: VbaBinaryExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const left = evaluateExpression(expr.left, ctx);
  const right = evaluateExpression(expr.right, ctx);

  return evaluateBinaryOp(expr.operator, left, right);
}

/**
 * Evaluate a binary operation.
 */
export function evaluateBinaryOp(
  op: VbaBinaryOp,
  left: VbaRuntimeValue,
  right: VbaRuntimeValue
): VbaRuntimeValue {
  switch (op) {
    // Arithmetic
    case "+":
      return vbaAdd(left, right);
    case "-":
      return vbaSubtract(left, right);
    case "*":
      return vbaMultiply(left, right);
    case "/":
      return vbaDivide(left, right);
    case "\\":
      return vbaIntDivide(left, right);
    case "Mod":
      return vbaMod(left, right);
    case "^":
      return vbaPower(left, right);

    // String concatenation
    case "&":
      return vbaConcat(left, right);

    // Comparison
    case "=":
      return vbaEquals(left, right);
    case "<>":
      return !vbaEquals(left, right);
    case "<":
      return vbaCompare(left, right) < 0;
    case ">":
      return vbaCompare(left, right) > 0;
    case "<=":
      return vbaCompare(left, right) <= 0;
    case ">=":
      return vbaCompare(left, right) >= 0;

    // Logical
    case "And":
      return vbaAnd(left, right);
    case "Or":
      return vbaOr(left, right);
    case "Xor":
      return vbaXor(left, right);
    case "Eqv":
      return vbaEqv(left, right);
    case "Imp":
      return vbaImp(left, right);

    // Pattern matching
    case "Like":
      return evaluateLike(left, right);

    // Object comparison
    case "Is":
      return left === right;

    default:
      throw new VbaRuntimeError(`Unknown binary operator: ${op}`, "notImplemented");
  }
}

/**
 * Convert a single Like pattern character to regex.
 */
function convertLikeChar(
  pattern: string,
  pos: number
): { regex: string; consumed: number } {
  const c = pattern[pos];
  switch (c) {
    case "?":
      return { regex: ".", consumed: 1 };
    case "*":
      return { regex: ".*", consumed: 1 };
    case "#":
      return { regex: "\\d", consumed: 1 };
    case "[": {
      const closeIdx = pattern.indexOf("]", pos + 1);
      if (closeIdx === -1) {
        return { regex: "\\[", consumed: 1 };
      }
      const charList = pattern.substring(pos + 1, closeIdx);
      const regexPart = buildCharClassRegex(charList);
      return { regex: regexPart, consumed: closeIdx - pos + 1 };
    }
    default:
      return { regex: escapeRegex(c), consumed: 1 };
  }
}

/**
 * Evaluate Like operator (pattern matching).
 */
function evaluateLike(left: VbaRuntimeValue, right: VbaRuntimeValue): boolean {
  const str = toString(left);
  const pattern = toString(right);

  // Convert VBA Like pattern to regex
  // ? = any single char, * = any chars, # = any digit
  // [charlist] = any char in list, [!charlist] = any char not in list
  const parts: string[] = ["^"];
  const cursor = { pos: 0 };

  while (cursor.pos < pattern.length) {
    const result = convertLikeChar(pattern, cursor.pos);
    parts.push(result.regex);
    cursor.pos += result.consumed;
  }

  parts.push("$");
  const regex = parts.join("");

  try {
    return new RegExp(regex, "i").test(str);
  } catch (err: unknown) {
    // Invalid regex pattern - return false for pattern match
    // This can happen with malformed VBA Like patterns
    if (err instanceof SyntaxError) {
      return false;
    }
    return false;
  }
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build regex character class from VBA charlist.
 */
function buildCharClassRegex(charList: string): string {
  if (charList.startsWith("!")) {
    return "[^" + escapeRegex(charList.substring(1)) + "]";
  }
  return "[" + escapeRegex(charList) + "]";
}

// =============================================================================
// Unary Expression Evaluation
// =============================================================================

function evaluateUnary(expr: VbaUnaryExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const operand = evaluateExpression(expr.operand, ctx);

  switch (expr.operator) {
    case "-":
      return vbaNegate(operand);
    case "Not":
      return vbaNot(operand);
    default:
      throw new VbaRuntimeError(`Unknown unary operator: ${expr.operator}`, "notImplemented");
  }
}

// =============================================================================
// New Expression Evaluation
// =============================================================================

function evaluateNew(expr: VbaNewExpr, _ctx: VbaExecutionContext): VbaRuntimeValue {
  // Creating new objects would require host support
  // For now, this is not implemented
  throw new VbaRuntimeError(`New ${expr.className} is not implemented`, "notImplemented");
}

// =============================================================================
// TypeOf Expression Evaluation
// =============================================================================

function evaluateTypeOf(expr: VbaTypeOfExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  const obj = evaluateExpression(expr.object, ctx);

  if (!isHostObject(obj)) {
    return false;
  }

  // Compare host type name (case-insensitive)
  return obj.hostType.toLowerCase() === expr.typeName.toLowerCase();
}

// =============================================================================
// Parenthesized Expression Evaluation
// =============================================================================

function evaluateParen(expr: VbaParenExpr, ctx: VbaExecutionContext): VbaRuntimeValue {
  return evaluateExpression(expr.expression, ctx);
}

// =============================================================================
// LValue Evaluation (for assignment targets)
// =============================================================================

/**
 * Result of evaluating an lvalue expression.
 */
export type LValueResult =
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "property"; readonly object: HostObject; readonly property: string }
  | { readonly kind: "indexed"; readonly object: HostObject; readonly indices: VbaRuntimeValue[] }
  | { readonly kind: "arrayElement"; readonly array: VbaRuntimeValue[]; readonly index: number };

/**
 * Evaluate an expression as an lvalue (assignment target).
 */
export function evaluateLValue(expr: VbaExpression, ctx: VbaExecutionContext): LValueResult {
  switch (expr.type) {
    case "identifier":
      return { kind: "variable", name: expr.name };

    case "memberAccess": {
      const obj = resolveObjectOrWith(expr, ctx);

      if (!isHostObject(obj)) {
        throw new VbaRuntimeError("Object required for property assignment", "objectRequired");
      }

      return { kind: "property", object: obj, property: expr.member };
    }

    case "index": {
      const target = evaluateExpression(expr.target, ctx);
      const indices = expr.indices.map((idx) => evaluateExpression(idx, ctx));

      if (Array.isArray(target)) {
        if (indices.length !== 1) {
          throw new VbaRuntimeError("Array index must be single value", "subscriptOutOfRange");
        }
        const idx = Math.floor(toNumber(indices[0]));
        if (idx < 0 || idx >= target.length) {
          throw new VbaRuntimeError(`Subscript out of range: ${idx}`, "subscriptOutOfRange");
        }
        return { kind: "arrayElement", array: target, index: idx };
      }

      if (isHostObject(target)) {
        return { kind: "indexed", object: target, indices };
      }

      throw new VbaRuntimeError("Cannot assign to this expression", "typeMismatch");
    }

    default:
      throw new VbaRuntimeError("Invalid assignment target", "invalidProcedureCall");
  }
}

/**
 * Assign a value to an lvalue.
 */
export function assignLValue(
  lvalue: LValueResult,
  value: VbaRuntimeValue,
  ctx: VbaExecutionContext
): void {
  switch (lvalue.kind) {
    case "variable":
      ctx.getCurrentScope().set(lvalue.name, value);
      break;

    case "property":
      if (!ctx.hostApi) {
        throw new VbaRuntimeError("No host API available", "notImplemented");
      }
      ctx.hostApi.setProperty(lvalue.object, lvalue.property, value);
      break;

    case "indexed":
      if (!ctx.hostApi?.setIndexed) {
        throw new VbaRuntimeError("Host does not support indexed assignment", "notImplemented");
      }
      ctx.hostApi.setIndexed(lvalue.object, lvalue.indices, value);
      break;

    case "arrayElement":
      lvalue.array[lvalue.index] = value;
      break;
  }
}
