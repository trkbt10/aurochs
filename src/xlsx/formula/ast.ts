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

export type UnaryOperator = "+" | "-";
export type UnaryNode = {
  readonly type: "Unary";
  readonly operator: UnaryOperator;
  readonly argument: FormulaAstNode;
};

export type BinaryOperator = "+" | "-" | "*" | "/" | "^";
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
  | UnaryNode
  | BinaryNode
  | CompareNode
  | FunctionNode
  | ArrayNode;
