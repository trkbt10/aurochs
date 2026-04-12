/**
 * @file Formula tokenizer for editing
 *
 * A lightweight, fault-tolerant tokenizer for formula text being edited.
 * Unlike the parser's internal tokenizer, this one:
 * - Never throws on malformed input
 * - Attaches precise character offsets to each token
 * - Identifies reference tokens separately from function name tokens
 * - Handles incomplete formulas gracefully (partial tokens become "error" type)
 *
 * Offsets returned are relative to the input string (formula text after "=").
 * The caller (formula-analysis.ts) shifts them by +1 to account for the "=".
 */

import type { FormulaTextToken } from "./types";

/**
 * Pattern matching a cell reference (A1, $A$1, A1:B2, $A:$A, $1:$1)
 * with optional sheet prefix (Sheet1! or 'Sheet Name'!).
 *
 * This regex is intentionally permissive for mid-typing scenarios;
 * detailed validation happens at the AST level.
 */
const CELL_REF_RE =
  /^(?:'(?:[^']|'')*'!|[A-Za-z_]\w*!)?(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}|\$?\d+:\$?\d+)/;

/**
 * Pattern matching a sheet-qualified prefix alone (for partial references like `Sheet1!`).
 */
const SHEET_PREFIX_RE = /^(?:'(?:[^']|'')*'!|[A-Za-z_]\w*!)/;

/**
 * Pattern matching a function name followed by `(`.
 * Lookahead is not consumed, so `(` will be tokenized separately.
 */
const FUNCTION_NAME_RE = /^[A-Za-z_][A-Za-z_0-9.]*(?=\s*\()/;

/**
 * Pattern matching a bare identifier (potential function name or named range).
 */
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z_0-9.]*/;

/**
 * Pattern matching a numeric literal (integer or decimal, optional exponent).
 */
const NUMBER_RE = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;

/**
 * Pattern matching leading whitespace.
 */
const WHITESPACE_RE = /^\s+/;

/**
 * Pattern matching an error literal (#NAME?, #REF!, etc.).
 */
const ERROR_RE = /^#(?:NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|GETTING_DATA)/i;

/**
 * Operators (multi-char before single-char to avoid partial matches).
 */
const OPERATORS = ["<>", ">=", "<=", "+", "-", "*", "/", "^", "&", "=", ">", "<"] as const;

/**
 * Tokenize formula text (without leading "=") into FormulaTextToken[].
 *
 * All offsets are 0-based, relative to the input string.
 * Returns an empty array for empty input.
 */
/**
 * Scan a string literal starting at position 0 (which is the opening `"`).
 * Returns the length of the string literal including quotes.
 *
 * Handles escaped quotes (`""`) by scanning character-by-character via recursion.
 */
function scanStringLiteral(rest: string): number {
  return scanStringBody(rest, 1);
}

/**
 * Recursively scan the body of a string literal starting at `idx`.
 * Returns the total length of the string literal (from position 0).
 */
function scanStringBody(rest: string, idx: number): number {
  if (idx >= rest.length) {
    // Unterminated string — consume all remaining
    return rest.length;
  }
  if (rest[idx] === '"') {
    // Check if this is an escaped quote (`""`)
    if (idx + 1 < rest.length && rest[idx + 1] === '"') {
      return scanStringBody(rest, idx + 2);
    }
    // Closing quote found
    return idx + 1;
  }
  return scanStringBody(rest, idx + 1);
}

/**
 * Try to match an operator at the start of `rest`.
 * Returns the matched operator or undefined.
 */
function matchOperator(rest: string): (typeof OPERATORS)[number] | undefined {
  return OPERATORS.find((op) => rest.startsWith(op));
}

/**
 * Try to match a single token at the given position.
 * Returns the token and its length, or undefined if no match.
 */
function matchToken(formula: string, pos: number): { token: FormulaTextToken; length: number } | undefined {
  const rest = formula.slice(pos);

  // Whitespace
  const wsMatch = rest.match(WHITESPACE_RE);
  if (wsMatch) {
    return { token: { type: "whitespace", text: wsMatch[0], startOffset: pos, endOffset: pos + wsMatch[0].length }, length: wsMatch[0].length };
  }

  // Error literal (#REF!, #NAME?, etc.)
  const errMatch = rest.match(ERROR_RE);
  if (errMatch) {
    return { token: { type: "error", text: errMatch[0], startOffset: pos, endOffset: pos + errMatch[0].length }, length: errMatch[0].length };
  }

  // String literal
  if (rest[0] === '"') {
    const end = scanStringLiteral(rest);
    return { token: { type: "string", text: rest.slice(0, end), startOffset: pos, endOffset: pos + end }, length: end };
  }

  // Cell reference (check before identifier to avoid misclassification)
  const refMatch = rest.match(CELL_REF_RE);
  if (refMatch) {
    return { token: { type: "reference", text: refMatch[0], startOffset: pos, endOffset: pos + refMatch[0].length }, length: refMatch[0].length };
  }

  // Sheet-qualified prefix without a complete reference (e.g., `Sheet1!` while still typing)
  const sheetMatch = rest.match(SHEET_PREFIX_RE);
  if (sheetMatch) {
    return { token: { type: "reference", text: sheetMatch[0], startOffset: pos, endOffset: pos + sheetMatch[0].length }, length: sheetMatch[0].length };
  }

  // Function name (identifier followed by `(`)
  const funcMatch = rest.match(FUNCTION_NAME_RE);
  if (funcMatch) {
    return { token: { type: "function", text: funcMatch[0], startOffset: pos, endOffset: pos + funcMatch[0].length }, length: funcMatch[0].length };
  }

  // Bare identifier (named range or incomplete function name)
  const idMatch = rest.match(IDENTIFIER_RE);
  if (idMatch) {
    const upper = idMatch[0].toUpperCase();
    const type = /^\$?[A-Z]{1,3}$/.test(upper) ? "reference" as const : "function" as const;
    return { token: { type, text: idMatch[0], startOffset: pos, endOffset: pos + idMatch[0].length }, length: idMatch[0].length };
  }

  // Number literal
  const numMatch = rest.match(NUMBER_RE);
  if (numMatch) {
    return { token: { type: "literal", text: numMatch[0], startOffset: pos, endOffset: pos + numMatch[0].length }, length: numMatch[0].length };
  }

  // Multi-character operators (must check before single-char)
  const op = matchOperator(rest);
  if (op) {
    return { token: { type: "operator", text: op, startOffset: pos, endOffset: pos + op.length }, length: op.length };
  }

  // Parentheses
  if (rest[0] === "(" || rest[0] === ")") {
    return { token: { type: "paren", text: rest[0], startOffset: pos, endOffset: pos + 1 }, length: 1 };
  }

  // Comma
  if (rest[0] === ",") {
    return { token: { type: "comma", text: ",", startOffset: pos, endOffset: pos + 1 }, length: 1 };
  }

  // Semicolon
  if (rest[0] === ";") {
    return { token: { type: "semicolon", text: ";", startOffset: pos, endOffset: pos + 1 }, length: 1 };
  }

  // Colon (standalone, not part of a range — shouldn't normally reach here)
  if (rest[0] === ":") {
    return { token: { type: "colon", text: ":", startOffset: pos, endOffset: pos + 1 }, length: 1 };
  }

  // Brackets
  if (rest[0] === "{" || rest[0] === "}") {
    return { token: { type: "bracket", text: rest[0], startOffset: pos, endOffset: pos + 1 }, length: 1 };
  }

  // Unrecognized character → error token
  return { token: { type: "error", text: rest[0], startOffset: pos, endOffset: pos + 1 }, length: 1 };
}

/**
 * Tokenize by repeatedly matching at the current position.
 * Uses a mutable cursor object to track position without `let`.
 */
function collectTokens(formula: string): FormulaTextToken[] {
  const cursor = { pos: 0 };
  const tokens: FormulaTextToken[] = [];

  while (cursor.pos < formula.length) {
    const result = matchToken(formula, cursor.pos);
    if (!result) {
      break;
    }
    tokens.push(result.token);
    cursor.pos += result.length;
  }

  return tokens;
}

/**
 * Tokenize formula text (without leading "=") into FormulaTextToken[].
 *
 * All offsets are 0-based, relative to the input string.
 * Returns an empty array for empty input.
 */
export function tokenizeFormula(formula: string): FormulaTextToken[] {
  return collectTokens(formula);
}
