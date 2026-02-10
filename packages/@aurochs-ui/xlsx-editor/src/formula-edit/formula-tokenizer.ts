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

function isOperator(ch: string): boolean {
  return "+-*/^&=<>".includes(ch);
}

/**
 * Tokenize formula text (without leading "=") into FormulaTextToken[].
 *
 * All offsets are 0-based, relative to the input string.
 * Returns an empty array for empty input.
 */
export function tokenizeFormula(formula: string): FormulaTextToken[] {
  const tokens: FormulaTextToken[] = [];
  let pos = 0;

  while (pos < formula.length) {
    const rest = formula.slice(pos);

    // Whitespace
    const wsMatch = rest.match(WHITESPACE_RE);
    if (wsMatch) {
      tokens.push({ type: "whitespace", text: wsMatch[0], startOffset: pos, endOffset: pos + wsMatch[0].length });
      pos += wsMatch[0].length;
      continue;
    }

    // Error literal (#REF!, #NAME?, etc.)
    const errMatch = rest.match(ERROR_RE);
    if (errMatch) {
      tokens.push({ type: "error", text: errMatch[0], startOffset: pos, endOffset: pos + errMatch[0].length });
      pos += errMatch[0].length;
      continue;
    }

    // String literal
    if (rest[0] === '"') {
      let end = 1;
      while (end < rest.length) {
        if (rest[end] === '"') {
          if (end + 1 < rest.length && rest[end + 1] === '"') {
            end += 2; // escaped quote
          } else {
            end += 1; // closing quote
            break;
          }
        } else {
          end += 1;
        }
      }
      tokens.push({ type: "string", text: rest.slice(0, end), startOffset: pos, endOffset: pos + end });
      pos += end;
      continue;
    }

    // Cell reference (check before identifier to avoid misclassification)
    const refMatch = rest.match(CELL_REF_RE);
    if (refMatch) {
      tokens.push({ type: "reference", text: refMatch[0], startOffset: pos, endOffset: pos + refMatch[0].length });
      pos += refMatch[0].length;
      continue;
    }

    // Sheet-qualified prefix without a complete reference (e.g., `Sheet1!` while still typing)
    const sheetMatch = rest.match(SHEET_PREFIX_RE);
    if (sheetMatch) {
      tokens.push({ type: "reference", text: sheetMatch[0], startOffset: pos, endOffset: pos + sheetMatch[0].length });
      pos += sheetMatch[0].length;
      continue;
    }

    // Function name (identifier followed by `(`)
    const funcMatch = rest.match(FUNCTION_NAME_RE);
    if (funcMatch) {
      tokens.push({ type: "function", text: funcMatch[0], startOffset: pos, endOffset: pos + funcMatch[0].length });
      pos += funcMatch[0].length;
      continue;
    }

    // Bare identifier (named range or incomplete function name)
    const idMatch = rest.match(IDENTIFIER_RE);
    if (idMatch) {
      // Distinguish: if it looks like a column-only reference (A-XFD), classify as reference
      const upper = idMatch[0].toUpperCase();
      if (/^\$?[A-Z]{1,3}$/.test(upper)) {
        tokens.push({ type: "reference", text: idMatch[0], startOffset: pos, endOffset: pos + idMatch[0].length });
      } else {
        tokens.push({ type: "function", text: idMatch[0], startOffset: pos, endOffset: pos + idMatch[0].length });
      }
      pos += idMatch[0].length;
      continue;
    }

    // Number literal
    const numMatch = rest.match(NUMBER_RE);
    if (numMatch) {
      tokens.push({ type: "literal", text: numMatch[0], startOffset: pos, endOffset: pos + numMatch[0].length });
      pos += numMatch[0].length;
      continue;
    }

    // Multi-character operators (must check before single-char)
    let matchedOp = false;
    for (const op of OPERATORS) {
      if (rest.startsWith(op)) {
        tokens.push({ type: "operator", text: op, startOffset: pos, endOffset: pos + op.length });
        pos += op.length;
        matchedOp = true;
        break;
      }
    }
    if (matchedOp) {
      continue;
    }

    // Parentheses
    if (rest[0] === "(" || rest[0] === ")") {
      tokens.push({ type: "paren", text: rest[0], startOffset: pos, endOffset: pos + 1 });
      pos += 1;
      continue;
    }

    // Comma
    if (rest[0] === ",") {
      tokens.push({ type: "comma", text: ",", startOffset: pos, endOffset: pos + 1 });
      pos += 1;
      continue;
    }

    // Semicolon
    if (rest[0] === ";") {
      tokens.push({ type: "semicolon", text: ";", startOffset: pos, endOffset: pos + 1 });
      pos += 1;
      continue;
    }

    // Colon (standalone, not part of a range — shouldn't normally reach here)
    if (rest[0] === ":") {
      tokens.push({ type: "colon", text: ":", startOffset: pos, endOffset: pos + 1 });
      pos += 1;
      continue;
    }

    // Brackets
    if (rest[0] === "{" || rest[0] === "}") {
      tokens.push({ type: "bracket", text: rest[0], startOffset: pos, endOffset: pos + 1 });
      pos += 1;
      continue;
    }

    // Unrecognized character → error token
    tokens.push({ type: "error", text: rest[0], startOffset: pos, endOffset: pos + 1 });
    pos += 1;
  }

  return tokens;
}
