/**
 * @file Formula Parser
 *
 * Tokenizes and parses SpreadsheetML formula text into an AST consumed by the formula evaluator.
 * The input is expected to be the expression part (typically without the leading "="),
 * and this parser supports the subset used by this project:
 * literals, cell references/ranges, array literals, function calls, unary/binary ops, and comparisons.
 */

import { columnLetterToIndex, parseCellRef } from "../domain/cell/address";
import type { CellAddress, CellRange } from "../domain/cell/address";
import type { ErrorValue } from "../domain/cell/types";
import { EXCEL_MAX_COLS, EXCEL_MAX_ROWS } from "../domain/constants";
import { colIdx, rowIdx } from "../domain/types";
import type { ComparatorOperator, FormulaAstNode } from "./ast";
import type { FormulaError } from "./types";

type OperatorToken = {
  readonly type: "operator";
  readonly value: "+" | "-" | "*" | "/" | "^" | "&";
};

type ComparatorToken = {
  readonly type: "comparator";
  readonly value: ComparatorOperator;
};

type NumberToken = {
  readonly type: "number";
  readonly value: number;
};

type StringToken = {
  readonly type: "string";
  readonly value: string;
};

type IdentifierToken = {
  readonly type: "identifier";
  readonly value: string;
};

type ReferenceToken = {
  readonly type: "reference";
  readonly value: string;
};

type ErrorToken = {
  readonly type: "error";
  readonly value: ErrorValue;
};

type ParenthesisToken = {
  readonly type: "paren";
  readonly value: "(" | ")";
};

type BracketToken = {
  readonly type: "bracket";
  readonly value: "{" | "}";
};

type CommaToken = {
  readonly type: "comma";
};

type SemicolonToken = {
  readonly type: "semicolon";
};

type ColonToken = {
  readonly type: "colon";
};

type EndToken = {
  readonly type: "end";
};

type Token =
  | OperatorToken
  | ComparatorToken
  | NumberToken
  | StringToken
  | IdentifierToken
  | ReferenceToken
  | ErrorToken
  | ParenthesisToken
  | BracketToken
  | CommaToken
  | SemicolonToken
  | ColonToken
  | EndToken;

const NUMBER_PATTERN = /^[0-9]+(\.[0-9]+)?$/u;
const COLUMN_REF_PATTERN = /^(\$)?([A-Za-z]+)$/u;
const ROW_REF_PATTERN = /^(\$)?(\d+)$/u;

function isDigit(character: string): boolean {
  return /[0-9]/u.test(character);
}

function isLetter(character: string): boolean {
  return /[A-Za-z]/u.test(character);
}

function isIdentifierStart(character: string): boolean {
  return isLetter(character) || character === "_";
}

function isIdentifierBodyStandard(character: string): boolean {
  return isLetter(character) || isDigit(character) || character === "_";
}

function isIdentifierBodyNamespaced(character: string): boolean {
  return isIdentifierBodyStandard(character) || character === ".";
}

function isWhitespace(character: string): boolean {
  return /\s/u.test(character);
}

function normalizeSheetNameToken(sheetRaw: string | undefined): string | undefined {
  if (!sheetRaw) {
    return undefined;
  }
  if (sheetRaw.startsWith("'") && sheetRaw.endsWith("'")) {
    return sheetRaw.slice(1, -1).replace(/''/gu, "'");
  }
  return sheetRaw;
}

function parseErrorValue(text: string): ErrorValue | undefined {
  switch (text) {
    case "#NULL!":
    case "#DIV/0!":
    case "#VALUE!":
    case "#REF!":
    case "#NAME?":
    case "#NUM!":
    case "#N/A":
    case "#GETTING_DATA":
      return text;
  }
  return undefined;
}

function readWhile(
  input: string,
  start: number,
  condition: (char: string) => boolean,
): { readonly value: string; readonly next: number } {
  const cursor = { index: start, result: "" };

  while (cursor.index < input.length && condition(input[cursor.index] ?? "")) {
    cursor.result += input[cursor.index];
    cursor.index += 1;
  }

  return {
    value: cursor.result,
    next: cursor.index,
  };
}

function readNumberToken(input: string, start: number): { readonly token: NumberToken; readonly next: number } {
  const { value, next } = readWhile(input, start, (char) => isDigit(char) || char === ".");
  if (!NUMBER_PATTERN.test(value)) {
    throw new Error(`Invalid number literal "${value}"`);
  }
  return { token: { type: "number", value: Number.parseFloat(value) }, next };
}

function readStringToken(input: string, start: number): { readonly token: StringToken; readonly next: number } {
  const cursor = { index: start + 1, value: "" };

  while (cursor.index < input.length) {
    const char = input[cursor.index] ?? "";
    if (char === '"') {
      if (input[cursor.index + 1] === '"') {
        cursor.value += '"';
        cursor.index += 2;
        continue;
      }
      return { token: { type: "string", value: cursor.value }, next: cursor.index + 1 };
    }
    cursor.value += char;
    cursor.index += 1;
  }

  throw new Error("Unterminated string literal");
}

function isErrorBodyChar(char: string): boolean {
  return isLetter(char) || isDigit(char) || char === "/" || char === "!" || char === "?" || char === "_";
}

function readErrorToken(input: string, start: number): { readonly token: ErrorToken; readonly next: number } {
  const { value, next } = readWhile(input, start, (char) => isErrorBodyChar(char) || char === "#");
  if (!value.startsWith("#")) {
    throw new Error("Error token must start with '#'");
  }
  const parsed = parseErrorValue(value);
  if (!parsed) {
    throw new Error(`Unknown error literal "${value}"`);
  }
  return { token: { type: "error", value: parsed }, next };
}

function readColumnReferenceLabel(input: string, start: number): { readonly label: string; readonly next: number } {
  const cursor = { index: start, label: "" };
  const maybeDollar = input[cursor.index] ?? "";
  if (maybeDollar === "$") {
    cursor.label += "$";
    cursor.index += 1;
  }
  const { value: letters, next } = readWhile(input, cursor.index, (char) => isLetter(char));
  if (letters.length === 0) {
    throw new Error("Missing column in column reference");
  }
  cursor.label += letters.toUpperCase();
  cursor.index = next;
  return { label: cursor.label, next: cursor.index };
}

function readRowReferenceLabel(input: string, start: number): { readonly label: string; readonly next: number } {
  const cursor = { index: start, label: "" };
  const maybeDollar = input[cursor.index] ?? "";
  if (maybeDollar === "$") {
    cursor.label += "$";
    cursor.index += 1;
  }
  const { value: digits, next } = readWhile(input, cursor.index, (char) => isDigit(char));
  if (digits.length === 0) {
    throw new Error("Missing row in row reference");
  }
  cursor.label += digits;
  cursor.index = next;
  return { label: cursor.label, next: cursor.index };
}

function readCellLabel(input: string, start: number): { readonly label: string; readonly next: number } {
  const cursor = { index: start, label: "" };

  const maybeDollar1 = input[cursor.index] ?? "";
  if (maybeDollar1 === "$") {
    cursor.label += "$";
    cursor.index += 1;
  }

  const { value: columnPart, next: afterColumn } = readWhile(input, cursor.index, (char) => isLetter(char));
  if (columnPart.length === 0) {
    throw new Error("Missing column in cell reference");
  }
  cursor.label += columnPart.toUpperCase();
  cursor.index = afterColumn;

  const maybeDollar2 = input[cursor.index] ?? "";
  if (maybeDollar2 === "$") {
    cursor.label += "$";
    cursor.index += 1;
  }

  const { value: rowPart, next } = readWhile(input, cursor.index, (char) => isDigit(char));
  if (rowPart.length === 0) {
    throw new Error("Missing row in cell reference");
  }
  cursor.label += rowPart;
  return { label: cursor.label, next };
}

function readReferenceLabel(input: string, start: number): { readonly label: string; readonly next: number } {
  const first = input[start] ?? "";
  if (first === "$") {
    const next = input[start + 1] ?? "";
    if (isDigit(next)) {
      return readRowReferenceLabel(input, start);
    }
    try {
      return readCellLabel(input, start);
    } catch (error) {
      if (error instanceof Error && error.message === "Missing row in cell reference") {
        return readColumnReferenceLabel(input, start);
      }
      throw error;
    }
  }
  if (isLetter(first)) {
    try {
      return readCellLabel(input, start);
    } catch (error) {
      if (error instanceof Error && error.message === "Missing row in cell reference") {
        return readColumnReferenceLabel(input, start);
      }
      throw error;
    }
  }
  if (isDigit(first)) {
    return readRowReferenceLabel(input, start);
  }
  throw new Error(`Unexpected reference label start "${first}"`);
}

function escapeSheetNameForFormula(sheetName: string): string {
  return sheetName.replace(/'/gu, "''");
}

function readQuotedSheetReference(input: string, start: number): { readonly reference: string; readonly next: number } {
  const cursor = { index: start + 1, sheetName: "" };

  while (cursor.index < input.length) {
    const char = input[cursor.index] ?? "";
    if (char === "'") {
      if (input[cursor.index + 1] === "'") {
        cursor.sheetName += "'";
        cursor.index += 2;
        continue;
      }
      cursor.index += 1;
      if (input[cursor.index] !== "!") {
        throw new Error("Quoted sheet reference must be followed by '!'");
      }
      cursor.index += 1;
      const { label, next } = readReferenceLabel(input, cursor.index);
      return { reference: `'${escapeSheetNameForFormula(cursor.sheetName)}'!${label}`, next };
    }
    cursor.sheetName += char;
    cursor.index += 1;
  }

  throw new Error("Unterminated quoted sheet reference");
}

function tryReadSheetSpanReferenceToken(input: string, start: number): { readonly token: ReferenceToken; readonly next: number } | undefined {
  const first = input[start] ?? "";
  if (!isLetter(first)) {
    return undefined;
  }

  const { value: sheetStart, next: afterStart } = readWhile(input, start, (char) => isLetter(char) || isDigit(char) || char === "_");
  if (sheetStart.length === 0 || (input[afterStart] ?? "") !== ":") {
    return undefined;
  }

  const sheetEndStart = afterStart + 1;
  const { value: sheetEnd, next: afterEnd } = readWhile(input, sheetEndStart, (char) => isLetter(char) || isDigit(char) || char === "_");
  if (sheetEnd.length === 0 || (input[afterEnd] ?? "") !== "!") {
    return undefined;
  }

  const refStart = afterEnd + 1;
  const { label, next } = readReferenceLabel(input, refStart);
  return {
    token: { type: "reference", value: `${sheetStart}:${sheetEnd}!${label}` },
    next,
  };
}

function readIdentifierOrReferenceToken(input: string, start: number): { readonly token: IdentifierToken | ReferenceToken; readonly next: number } {
  const allowNamespaceSeparator = (input[start] ?? "") === "_";
  const { value: head, next } = readWhile(
    input,
    start,
    (char) => (allowNamespaceSeparator ? isIdentifierBodyNamespaced(char) : isIdentifierBodyStandard(char)),
  );
  const upcoming = input[next] ?? "";

  if (upcoming === "[") {
    const cursor = { index: next, depth: 0, value: "" };
    while (cursor.index < input.length) {
      const c = input[cursor.index] ?? "";
      cursor.value += c;
      if (c === "[") {
        cursor.depth += 1;
      } else if (c === "]") {
        cursor.depth -= 1;
        if (cursor.depth === 0) {
          return { token: { type: "reference", value: `${head}${cursor.value}` }, next: cursor.index + 1 };
        }
      }
      cursor.index += 1;
    }
    throw new Error("Unterminated structured reference");
  }

  if (upcoming === "!") {
    const sheetName = head;
    const { label, next: afterLabel } = readReferenceLabel(input, next + 1);
    return { token: { type: "reference", value: `${sheetName}!${label}` }, next: afterLabel };
  }

  if (upcoming === "$") {
    const { label, next: afterLabel } = readReferenceLabel(input, start);
    return { token: { type: "reference", value: label }, next: afterLabel };
  }

  if (/^[A-Za-z]+\d+$/u.test(head) && upcoming !== "(") {
    return { token: { type: "reference", value: head.toUpperCase() }, next };
  }

  if (/^[A-Za-z]+$/u.test(head) && upcoming === ":") {
    return { token: { type: "reference", value: head.toUpperCase() }, next };
  }

  return { token: { type: "identifier", value: head }, next };
}

function tokenize(formula: string): readonly Token[] {
  const tokens: Token[] = [];
  const cursor = { index: 0 };

  while (cursor.index < formula.length) {
    const char = formula[cursor.index] ?? "";
    if (isWhitespace(char)) {
      cursor.index += 1;
      continue;
    }

    if (char === "#") {
      const { token, next } = readErrorToken(formula, cursor.index);
      tokens.push(token);
      cursor.index = next;
      continue;
    }

    if (isDigit(char)) {
      const { value: digits, next } = readWhile(formula, cursor.index, (c) => isDigit(c));
      if ((formula[next] ?? "") === ":") {
        tokens.push({ type: "reference", value: digits });
        cursor.index = next;
        continue;
      }
      const { token, next: afterNumber } = readNumberToken(formula, cursor.index);
      tokens.push(token);
      cursor.index = afterNumber;
      continue;
    }

    if (char === '"') {
      const { token, next } = readStringToken(formula, cursor.index);
      tokens.push(token);
      cursor.index = next;
      continue;
    }

    if (char === "'") {
      const { reference, next } = readQuotedSheetReference(formula, cursor.index);
      tokens.push({ type: "reference", value: reference });
      cursor.index = next;
      continue;
    }

    if (char === "$") {
      const { label, next } = readReferenceLabel(formula, cursor.index);
      tokens.push({ type: "reference", value: label });
      cursor.index = next;
      continue;
    }

    if (isIdentifierStart(char)) {
      if (isLetter(char)) {
        const sheetSpan = tryReadSheetSpanReferenceToken(formula, cursor.index);
        if (sheetSpan) {
          tokens.push(sheetSpan.token);
          cursor.index = sheetSpan.next;
          continue;
        }
      }
      const { token, next } = readIdentifierOrReferenceToken(formula, cursor.index);
      tokens.push(token);
      cursor.index = next;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      cursor.index += 1;
      continue;
    }
    if (char === "{" || char === "}") {
      tokens.push({ type: "bracket", value: char });
      cursor.index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma" });
      cursor.index += 1;
      continue;
    }
    if (char === ";") {
      tokens.push({ type: "semicolon" });
      cursor.index += 1;
      continue;
    }
    if (char === ":") {
      tokens.push({ type: "colon" });
      cursor.index += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^" || char === "&") {
      tokens.push({ type: "operator", value: char });
      cursor.index += 1;
      continue;
    }

    if (char === "<" || char === ">" || char === "=") {
      const nextChar = formula[cursor.index + 1] ?? "";
      if (char === "<" && nextChar === ">") {
        tokens.push({ type: "comparator", value: "<>" });
        cursor.index += 2;
        continue;
      }
      if ((char === "<" || char === ">") && nextChar === "=") {
        tokens.push({ type: "comparator", value: (char + "=") as ComparatorOperator });
        cursor.index += 2;
        continue;
      }
      tokens.push({ type: "comparator", value: char as ComparatorOperator });
      cursor.index += 1;
      continue;
    }

    throw new Error(`Unexpected character "${char}"`);
  }

  tokens.push({ type: "end" });
  return tokens;
}

type ParserState = {
  readonly tokens: readonly Token[];
  index: number;
};

function peek(state: ParserState): Token {
  return state.tokens[state.index] ?? { type: "end" };
}

function consume(state: ParserState): Token {
  const token = peek(state);
  state.index += 1;
  return token;
}

function expectToken<T extends Token["type"]>(state: ParserState, type: T): Extract<Token, { type: T }> {
  const token = consume(state);
  if (token.type !== type) {
    throw new Error(`Expected token "${type}", got "${token.type}"`);
  }
  return token as Extract<Token, { type: T }>;
}

function parsePrimary(state: ParserState): FormulaAstNode {
  const token = peek(state);

  if (token.type === "number") {
    consume(state);
    return { type: "Literal", value: token.value };
  }
  if (token.type === "string") {
    consume(state);
    return { type: "Literal", value: token.value };
  }
  if (token.type === "error") {
    consume(state);
    const error: FormulaError = { type: "error", value: token.value };
    return { type: "Literal", value: error };
  }
  if (token.type === "reference") {
    consume(state);

    if (token.value.includes("[") === true) {
      const bracket = token.value.indexOf("[");
      const tableName = token.value.slice(0, bracket);
      const remainder = token.value.slice(bracket);
      if (!remainder.startsWith("[") || !remainder.endsWith("]")) {
        throw new Error(`Unsupported structured reference token "${token.value}"`);
      }
      const inner = remainder.slice(1, -1);

      if (inner.startsWith("#")) {
        return { type: "StructuredTableReference", tableName, item: inner };
      }

      if (!inner.startsWith("[")) {
        // Excel single-column structured reference: `Table1[Column]`
        // Multi-column ranges use the double-bracket form: `Table1[[A]:[B]]`.
        return { type: "StructuredTableReference", tableName, startColumnName: inner, endColumnName: inner };
      }

      const parseBracketedName = (text: string, start: number): { readonly name: string; readonly next: number } => {
        if ((text[start] ?? "") !== "[") {
          throw new Error("Expected '[' in structured reference");
        }
        const end = text.indexOf("]", start + 1);
        if (end === -1) {
          throw new Error("Unterminated column name in structured reference");
        }
        const name = text.slice(start + 1, end);
        return { name, next: end + 1 };
      };

      const first = parseBracketedName(inner, 0);
      const afterFirst = inner[first.next] ?? "";
      if (afterFirst === "") {
        if (first.name.trim().startsWith("#")) {
          return { type: "StructuredTableReference", tableName, item: first.name };
        }
        return { type: "StructuredTableReference", tableName, startColumnName: first.name, endColumnName: first.name };
      }
      if (afterFirst === ":") {
        const second = parseBracketedName(inner, first.next + 1);
        if (inner[second.next] !== undefined) {
          throw new Error(`Unsupported structured reference token "${token.value}"`);
        }
        return { type: "StructuredTableReference", tableName, startColumnName: first.name, endColumnName: second.name };
      }
      if (afterFirst === ",") {
        const item = first.name;
        const second = parseBracketedName(inner, first.next + 1);
        const afterSecond = inner[second.next] ?? "";
        if (afterSecond === "") {
          return { type: "StructuredTableReference", tableName, item, startColumnName: second.name, endColumnName: second.name };
        }
        if (afterSecond !== ":") {
          throw new Error(`Unsupported structured reference token "${token.value}"`);
        }
        const third = parseBracketedName(inner, second.next + 1);
        if (inner[third.next] !== undefined) {
          throw new Error(`Unsupported structured reference token "${token.value}"`);
        }
        return { type: "StructuredTableReference", tableName, item, startColumnName: second.name, endColumnName: third.name };
      }

      throw new Error(`Unsupported structured reference token "${token.value}"`);
    }

    const parseReferenceToken = (value: string): {
      readonly kind: "cell" | "column" | "row";
      readonly sheetName?: string;
      readonly start: CellAddress;
      readonly end: CellAddress;
    } => {
      const bang = value.lastIndexOf("!");
      const sheetRaw = bang === -1 ? undefined : value.slice(0, bang);
      const ref = bang === -1 ? value : value.slice(bang + 1);
      const sheetName = normalizeSheetNameToken(sheetRaw);

      try {
        const address = parseCellRef(ref);
        return { kind: "cell", start: address, end: address, ...(sheetName ? { sheetName } : {}) };
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
        // fall through to other reference patterns
      }

      const colMatch = ref.match(COLUMN_REF_PATTERN);
      if (colMatch) {
        const [, dollar, letters] = colMatch;
        const col = columnLetterToIndex(letters);
        const colAbsolute = dollar === "$";
        return {
          kind: "column",
          ...(sheetName ? { sheetName } : {}),
          start: { col, row: rowIdx(1), colAbsolute, rowAbsolute: true },
          end: { col, row: rowIdx(EXCEL_MAX_ROWS), colAbsolute, rowAbsolute: true },
        };
      }

      const rowMatch = ref.match(ROW_REF_PATTERN);
      if (rowMatch) {
        const [, dollar, digits] = rowMatch;
        const rowNumber = Number.parseInt(digits, 10);
        const rowAbsolute = dollar === "$";
        return {
          kind: "row",
          ...(sheetName ? { sheetName } : {}),
          start: { col: colIdx(1), row: rowIdx(rowNumber), colAbsolute: true, rowAbsolute },
          end: { col: colIdx(EXCEL_MAX_COLS), row: rowIdx(rowNumber), colAbsolute: true, rowAbsolute },
        };
      }

      throw new Error(`Unsupported reference token "${value}"`);
    };

    const left = parseReferenceToken(token.value);

    if (peek(state).type === "colon") {
      consume(state);
      const endToken = expectToken(state, "reference");
      const right = parseReferenceToken(endToken.value);

      if (left.kind !== right.kind) {
        throw new Error("Mixed row/column/cell reference kinds are not supported");
      }
      if (left.sheetName && right.sheetName && left.sheetName !== right.sheetName) {
        throw new Error("Cross-sheet ranges are not supported");
      }

      const sheetName = left.sheetName ?? right.sheetName;
      const range: CellRange = {
        start: left.start,
        end: right.end,
        ...(sheetName ? { sheetName } : {}),
      };
      return { type: "Range", range };
    }

    if (left.kind !== "cell") {
      throw new Error("Expected a cell reference");
    }
    if (left.sheetName?.includes(":") === true) {
      return {
        type: "Range",
        range: { start: left.start, end: left.end, sheetName: left.sheetName },
      };
    }
    return { type: "Reference", reference: left.start, ...(left.sheetName ? { sheetName: left.sheetName } : {}) };
  }

  if (token.type === "bracket" && token.value === "{") {
    consume(state);
    const rows: FormulaAstNode[][] = [];
    const rowState: { currentRow: FormulaAstNode[] } = { currentRow: [] };

    const closingToken = peek(state);
    if (closingToken.type === "bracket" && closingToken.value === "}") {
      consume(state);
      return { type: "Array", elements: [[]] };
    }

    while (true) {
      rowState.currentRow.push(parseExpression(state));
      const separator = peek(state);

      if (separator.type === "comma") {
        consume(state);
        continue;
      }
      if (separator.type === "semicolon") {
        consume(state);
        rows.push(rowState.currentRow);
        rowState.currentRow = [];
        continue;
      }
      if (separator.type === "bracket" && separator.value === "}") {
        consume(state);
        rows.push(rowState.currentRow);
        return { type: "Array", elements: rows };
      }

      throw new Error(`Unexpected token in array literal: ${separator.type}`);
    }
  }

  if (token.type === "identifier") {
    consume(state);
    const upper = token.value.toUpperCase();
    if (peek(state).type === "paren" && (peek(state) as ParenthesisToken).value === "(") {
      consume(state);
      const args: FormulaAstNode[] = [];
      if (peek(state).type !== "paren" || (peek(state) as ParenthesisToken).value !== ")") {
        while (true) {
          args.push(parseExpression(state));
          const next = peek(state);
          if (next.type === "comma") {
            consume(state);
            continue;
          }
          break;
        }
      }
      expectToken(state, "paren"); // ")"
      return { type: "Function", name: upper, args };
    }
    if (upper === "TRUE" || upper === "FALSE") {
      return { type: "Literal", value: upper === "TRUE" };
    }
    if (upper === "NULL" || upper === "NIL") {
      return { type: "Literal", value: null };
    }
    return { type: "Name", name: token.value };
  }

  if (token.type === "paren" && token.value === "(") {
    consume(state);
    const expr = parseExpression(state);
    const close = expectToken(state, "paren");
    if (close.value !== ")") {
      throw new Error("Expected ')'");
    }
    return expr;
  }

  throw new Error(`Unexpected token "${token.type}"`);
}

function parseUnary(state: ParserState): FormulaAstNode {
  const token = peek(state);
  if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
    consume(state);
    const argument = parseUnary(state);
    return { type: "Unary", operator: token.value, argument };
  }
  return parsePrimary(state);
}

function parsePower(state: ParserState): FormulaAstNode {
  const node = parseUnary(state);
  return parsePowerTail(state, node);
}

function parsePowerTail(state: ParserState, left: FormulaAstNode): FormulaAstNode {
  const token = peek(state);
  if (token.type === "operator" && token.value === "^") {
    consume(state);
    return parsePowerTail(state, { type: "Binary", operator: "^", left, right: parseUnary(state) });
  }
  return left;
}

function parseMultiplicative(state: ParserState): FormulaAstNode {
  const node = parsePower(state);
  return parseMultiplicativeTail(state, node);
}

function parseMultiplicativeTail(state: ParserState, left: FormulaAstNode): FormulaAstNode {
  const token = peek(state);
  if (token.type === "operator" && (token.value === "*" || token.value === "/")) {
    consume(state);
    return parseMultiplicativeTail(state, { type: "Binary", operator: token.value, left, right: parsePower(state) });
  }
  return left;
}

function parseAdditive(state: ParserState): FormulaAstNode {
  const node = parseMultiplicative(state);
  return parseAdditiveTail(state, node);
}

function parseAdditiveTail(state: ParserState, left: FormulaAstNode): FormulaAstNode {
  const token = peek(state);
  if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
    consume(state);
    return parseAdditiveTail(state, { type: "Binary", operator: token.value, left, right: parseMultiplicative(state) });
  }
  return left;
}

function parseConcatenation(state: ParserState): FormulaAstNode {
  const node = parseAdditive(state);
  return parseConcatenationTail(state, node);
}

function parseConcatenationTail(state: ParserState, left: FormulaAstNode): FormulaAstNode {
  const token = peek(state);
  if (token.type === "operator" && token.value === "&") {
    consume(state);
    return parseConcatenationTail(state, { type: "Binary", operator: "&", left, right: parseAdditive(state) });
  }
  return left;
}

function parseComparison(state: ParserState): FormulaAstNode {
  const node = parseConcatenation(state);
  return parseComparisonTail(state, node);
}

function parseComparisonTail(state: ParserState, left: FormulaAstNode): FormulaAstNode {
  const token = peek(state);
  if (token.type === "comparator") {
    consume(state);
    return parseComparisonTail(state, { type: "Compare", operator: token.value, left, right: parseConcatenation(state) });
  }
  return left;
}

function parseExpression(state: ParserState): FormulaAstNode {
  return parseComparison(state);
}

/**
 * Parse a formula expression into an AST.
 *
 * This is used by the evaluator and tooling. The caller is responsible for normalizing
 * the raw cell formula text (e.g., stripping a leading "=") before invoking this parser.
 *
 * @param formula - Formula expression text
 * @returns Root AST node
 */
export function parseFormula(formula: string): FormulaAstNode {
  const tokens = tokenize(formula);
  const state: ParserState = { tokens, index: 0 };
  const expr = parseExpression(state);
  const end = consume(state);
  if (end.type !== "end") {
    throw new Error("Unexpected trailing tokens");
  }
  return expr;
}
