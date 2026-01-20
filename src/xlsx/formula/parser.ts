import { parseRange } from "../domain/cell/address";
import type { CellAddress, CellRange } from "../domain/cell/address";
import type { ErrorValue } from "../domain/cell/types";
import type { ComparatorOperator, FormulaAstNode } from "./ast";
import type { FormulaError } from "./types";

type OperatorToken = {
  readonly type: "operator";
  readonly value: "+" | "-" | "*" | "/" | "^";
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

type CommaToken = {
  readonly type: "comma";
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
  | CommaToken
  | ColonToken
  | EndToken;

const NUMBER_PATTERN = /^[0-9]+(\.[0-9]+)?$/u;

function isDigit(character: string): boolean {
  return /[0-9]/u.test(character);
}

function isLetter(character: string): boolean {
  return /[A-Za-z]/u.test(character);
}

function isWhitespace(character: string): boolean {
  return /\s/u.test(character);
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
  let index = start;
  let result = "";

  while (index < input.length && condition(input[index] ?? "")) {
    result += input[index];
    index += 1;
  }

  return {
    value: result,
    next: index,
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
  let index = start + 1;
  let result = "";

  while (index < input.length) {
    const char = input[index] ?? "";
    if (char === '"') {
      if (input[index + 1] === '"') {
        result += '"';
        index += 2;
        continue;
      }
      return { token: { type: "string", value: result }, next: index + 1 };
    }
    result += char;
    index += 1;
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

function readCellLabel(input: string, start: number): { readonly label: string; readonly next: number } {
  let index = start;
  let result = "";

  const maybeDollar1 = input[index] ?? "";
  if (maybeDollar1 === "$") {
    result += "$";
    index += 1;
  }

  const { value: columnPart, next: afterColumn } = readWhile(input, index, (char) => isLetter(char));
  if (columnPart.length === 0) {
    throw new Error("Missing column in cell reference");
  }
  result += columnPart.toUpperCase();
  index = afterColumn;

  const maybeDollar2 = input[index] ?? "";
  if (maybeDollar2 === "$") {
    result += "$";
    index += 1;
  }

  const { value: rowPart, next } = readWhile(input, index, (char) => isDigit(char));
  if (rowPart.length === 0) {
    throw new Error("Missing row in cell reference");
  }
  result += rowPart;
  return { label: result, next };
}

function readQuotedSheetReference(input: string, start: number): { readonly reference: string; readonly next: number } {
  let index = start + 1;
  let sheetName = "";

  while (index < input.length) {
    const char = input[index] ?? "";
    if (char === "'") {
      if (input[index + 1] === "'") {
        sheetName += "'";
        index += 2;
        continue;
      }
      index += 1;
      if (input[index] !== "!") {
        throw new Error("Quoted sheet reference must be followed by '!'");
      }
      index += 1;
      const { label, next } = readCellLabel(input, index);
      return { reference: `'${sheetName}'!${label}`, next };
    }
    sheetName += char;
    index += 1;
  }

  throw new Error("Unterminated quoted sheet reference");
}

function readIdentifierOrReferenceToken(input: string, start: number): { readonly token: IdentifierToken | ReferenceToken; readonly next: number } {
  const { value: head, next } = readWhile(input, start, (char) => isLetter(char) || isDigit(char) || char === "_");
  const upcoming = input[next] ?? "";

  if (upcoming === "!") {
    const sheetName = head;
    const { label, next: afterLabel } = readCellLabel(input, next + 1);
    return { token: { type: "reference", value: `${sheetName}!${label}` }, next: afterLabel };
  }

  if (upcoming === "$") {
    const { label, next: afterLabel } = readCellLabel(input, start);
    return { token: { type: "reference", value: label }, next: afterLabel };
  }

  if (/^[A-Za-z]+\d+$/u.test(head) && upcoming !== "(") {
    return { token: { type: "reference", value: head.toUpperCase() }, next };
  }

  return { token: { type: "identifier", value: head }, next };
}

function tokenize(formula: string): readonly Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index] ?? "";
    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (char === "#") {
      const { token, next } = readErrorToken(formula, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (isDigit(char)) {
      const { token, next } = readNumberToken(formula, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (char === '"') {
      const { token, next } = readStringToken(formula, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (char === "'") {
      const { reference, next } = readQuotedSheetReference(formula, index);
      tokens.push({ type: "reference", value: reference });
      index = next;
      continue;
    }

    if (char === "$") {
      const { label, next } = readCellLabel(formula, index);
      tokens.push({ type: "reference", value: label });
      index = next;
      continue;
    }

    if (isLetter(char)) {
      const { token, next } = readIdentifierOrReferenceToken(formula, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma" });
      index += 1;
      continue;
    }
    if (char === ":") {
      tokens.push({ type: "colon" });
      index += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "<" || char === ">" || char === "=") {
      const nextChar = formula[index + 1] ?? "";
      if (char === "<" && nextChar === ">") {
        tokens.push({ type: "comparator", value: "<>" });
        index += 2;
        continue;
      }
      if ((char === "<" || char === ">") && nextChar === "=") {
        tokens.push({ type: "comparator", value: (char + "=") as ComparatorOperator });
        index += 2;
        continue;
      }
      tokens.push({ type: "comparator", value: char as ComparatorOperator });
      index += 1;
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
    const parsed = parseRange(token.value);
    if (peek(state).type === "colon") {
      consume(state);
      const endToken = expectToken(state, "reference");
      const end = parseRange(endToken.value);
      if ((parsed.sheetName ?? "") !== (end.sheetName ?? "")) {
        throw new Error("Cross-sheet ranges are not supported");
      }
      const range: CellRange = {
        start: parsed.start,
        end: end.start,
        ...(parsed.sheetName ? { sheetName: parsed.sheetName } : {}),
      };
      return { type: "Range", range };
    }
    const addr: CellAddress = parsed.start;
    return { type: "Reference", reference: addr, sheetName: parsed.sheetName };
  }

  if (token.type === "identifier") {
    consume(state);
    const upper = token.value.toUpperCase();
    if (upper === "TRUE" || upper === "FALSE") {
      return { type: "Literal", value: upper === "TRUE" };
    }
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
    return { type: "Literal", value: token.value };
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
  let node = parseUnary(state);
  while (true) {
    const token = peek(state);
    if (token.type === "operator" && token.value === "^") {
      consume(state);
      node = { type: "Binary", operator: "^", left: node, right: parseUnary(state) };
      continue;
    }
    return node;
  }
}

function parseMultiplicative(state: ParserState): FormulaAstNode {
  let node = parsePower(state);
  while (true) {
    const token = peek(state);
    if (token.type === "operator" && (token.value === "*" || token.value === "/")) {
      consume(state);
      node = { type: "Binary", operator: token.value, left: node, right: parsePower(state) };
      continue;
    }
    return node;
  }
}

function parseAdditive(state: ParserState): FormulaAstNode {
  let node = parseMultiplicative(state);
  while (true) {
    const token = peek(state);
    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      consume(state);
      node = { type: "Binary", operator: token.value, left: node, right: parseMultiplicative(state) };
      continue;
    }
    return node;
  }
}

function parseComparison(state: ParserState): FormulaAstNode {
  let node = parseAdditive(state);
  while (true) {
    const token = peek(state);
    if (token.type === "comparator") {
      consume(state);
      node = { type: "Compare", operator: token.value, left: node, right: parseAdditive(state) };
      continue;
    }
    return node;
  }
}

function parseExpression(state: ParserState): FormulaAstNode {
  return parseComparison(state);
}

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
