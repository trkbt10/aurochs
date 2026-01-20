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

type Prec = 0 | 1 | 2 | 3 | 4 | 5;

function precedence(node: FormulaAstNode): Prec {
  switch (node.type) {
    case "Compare":
      return 0;
    case "Binary":
      switch (node.operator) {
        case "+":
        case "-":
          return 1;
        case "*":
        case "/":
          return 2;
        case "^":
          return 3;
      }
      return 1;
    case "Unary":
      return 4;
    case "Literal":
    case "Reference":
    case "Range":
    case "Function":
    case "Array":
      return 5;
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

  const body = (() => {
    switch (node.type) {
      case "Literal":
        return formatScalar(node.value);
      case "Reference":
        return formatReferenceWithSheet(node.sheetName, node.reference);
      case "Range":
        return formatRangeWithSheet(node.range);
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
        let wrapped = arg;
        if (needsParens({ child: node.argument, parentPrec: selfPrec, position: "right", parentOperator: node.operator })) {
          wrapped = `(${arg})`;
        }
        return `${node.operator}${wrapped}`;
      }
      case "Binary": {
        const left = formatNode(node.left, selfPrec, "left", node.operator);
        const right = formatNode(node.right, selfPrec, "right", node.operator);
        let leftWrapped = left;
        if (needsParens({ child: node.left, parentPrec: selfPrec, position: "left", parentOperator: node.operator })) {
          leftWrapped = `(${left})`;
        }
        let rightWrapped = right;
        if (needsParens({ child: node.right, parentPrec: selfPrec, position: "right", parentOperator: node.operator })) {
          rightWrapped = `(${right})`;
        }
        return `${leftWrapped}${node.operator}${rightWrapped}`;
      }
      case "Compare": {
        const left = formatNode(node.left, selfPrec, "left", node.operator);
        const right = formatNode(node.right, selfPrec, "right", node.operator);
        let leftWrapped = left;
        if (needsParens({ child: node.left, parentPrec: selfPrec, position: "left", parentOperator: node.operator })) {
          leftWrapped = `(${left})`;
        }
        let rightWrapped = right;
        if (needsParens({ child: node.right, parentPrec: selfPrec, position: "right", parentOperator: node.operator })) {
          rightWrapped = `(${right})`;
        }
        return `${leftWrapped}${node.operator}${rightWrapped}`;
      }
    }
  })();

  if (needsParens({ child: node, parentPrec, position, parentOperator })) {
    return `(${body})`;
  }
  return body;
}

export function formatFormula(ast: FormulaAstNode): string {
  return formatNode(ast, 0, "left");
}
