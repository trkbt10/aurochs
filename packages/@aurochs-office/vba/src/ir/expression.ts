/**
 * @file VBA Expression AST types
 *
 * Represents parsed VBA expressions for runtime evaluation.
 */

// =============================================================================
// Expression Union
// =============================================================================

/**
 * VBA expression (discriminated union).
 */
export type VbaExpression =
  | VbaLiteralExpr
  | VbaIdentifierExpr
  | VbaMemberAccessExpr
  | VbaIndexExpr
  | VbaCallExpr
  | VbaBinaryExpr
  | VbaUnaryExpr
  | VbaNewExpr
  | VbaTypeOfExpr
  | VbaParenExpr;

// =============================================================================
// Expression Types
// =============================================================================

/**
 * Literal value: 42, "hello", True, #12/31/2024#
 */
export type VbaLiteralExpr = {
  readonly type: "literal";
  readonly value: VbaLiteralValue;
};

/**
 * VBA literal values.
 */
export type VbaLiteralValue =
  | { readonly kind: "integer"; readonly value: number }
  | { readonly kind: "long"; readonly value: number }
  | { readonly kind: "double"; readonly value: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "date"; readonly value: Date }
  | { readonly kind: "nothing" }
  | { readonly kind: "empty" }
  | { readonly kind: "null" };

/**
 * Identifier: variableName, functionName
 */
export type VbaIdentifierExpr = {
  readonly type: "identifier";
  readonly name: string;
};

/**
 * Member access: object.member or .member (in With block)
 */
export type VbaMemberAccessExpr = {
  readonly type: "memberAccess";
  /** null indicates implicit With object */
  readonly object: VbaExpression | null;
  readonly member: string;
};

/**
 * Index/call: array(index) or function(args)
 */
export type VbaIndexExpr = {
  readonly type: "index";
  readonly target: VbaExpression;
  readonly indices: readonly VbaExpression[];
};

/**
 * Function/method call with explicit arguments
 */
export type VbaCallExpr = {
  readonly type: "call";
  readonly target: VbaExpression;
  readonly arguments: readonly VbaExpression[];
};

/**
 * Binary operation: left op right
 */
export type VbaBinaryExpr = {
  readonly type: "binary";
  readonly operator: VbaBinaryOp;
  readonly left: VbaExpression;
  readonly right: VbaExpression;
};

/**
 * VBA binary operators.
 */
export type VbaBinaryOp =
  // Arithmetic
  | "+"
  | "-"
  | "*"
  | "/"
  | "\\"
  | "Mod"
  | "^"
  // Comparison
  | "="
  | "<>"
  | "<"
  | ">"
  | "<="
  | ">="
  // Logical
  | "And"
  | "Or"
  | "Xor"
  | "Eqv"
  | "Imp"
  // String
  | "&"
  // Pattern matching
  | "Like"
  // Object comparison
  | "Is";

/**
 * Unary operation: op operand
 */
export type VbaUnaryExpr = {
  readonly type: "unary";
  readonly operator: VbaUnaryOp;
  readonly operand: VbaExpression;
};

/**
 * VBA unary operators.
 */
export type VbaUnaryOp = "-" | "Not";

/**
 * New expression: New ClassName
 */
export type VbaNewExpr = {
  readonly type: "new";
  readonly className: string;
};

/**
 * TypeOf expression: TypeOf obj Is ClassName
 */
export type VbaTypeOfExpr = {
  readonly type: "typeOf";
  readonly object: VbaExpression;
  readonly typeName: string;
};

/**
 * Parenthesized expression: (expr)
 */
export type VbaParenExpr = {
  readonly type: "paren";
  readonly expression: VbaExpression;
};
