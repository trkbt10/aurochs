/**
 * @file Formula analysis for editing
 *
 * Analyzes a formula string being edited to produce:
 * - AST (if parseable)
 * - Token list with character offsets
 * - Reference list with color assignments
 * - Active function name and argument index at the caret position
 *
 * This is a derived-state computation intended for use in `useMemo`.
 */

import type { FormulaAstNode } from "@aurochs-office/xlsx/formula/ast";
import { parseFormula } from "@aurochs-office/xlsx/formula/parser";
import { tokenizeFormula } from "./formula-tokenizer";
import type { FormulaAnalysis, FormulaReferenceToken, FormulaTextToken } from "./types";

/**
 * Analyze formula text being edited.
 *
 * @param editingText Full editing text (including leading "=")
 * @param caretOffset Caret position in the full editing text (0-based)
 * @returns FormulaAnalysis with tokens, references, active function info
 */
export function analyzeFormula(editingText: string, caretOffset: number): FormulaAnalysis {
  if (!editingText.startsWith("=")) {
    return createEmptyAnalysis();
  }

  const formulaBody = editingText.slice(1);
  const rawTokens = tokenizeFormula(formulaBody);

  // Shift all token offsets by +1 to account for the leading "="
  const tokens: FormulaTextToken[] = rawTokens.map((t) => ({
    ...t,
    startOffset: t.startOffset + 1,
    endOffset: t.endOffset + 1,
  }));

  // Try to parse the formula AST (may fail for incomplete formulas)
  let ast: FormulaAstNode | undefined;
  let isValid = false;
  try {
    ast = parseFormula(formulaBody);
    isValid = true;
  } catch {
    ast = undefined;
  }

  // Extract references from tokens (works even without valid AST)
  const references = extractReferencesFromTokens(tokens);

  // Detect active function at caret position (works even without valid AST)
  const { activeFunctionName, activeFunctionArgIndex } = detectActiveFunction(tokens, caretOffset);

  return {
    ast,
    tokens,
    references,
    isValid,
    activeFunctionName,
    activeFunctionArgIndex,
  };
}

function createEmptyAnalysis(): FormulaAnalysis {
  return {
    ast: undefined,
    tokens: [],
    references: [],
    isValid: false,
    activeFunctionName: undefined,
    activeFunctionArgIndex: undefined,
  };
}

/**
 * Extract reference tokens from the token list and assign cyclic colors.
 *
 * Each unique reference text gets a color index in encounter order.
 */
function extractReferencesFromTokens(tokens: readonly FormulaTextToken[]): FormulaReferenceToken[] {
  const refs: FormulaReferenceToken[] = [];
  let colorIndex = 0;

  for (const token of tokens) {
    if (token.type !== "reference") {
      continue;
    }

    const parsed = parseReferenceText(token.text);
    if (!parsed) {
      continue;
    }

    refs.push({
      range: parsed.range,
      sheetName: parsed.sheetName,
      startOffset: token.startOffset,
      endOffset: token.endOffset,
      colorIndex: colorIndex % 8,
    });
    colorIndex += 1;
  }

  return refs;
}

/**
 * Parse a reference token text like "A1", "$A$1:$B$5", "Sheet1!A1" into
 * a CellRange and optional sheet name.
 *
 * Returns undefined for partial/invalid references.
 */
function parseReferenceText(
  text: string,
): { range: import("@aurochs-office/xlsx/domain/cell/address").CellRange; sheetName: string | undefined } | undefined {
  let sheetName: string | undefined;
  let refPart = text;

  // Strip sheet prefix
  const sheetMatch = text.match(/^(?:'((?:[^']|'')*)'!|([A-Za-z_]\w*)!)/);
  if (sheetMatch) {
    sheetName = sheetMatch[1]?.replace(/''/g, "'") ?? sheetMatch[2];
    refPart = text.slice(sheetMatch[0].length);
  }

  // Try range (A1:B2)
  const rangeMatch = refPart.match(/^(\$?[A-Za-z]{1,3})(\$?\d+):(\$?[A-Za-z]{1,3})(\$?\d+)$/);
  if (rangeMatch) {
    const start = parseSingleRef(rangeMatch[1], rangeMatch[2]);
    const end = parseSingleRef(rangeMatch[3], rangeMatch[4]);
    if (start && end) {
      return { range: { start, end, sheetName }, sheetName };
    }
  }

  // Try single cell (A1)
  const cellMatch = refPart.match(/^(\$?[A-Za-z]{1,3})(\$?\d+)$/);
  if (cellMatch) {
    const addr = parseSingleRef(cellMatch[1], cellMatch[2]);
    if (addr) {
      return { range: { start: addr, end: addr, sheetName }, sheetName };
    }
  }

  // Column range ($A:$B) or row range ($1:$2) — skip for now (less common in editing)
  return undefined;
}

function parseSingleRef(
  colStr: string,
  rowStr: string,
): import("@aurochs-office/xlsx/domain/cell/address").CellAddress | undefined {
  const colAbsolute = colStr.startsWith("$");
  const colLetters = colAbsolute ? colStr.slice(1) : colStr;
  const rowAbsolute = rowStr.startsWith("$");
  const rowDigits = rowAbsolute ? rowStr.slice(1) : rowStr;

  const col = columnLettersToIndex(colLetters.toUpperCase());
  const row = Number(rowDigits);

  if (col < 1 || col > 16384 || row < 1 || row > 1048576) {
    return undefined;
  }

  return {
    col: col as import("@aurochs-office/xlsx/domain/types").ColIndex,
    row: row as import("@aurochs-office/xlsx/domain/types").RowIndex,
    colAbsolute,
    rowAbsolute,
  };
}

function columnLettersToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * Detect which function the caret is inside.
 *
 * Scans backwards from the caret position to find the nearest unmatched `(`,
 * then checks if the token before it is a function name.
 * Counts commas between `(` and caret to determine the argument index.
 *
 * Works entirely on the token stream — does not require a valid AST.
 */
function detectActiveFunction(
  tokens: readonly FormulaTextToken[],
  caretOffset: number,
): { activeFunctionName: string | undefined; activeFunctionArgIndex: number | undefined } {
  // Build a list of significant tokens (skip whitespace) with their indices
  const significantTokens = tokens.filter((t) => t.type !== "whitespace");

  // Walk through tokens to find the caret's nesting context.
  // We maintain a stack of (functionName, argIndex) as we scan left-to-right.
  const stack: { name: string | undefined; argIndex: number }[] = [];

  for (const token of significantTokens) {
    // Only consider tokens that START before the caret
    if (token.startOffset >= caretOffset) {
      break;
    }

    if (token.type === "paren" && token.text === "(") {
      // Look at the token before this `(` — is it a function name?
      const prevIdx = significantTokens.indexOf(token) - 1;
      const prevToken = prevIdx >= 0 ? significantTokens[prevIdx] : undefined;
      const funcName = prevToken?.type === "function" ? prevToken.text.toUpperCase() : undefined;
      stack.push({ name: funcName, argIndex: 0 });
    } else if (token.type === "paren" && token.text === ")") {
      if (stack.length > 0) {
        stack.pop();
      }
    } else if (token.type === "comma") {
      const top = stack[stack.length - 1];
      if (top) {
        top.argIndex += 1;
      }
    }
  }

  const top = stack[stack.length - 1];
  if (!top || !top.name) {
    return { activeFunctionName: undefined, activeFunctionArgIndex: undefined };
  }

  return { activeFunctionName: top.name, activeFunctionArgIndex: top.argIndex };
}
