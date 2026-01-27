/**
 * @file Formula formatting
 *
 * Formats a parsed formula AST back into a string while preserving precedence and parentheses.
 */

import type { CellAddress, CellRange } from "../domain/cell/address";
import { formatCellRef } from "../domain/cell/address";
import type { FormulaAstNode } from "./ast";
import { isFormulaError, type FormulaScalar } from "./types";

function formatSheetName(sheetName: string): string {
  const needsQuotes = /[\s!']/u.test(sheetName);
  if (!needsQuotes) {
    return sheetName;
  }
  const escaped = sheetName.replaceAll("'", "''");
  return `'${escaped}'`;
}

function formatReferenceWithSheet(sheetName: string | undefined, address: CellAddress): string {
  const ref = formatCellRef(address);
  if (!sheetName) {
    return ref;
  }
  return `${formatSheetName(sheetName)}!${ref}`;
}

function formatRangeWithSheet(range: CellRange): string {
  const start = formatReferenceWithSheet(range.sheetName, range.start);
  const end = formatCellRef(range.end);

  const isSingleCell =
    range.start.col === range.end.col &&
    range.start.row === range.end.row &&
    range.start.colAbsolute === range.end.colAbsolute &&
    range.start.rowAbsolute === range.end.rowAbsolute;

  if (isSingleCell) {
    return start;
  }
  if (range.sheetName) {
    return `${formatSheetName(range.sheetName)}!${formatCellRef(range.start)}:${end}`;
  }
  return `${start}:${end}`;
}

function escapeStringLiteral(value: string): string {
  return value.replaceAll('"', '""');
}

function formatScalar(value: FormulaScalar): string {
  if (value === null) {
    return "0";
  }
  if (typeof value === "string") {
    return `"${escapeStringLiteral(value)}"`;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "0";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (isFormulaError(value)) {
    return value.value;
  }
  return "0";
}

type Prec = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function precedence(node: FormulaAstNode): Prec {
  switch (node.type) {
    case "Compare":
      return 0;
    case "Binary":
      switch (node.operator) {
        case "&":
          return 1;
        case "+":
        case "-":
          return 2;
        case "*":
        case "/":
          return 3;
        case "^":
          return 4;
      }
      return 2;
    case "Unary":
      return 5;
    case "Literal":
    case "Reference":
    case "Range":
    case "Name":
    case "StructuredTableReference":
    case "Function":
    case "Array":
      return 6;
  }
}

function needsParens(params: {
  readonly child: FormulaAstNode;
  readonly parentPrec: Prec;
  readonly position: "left" | "right";
  readonly parentOperator?: string;
}): boolean {
  const childPrec = precedence(params.child);
  if (childPrec < params.parentPrec) {
    return true;
  }
  if (childPrec > params.parentPrec) {
    return false;
  }
  if (params.position === "right" && (params.parentOperator === "-" || params.parentOperator === "/" || params.parentOperator === "^")) {
    return params.child.type === "Binary";
  }
  return false;
}

function formatNode(node: FormulaAstNode, parentPrec: Prec, position: "left" | "right", parentOperator?: string): string {
  const selfPrec = precedence(node);

  const wrapIfNeeded = (text: string, child: FormulaAstNode, childPosition: "left" | "right", operator?: string): string => {
    if (needsParens({ child, parentPrec: selfPrec, position: childPosition, parentOperator: operator })) {
      return `(${text})`;
    }
    return text;
  };

  const formatNodeBody = (): string => {
    switch (node.type) {
      case "Literal":
        return formatScalar(node.value);
      case "Reference":
        return formatReferenceWithSheet(node.sheetName, node.reference);
      case "Range":
        return formatRangeWithSheet(node.range);
      case "Name":
        return node.name;
      case "StructuredTableReference": {
        const item = node.item;
        const start = node.startColumnName;
        const end = node.endColumnName;

        if (item && !start && !end) {
          return `${node.tableName}[${item}]`;
        }

        if (item && start && end) {
          const itemToken = `[${item}]`;
          const left = `[${start}]`;
          const right = `[${end}]`;
          const colToken = start === end ? left : `${left}:${right}`;
          return `${node.tableName}[${itemToken},${colToken}]`;
        }

        if (!start || !end) {
          return `${node.tableName}[#REF!]`;
        }

        if (start === end) {
          // Canonical single-column structured reference: `Table1[Column]`
          return `${node.tableName}[${start}]`;
        }

        const left = `[${start}]`;
        const right = `[${end}]`;
        return `${node.tableName}[${left}:${right}]`;
      }
      case "Function":
        return `${node.name}(${node.args.map((arg) => formatNode(arg, 0, "left")).join(",")})`;
      case "Array": {
        const isEmpty = node.elements.length === 1 && (node.elements[0]?.length ?? 0) === 0;
        if (isEmpty) {
          return "{}";
        }
        const rows = node.elements.map((row) => row.map((el) => formatNode(el, 0, "left")).join(",")).join(";");
        return `{${rows}}`;
      }
      case "Unary": {
        const arg = formatNode(node.argument, selfPrec, "right", node.operator);
        const wrapped = wrapIfNeeded(arg, node.argument, "right", node.operator);
        return `${node.operator}${wrapped}`;
      }
      case "Binary": {
        const left = formatNode(node.left, selfPrec, "left", node.operator);
        const right = formatNode(node.right, selfPrec, "right", node.operator);
        const leftWrapped = wrapIfNeeded(left, node.left, "left", node.operator);
        const rightWrapped = wrapIfNeeded(right, node.right, "right", node.operator);
        return `${leftWrapped}${node.operator}${rightWrapped}`;
      }
      case "Compare": {
        const left = formatNode(node.left, selfPrec, "left", node.operator);
        const right = formatNode(node.right, selfPrec, "right", node.operator);
        const leftWrapped = wrapIfNeeded(left, node.left, "left", node.operator);
        const rightWrapped = wrapIfNeeded(right, node.right, "right", node.operator);
        return `${leftWrapped}${node.operator}${rightWrapped}`;
      }
    }
  };
  const body = formatNodeBody();

  if (needsParens({ child: node, parentPrec, position, parentOperator })) {
    return `(${body})`;
  }
  return body;
}

/**
 * Format a formula AST into a string.
 */
export function formatFormula(ast: FormulaAstNode): string {
  return formatNode(ast, 0, "left");
}
