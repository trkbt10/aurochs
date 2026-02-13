/**
 * @file VBA Statement AST types
 *
 * Represents parsed VBA statements for runtime execution.
 */

import type { VbaExpression } from "./expression";

// =============================================================================
// Statement Union
// =============================================================================

/**
 * VBA statement (discriminated union).
 */
export type VbaStatement =
  | VbaAssignmentStmt
  | VbaCallStmt
  | VbaIfStmt
  | VbaSelectCaseStmt
  | VbaForStmt
  | VbaForEachStmt
  | VbaDoLoopStmt
  | VbaWhileStmt
  | VbaDimStmt
  | VbaSetStmt
  | VbaExitStmt
  | VbaOnErrorStmt
  | VbaWithStmt
  | VbaRaiseEventStmt;

// =============================================================================
// Statement Types
// =============================================================================

/**
 * Assignment: target = value
 */
export type VbaAssignmentStmt = {
  readonly type: "assignment";
  readonly target: VbaExpression;
  readonly value: VbaExpression;
};

/**
 * Procedure call: Call target(args) or target args
 */
export type VbaCallStmt = {
  readonly type: "call";
  readonly target: VbaExpression;
  readonly arguments: readonly VbaExpression[];
};

/**
 * If...Then...ElseIf...Else...End If
 */
export type VbaIfStmt = {
  readonly type: "if";
  readonly condition: VbaExpression;
  readonly thenBlock: readonly VbaStatement[];
  readonly elseIfBlocks: readonly {
    readonly condition: VbaExpression;
    readonly block: readonly VbaStatement[];
  }[];
  readonly elseBlock: readonly VbaStatement[] | null;
};

/**
 * Select Case...Case...End Select
 */
export type VbaSelectCaseStmt = {
  readonly type: "selectCase";
  readonly testExpr: VbaExpression;
  readonly cases: readonly {
    readonly conditions: readonly VbaExpression[];
    readonly block: readonly VbaStatement[];
  }[];
  readonly elseBlock: readonly VbaStatement[] | null;
};

/**
 * For...To...Step...Next
 */
export type VbaForStmt = {
  readonly type: "for";
  readonly counter: string;
  readonly start: VbaExpression;
  readonly end: VbaExpression;
  readonly step: VbaExpression | null;
  readonly body: readonly VbaStatement[];
};

/**
 * For Each...In...Next
 */
export type VbaForEachStmt = {
  readonly type: "forEach";
  readonly element: string;
  readonly collection: VbaExpression;
  readonly body: readonly VbaStatement[];
};

/**
 * Do...Loop (While/Until variants)
 */
export type VbaDoLoopStmt = {
  readonly type: "doLoop";
  readonly condition: VbaExpression | null;
  readonly conditionType: "while" | "until" | null;
  readonly conditionPosition: "pre" | "post";
  readonly body: readonly VbaStatement[];
};

/**
 * While...Wend (legacy)
 */
export type VbaWhileStmt = {
  readonly type: "while";
  readonly condition: VbaExpression;
  readonly body: readonly VbaStatement[];
};

/**
 * Dim statement (variable declaration)
 */
export type VbaDimStmt = {
  readonly type: "dim";
  readonly declarations: readonly {
    readonly name: string;
    readonly typeName: string | null;
    readonly isArray: boolean;
    readonly arrayBounds: readonly { lower: number; upper: number }[] | null;
  }[];
};

/**
 * Set statement (object assignment)
 */
export type VbaSetStmt = {
  readonly type: "set";
  readonly target: VbaExpression;
  readonly value: VbaExpression;
};

/**
 * Exit statement (Exit Sub, Exit Function, Exit For, etc.)
 */
export type VbaExitStmt = {
  readonly type: "exit";
  readonly exitType: "sub" | "function" | "for" | "do" | "property";
};

/**
 * On Error statement
 */
export type VbaOnErrorStmt = {
  readonly type: "onError";
  readonly handler: "resume" | "resumeNext" | "goto0" | { label: string };
};

/**
 * With statement
 */
export type VbaWithStmt = {
  readonly type: "with";
  readonly object: VbaExpression;
  readonly body: readonly VbaStatement[];
};

/**
 * RaiseEvent statement
 */
export type VbaRaiseEventStmt = {
  readonly type: "raiseEvent";
  readonly eventName: string;
  readonly arguments: readonly VbaExpression[];
};
