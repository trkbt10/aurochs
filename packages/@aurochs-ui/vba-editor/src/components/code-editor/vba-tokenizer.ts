/**
 * @file VBA Tokenizer Adapter
 *
 * Adapts the VBA syntax highlighter to the Tokenizer interface
 * expected by react-editor-ui's CodeEditor component.
 */

import type {
  Tokenizer,
  TokenStyleMap,
} from "react-editor-ui/editors/RichTextEditors";
import { tokenizeLine, getTokenColor, type TokenType } from "./code/syntax-highlight";

// =============================================================================
// Tokenizer Adapter
// =============================================================================

/**
 * VBA tokenizer instance implementing react-editor-ui's Tokenizer interface.
 *
 * Delegates to the existing `tokenizeLine` function which produces tokens
 * with `{ type, text, start, end }` — the same shape that CodeEditor expects.
 */
export const vbaTokenizer: Tokenizer = {
  tokenize: tokenizeLine,
};

// =============================================================================
// Token Style Map
// =============================================================================

/**
 * All VBA token types that produce visible color.
 */
const VBA_TOKEN_TYPES: readonly TokenType[] = [
  "keyword",
  "type",
  "builtin",
  "string",
  "comment",
  "number",
  "operator",
  "identifier",
  "punctuation",
];

/**
 * Token style map for VBA syntax highlighting.
 *
 * Maps each VBA token type to a CSS style object with the token's color.
 * Colors use CSS custom properties with fallbacks so they can be themed.
 */
export const vbaTokenStyles: TokenStyleMap = Object.fromEntries(
  VBA_TOKEN_TYPES.map((type) => [type, { color: getTokenColor(type) }]),
);
