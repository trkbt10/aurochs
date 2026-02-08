/**
 * @file Formula AST Types
 *
 * Defines the AST node shapes produced by the formula parser and consumed by the evaluator.
 * This is a minimal subset to represent the formula features supported in this project.
 */

import type { CellAddress, CellRange } from "../domain/cell/address";
import type { FormulaScalar } from "./types";

export type LiteralNode = {
  readonly type: "Literal";
  readonly value: FormulaScalar;
};

export type ReferenceNode = {
  readonly type: "Reference";
  readonly reference: CellAddress;
  readonly sheetName?: string;
};

export type RangeNode = {
  readonly type: "Range";
  readonly range: CellRange;
};

export type NameNode = {
  readonly type: "Name";
  readonly name: string;
};

export type StructuredTableReferenceNode = {
  readonly type: "StructuredTableReference";
  readonly tableName: string;
  /**
   * Special item selector (e.g. `#All`, `#Headers`, `#Data`, `#Totals`, `#This Row`).
   *
   * When present with no column names, the reference targets the whole table section.
   * When present with column names, the reference targets the intersection of the section and column(s).
   */
  readonly item?: string;
  /** Start column name for column/range selection (e.g. `Field 2`). */
  readonly startColumnName?: string;
  /** End column name for column/range selection (e.g. `Field 3`). */
  readonly endColumnName?: string;
};

export type UnaryOperator = "+" | "-";
export type UnaryNode = {
  readonly type: "Unary";
  readonly operator: UnaryOperator;
  readonly argument: FormulaAstNode;
};

export type BinaryOperator = "+" | "-" | "*" | "/" | "^" | "&";
export type BinaryNode = {
  readonly type: "Binary";
  readonly operator: BinaryOperator;
  readonly left: FormulaAstNode;
  readonly right: FormulaAstNode;
};

export type ComparatorOperator = "=" | "<>" | ">" | "<" | ">=" | "<=";
export type CompareNode = {
  readonly type: "Compare";
  readonly operator: ComparatorOperator;
  readonly left: FormulaAstNode;
  readonly right: FormulaAstNode;
};

export type FunctionNode = {
  readonly type: "Function";
  readonly name: string;
  readonly args: readonly FormulaAstNode[];
};

export type ArrayNode = {
  readonly type: "Array";
  readonly elements: readonly (readonly FormulaAstNode[])[];
};

export type FormulaAstNode =
  | LiteralNode
  | ReferenceNode
  | RangeNode
  | NameNode
  | StructuredTableReferenceNode
  | UnaryNode
  | BinaryNode
  | CompareNode
  | FunctionNode
  | ArrayNode;
