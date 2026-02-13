/**
 * @file VBA IR (Intermediate Representation) exports
 *
 * AST types for VBA statements and expressions.
 * These are used by the VBA runtime to execute parsed code.
 */

export type { VbaStatement } from "./statement";
export type { VbaExpression, VbaLiteralValue, VbaBinaryOp, VbaUnaryOp } from "./expression";
